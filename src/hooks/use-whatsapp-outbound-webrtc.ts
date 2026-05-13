"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";

import {
  startCallRecording,
  uploadCallRecording,
  type CallRecordingHandle,
} from "@/lib/call-recording";
import { getBrowserIceServers } from "@/lib/webrtc-ice";
import { sanitizeMetaWhatsappSdpForBrowser, stripSsrcLinesFromSdp } from "@/lib/whatsapp-webrtc-sdp";
import { useSSE } from "@/hooks/use-sse";

function waitIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 12_000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    pc.addEventListener(
      "icegatheringstatechange",
      () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timer);
          resolve();
        }
      },
      { once: false },
    );
  });
}

export type OutboundCallPhase = "idle" | "need_answer" | "live" | "error";

/**
 * Ligação de saída WhatsApp (Cloud API): cria SDP offer no browser, POST initiate,
 * aplica SDP answer recebido no webhook `calls` (via SSE).
 */
export function useWhatsappOutboundWebRtc(conversationId: string | null | undefined) {
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const expectedCallIdRef = React.useRef<string | null>(null);
  const recorderRef = React.useRef<CallRecordingHandle | null>(null);
  const recordingStartedForCallRef = React.useRef<string | null>(null);
  const conversationIdRef = React.useRef<string | null>(null);
  conversationIdRef.current = conversationId ?? null;

  const [phase, setPhase] = React.useState<OutboundCallPhase>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [activeCallId, setActiveCallId] = React.useState<string | null>(null);
  /** Áudio recebido do WhatsApp — usar num elemento audio com autoPlay e playsInline. */
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [isInitiating, setIsInitiating] = React.useState(false);
  const [mediaDebug, setMediaDebug] = React.useState<{ ice: string; conn: string } | null>(null);

  /**
   * Encerra a gravação em andamento (se houver) e dispara o upload
   * assincronamente. Não bloqueia o cleanup da chamada.
   */
  const finishRecording = React.useCallback(() => {
    const handle = recorderRef.current;
    const callId = recordingStartedForCallRef.current;
    const convId = conversationIdRef.current;
    recorderRef.current = null;
    recordingStartedForCallRef.current = null;
    if (!handle || !convId) {
      handle?.abort?.();
      return;
    }
    const startedAt = handle.startedAt;
    void handle
      .stop()
      .then((blob) => {
        if (!blob || blob.size === 0) {
          console.warn(
            `[outbound-webrtc] gravação finalizou vazia callId=${callId} — nada para upload.`,
          );
          return;
        }
        console.info(
          `[outbound-webrtc] upload de gravação callId=${callId} bytes=${blob.size}`,
        );
        void uploadCallRecording({
          conversationId: convId,
          callId,
          blob,
          ext: handle.ext,
          startedAt,
          endedAt: new Date(),
          direction: "BUSINESS_INITIATED",
        });
      })
      .catch((err) => {
        console.warn("[outbound-webrtc] finalizar gravação falhou:", err);
      });
  }, []);

  const releasePc = React.useCallback(() => {
    finishRecording();
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    streamRef.current = null;
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    expectedCallIdRef.current = null;
    setActiveCallId(null);
    setRemoteStream(null);
    setMediaDebug(null);
  }, [finishRecording]);

  const reset = React.useCallback(() => {
    releasePc();
    setPhase("idle");
    setErrorMsg(null);
  }, [releasePc]);

  const terminateSilently = React.useCallback(
    (callId: string) => {
      if (!conversationId || !callId) return;
      void fetch(apiUrl(`/api/conversations/${conversationId}/whatsapp-calls`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminate", call_id: callId }),
      });
    },
    [conversationId],
  );

  const applyAnswer = React.useCallback(
    async (callId: string, sdp: string) => {
      const pc = pcRef.current;
      const expected = expectedCallIdRef.current;
      if (!pc || !expected || callId !== expected) return;
      try {
        const candidates = [
          sanitizeMetaWhatsappSdpForBrowser(sdp),
          stripSsrcLinesFromSdp(sanitizeMetaWhatsappSdpForBrowser(sdp)),
        ];
        let lastErr: unknown;
        for (const sdpBody of candidates) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: sdpBody }));
            lastErr = undefined;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (lastErr) throw lastErr;
        setPhase("live");
      } catch (e) {
        const m = e instanceof Error ? e.message : "SDP answer inválido";
        setErrorMsg(m);
        setPhase("error");
        terminateSilently(expected);
        releasePc();
      }
    },
    [releasePc, terminateSilently],
  );

  const initiate = React.useCallback(async (): Promise<{ ok: boolean; callId?: string; error?: string }> => {
    if (!conversationId) {
      const m = "Sem conversa.";
      setErrorMsg(m);
      setPhase("error");
      return { ok: false, error: m };
    }
    releasePc();
    setErrorMsg(null);
    setPhase("idle");
    setIsInitiating(true);

    try {
      if (typeof RTCPeerConnection === "undefined") {
        throw new Error("WebRTC não suportado neste browser.");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microfone indisponível. Use HTTPS e conceda permissão ao microfone.");
      }

      const pc = new RTCPeerConnection({
        iceServers: getBrowserIceServers(),
      });
      pcRef.current = pc;

      const bumpDebug = () => {
        setMediaDebug({ ice: pc.iceConnectionState, conn: pc.connectionState });
      };
      pc.oniceconnectionstatechange = bumpDebug;
      pc.onconnectionstatechange = () => {
        bumpDebug();
        const s = pc.connectionState;
        if (s === "failed") {
          const cid = expectedCallIdRef.current;
          setErrorMsg((prev) => prev ?? "Falha na ligação de mídia (ICE/rede).");
          setPhase("error");
          if (cid) terminateSilently(cid);
          releasePc();
          return;
        }
        // Encerramento limpo pelo peer remoto (Meta/cliente desligou a chamada):
        // o PeerConnection vai para "closed"/"disconnected" sem passar por
        // "failed". Antes isso era ignorado — a gravação ficava órfã (o
        // MediaRecorder nunca era parado) e o upload nunca acontecia.
        if (s === "closed" || s === "disconnected") {
          releasePc();
          setPhase("idle");
        }
      };

      pc.ontrack = (ev) => {
        const [first] = ev.streams;
        if (first?.getTracks().length) {
          setRemoteStream(first);
        } else if (ev.track) {
          setRemoteStream(new MediaStream([ev.track]));
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      streamRef.current = stream;
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIceGatheringComplete(pc);

      const sdp = pc.localDescription?.sdp;
      if (!sdp?.trim()) throw new Error("SDP offer vazio após recolha ICE.");

      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/whatsapp-calls`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          session: { sdp_type: "offer", sdp },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; calls?: { id: string }[] };
      if (!res.ok) {
        throw new Error(typeof data.message === "string" ? data.message : `Erro ${res.status}`);
      }
      const callId = data.calls?.[0]?.id;
      if (!callId) throw new Error("Meta não devolveu o ID da chamada.");

      expectedCallIdRef.current = callId;
      setActiveCallId(callId);
      setPhase("need_answer");
      bumpDebug();

      return { ok: true, callId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      releasePc();
      setErrorMsg(msg);
      setPhase("error");
      return { ok: false, error: msg };
    } finally {
      setIsInitiating(false);
    }
  }, [conversationId, releasePc, terminateSilently]);

  // Inicia automaticamente a gravação assim que a mídia fica ativa.
  // Precisa do local stream (criado no initiate), do remote stream
  // (chega via ontrack) e de estar em "live". A Meta não grava chamadas
  // do lado dela (não envia recording_url), então o browser do agente
  // é a única fonte possível. Só roda para chamadas outbound iniciadas
  // pelo chip — é o único fluxo que passa por este hook.
  React.useEffect(() => {
    if (phase !== "live") return;
    if (recorderRef.current) return;
    const local = streamRef.current;
    if (!local || !remoteStream) return;
    const callId = expectedCallIdRef.current ?? activeCallId;
    if (recordingStartedForCallRef.current === callId) return;

    const handle = startCallRecording(local, remoteStream);
    if (!handle) {
      // Diagnóstico em console ajuda muito quando um agente reporta
      // "gravação não funcionou" — descobrimos se foi browser sem
      // MediaRecorder, sem tracks de áudio, etc.
      console.warn(
        "[outbound-webrtc] gravação NÃO iniciou — MediaRecorder indisponível ou streams sem áudio.",
      );
      return;
    }
    recorderRef.current = handle;
    recordingStartedForCallRef.current = callId;
    console.info(
      `[outbound-webrtc] gravação iniciada callId=${callId} mime=${handle.mime}`,
    );
  }, [phase, remoteStream, activeCallId]);

  // Encerramento remoto via webhook da Meta. Sem este listener, quando o
  // cliente desligava a chamada, o PeerConnection podia ficar em estado
  // intermediário e o MediaRecorder nunca parava → blob perdido.
  useSSE(
    apiUrl("/api/sse/messages"),
    React.useCallback(
      (event: string, data: unknown) => {
        if (event !== "whatsapp_call") return;
        const p = data as {
          conversationId?: string;
          callId?: string;
          event?: string;
        };
        if (!conversationId || p.conversationId !== conversationId) return;
        if ((p.event ?? "").toLowerCase() !== "terminate") return;
        const mine = expectedCallIdRef.current ?? activeCallId;
        if (!mine || p.callId !== mine) return;
        // Meta sinalizou fim da chamada — dispara finishRecording() via
        // releasePc() e volta a fase para idle.
        releasePc();
        setPhase("idle");
      },
      [conversationId, activeCallId, releasePc],
    ),
    !!conversationId,
  );

  const terminate = React.useCallback(
    async (callIdOverride?: string | null) => {
      const cid = callIdOverride ?? activeCallId ?? expectedCallIdRef.current;
      if (!conversationId || !cid) {
        reset();
        return;
      }
      try {
        await fetch(apiUrl(`/api/conversations/${conversationId}/whatsapp-calls`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "terminate", call_id: cid }),
        });
      } catch {
        /* ignore */
      } finally {
        reset();
      }
    },
    [conversationId, activeCallId, reset],
  );

  return {
    phase,
    errorMsg,
    activeCallId,
    remoteStream,
    isInitiating,
    mediaDebug,
    initiate,
    applyAnswer,
    terminate,
    reset,
  };
}
