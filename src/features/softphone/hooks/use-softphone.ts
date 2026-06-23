"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SipCredentials } from "../api/types";
import { getMyCredentials } from "../api/extensions";

type SoftphoneStatus =
  | "disconnected"
  | "connecting"
  | "registered"
  | "call_ringing"
  | "call_active"
  | "call_held"
  | "error";

interface SoftphoneState {
  status: SoftphoneStatus;
  muted: boolean;
  held: boolean;
  error: string | null;
  remoteNumber: string | null;
  callDirection: "inbound" | "outbound" | null;
  durationMs: number;
}

// ─── Module-scoped singleton state (survives React remounts) ───────────
let moduleUA: unknown = null;
let moduleSession: unknown = null;
let moduleInSession: unknown = null;
let moduleAudio: HTMLAudioElement | null = null;
let moduleCredentials: SipCredentials | null = null;
let modulePendingApi4ComDial = false;

if (typeof window !== "undefined" && !moduleAudio) {
  moduleAudio = new Audio();
  moduleAudio.autoplay = true;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (moduleUA && typeof (moduleUA as { stop: () => void }).stop === "function") {
      (moduleUA as { stop: () => void }).stop();
    }
  });
}

export function useSoftphone() {
  const [state, setState] = useState<SoftphoneState>({
    status: moduleUA ? "registered" : "disconnected",
    muted: false,
    held: false,
    error: null,
    remoteNumber: null,
    callDirection: null,
    durationMs: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setState((s) => ({ ...s, durationMs: Date.now() - startTimeRef.current! }));
      }
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startTimeRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (moduleUA) {
      setState((s) => ({ ...s, status: "registered", error: null }));
      return;
    }

    setState((s) => ({ ...s, status: "connecting", error: null }));

    try {
      const creds = await getMyCredentials();
      moduleCredentials = creds;

      const JsSIP = await import("jssip");
      const socket = new JsSIP.WebSocketInterface(creds.wsServer);

      const config = {
        sockets: [socket],
        uri: creds.sipUri,
        authorization_user: creds.authUser,
        password: creds.authPassword,
        register: true,
        session_timers: false,
      };

      const ua = new JsSIP.UA(config);

      ua.on("registered", () => {
        setState((s) => ({ ...s, status: "registered", error: null }));
      });

      ua.on("registrationFailed", (e: { cause?: string }) => {
        setState((s) => ({
          ...s,
          status: "error",
          error: `Registro SIP falhou: ${e.cause ?? "unknown"}`,
        }));
      });

      ua.on("newRTCSession", (data: { session: unknown; originator: string }) => {
        const session = data.session as {
          direction: string;
          remote_identity?: { uri?: { user?: string } };
          connection?: RTCPeerConnection;
          answer: (opts?: object) => void;
          terminate: () => void;
          on: (event: string, cb: (...args: unknown[]) => void) => void;
          request?: { getHeader?: (name: string) => string | undefined };
        };

        // CRÍTICO: registrar o ontrack ANTES do answer/SDP processing.
        // O evento `peerconnection` do JsSIP dispara quando a
        // RTCPeerConnection é construída, antes de processar a oferta
        // SDP. Os tracks remotos (incl. early media / ringback) chegam
        // síncronamente durante o processInboundSDP — se registrarmos
        // ontrack só em `accepted`, perdemos os primeiros tracks e o
        // áudio remoto fica mudo enquanto o áudio local sobe normalmente
        // (sintoma clássico de "ele me ouve mas eu não escuto nada").
        session.on("peerconnection", (...args: unknown[]) => {
          const pc = (args[0] as { peerconnection?: RTCPeerConnection })
            ?.peerconnection;
          attachAudio(pc);
        });

        if (data.originator === "remote") {
          moduleInSession = session;

          const shouldAutoAnswer =
            modulePendingApi4ComDial ||
            session.request?.getHeader?.("X-Api4comintegratedcall") === "true";

          if (shouldAutoAnswer) {
            // Fluxo Api4com: a chamada chega como "inbound" do ponto de
            // vista SIP (Api4com liga PRIMEIRO pro nosso ramal pra
            // estabelecer mídia, depois conecta com o destino real).
            // Mas o usuário clicou em "Ligar" — pra UX, preservamos o
            // estado "outbound dialing" que o `dial()` já setou. Sem
            // sobrescrever direction/remoteNumber, o widget continua
            // mostrando "Chamando…" em vez de piscar "Atender/Recusar".
            modulePendingApi4ComDial = false;
            session.answer({ mediaConstraints: { audio: true, video: false } });

            session.on("accepted", () => {
              moduleSession = session;
              moduleInSession = null;
              setState((s) => ({ ...s, status: "call_active" }));
              startTimer();
              attachAudio(session.connection);
            });
          } else {
            // Inbound real: cliente ligou pro nosso ramal sem que
            // tivéssemos disparado um dial() antes. Mostra UI de
            // atender/recusar com o número do chamador.
            const remoteNumber = session.remote_identity?.uri?.user ?? "Desconhecido";
            setState((s) => ({
              ...s,
              status: "call_ringing",
              remoteNumber,
              callDirection: "inbound",
            }));

            session.on("accepted", () => {
              moduleSession = session;
              moduleInSession = null;
              setState((s) => ({ ...s, status: "call_active" }));
              startTimer();
              attachAudio(session.connection);
            });
          }
        } else {
          moduleSession = session;
          const remoteNumber = session.remote_identity?.uri?.user ?? "";
          setState((s) => ({
            ...s,
            status: "call_active",
            remoteNumber,
            callDirection: "outbound",
          }));
          startTimer();

          session.on("confirmed", () => {
            attachAudio(session.connection);
          });
        }

        session.on("ended", () => {
          cleanup();
        });

        session.on("failed", () => {
          cleanup();
        });
      });

      ua.start();
      moduleUA = ua;
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        error: e instanceof Error ? e.message : "Erro ao conectar",
      }));
    }
  }, [startTimer]);

  const cleanup = useCallback(() => {
    moduleSession = null;
    moduleInSession = null;
    stopTimer();
    setState((s) => ({
      ...s,
      status: moduleUA ? "registered" : "disconnected",
      muted: false,
      held: false,
      remoteNumber: null,
      callDirection: null,
      durationMs: 0,
    }));
  }, [stopTimer]);

  const disconnect = useCallback(() => {
    if (moduleUA && typeof (moduleUA as { stop: () => void }).stop === "function") {
      (moduleUA as { stop: () => void }).stop();
    }
    moduleUA = null;
    moduleCredentials = null;
    cleanup();
    setState((s) => ({ ...s, status: "disconnected" }));
  }, [cleanup]);

  const dial = useCallback(
    (number: string, ctx?: { dealId?: string; contactId?: string }) => {
      if (!moduleUA || !moduleCredentials) return;

      modulePendingApi4ComDial = true;

      // UX: anuncia o estado outbound IMEDIATAMENTE. Sem isso, a UI fica
      // em "registered" até o Api4com originar a chamada de volta pro
      // nosso ramal (1-3s), e depois pisca "Atender/Recusar" no meio
      // tempo entre `newRTCSession` e `session.on("accepted")`.
      setState((s) => ({
        ...s,
        status: "call_ringing",
        callDirection: "outbound",
        remoteNumber: number,
        durationMs: 0,
        error: null,
      }));

      import("../api/extensions").then(({ dialApi4Com }) => {
        dialApi4Com(number, ctx).catch((e) => {
          modulePendingApi4ComDial = false;
          // Reverte o estado "discando" e mostra erro pro usuário.
          setState((s) => ({
            ...s,
            status: moduleUA ? "registered" : "disconnected",
            callDirection: null,
            remoteNumber: null,
            error: e instanceof Error ? e.message : "Falha ao discar",
          }));
        });
      });
    },
    [],
  );

  const answer = useCallback(() => {
    if (moduleInSession) {
      (moduleInSession as { answer: (opts: object) => void }).answer({
        mediaConstraints: { audio: true, video: false },
      });
    }
  }, []);

  const hangup = useCallback(() => {
    const s = (moduleSession ?? moduleInSession) as { terminate: () => void } | null;
    if (s) s.terminate();
  }, []);

  const toggleMute = useCallback(() => {
    if (!moduleSession) return;
    const session = moduleSession as {
      isMuted: () => { audio: boolean };
      mute: () => void;
      unmute: () => void;
    };
    if (session.isMuted().audio) {
      session.unmute();
      setState((s) => ({ ...s, muted: false }));
    } else {
      session.mute();
      setState((s) => ({ ...s, muted: true }));
    }
  }, []);

  const toggleHold = useCallback(() => {
    if (!moduleSession) return;
    const session = moduleSession as {
      isOnHold: () => { local: boolean };
      hold: () => void;
      unhold: () => void;
    };
    if (session.isOnHold().local) {
      session.unhold();
      setState((s) => ({ ...s, held: false, status: "call_active" }));
    } else {
      session.hold();
      setState((s) => ({ ...s, held: true, status: "call_held" }));
    }
  }, []);

  const sendDtmf = useCallback((tone: string) => {
    if (!moduleSession) return;
    (moduleSession as { sendDTMF: (t: string) => void }).sendDTMF(tone);
  }, []);

  function attachAudio(connection: RTCPeerConnection | undefined) {
    if (!connection || !moduleAudio) return;
    connection.ontrack = (e) => {
      if (!moduleAudio) return;
      // Caminho normal: usa o MediaStream entregue pelo navegador junto
      // com o track. Cobre 99% dos casos (Chrome/Firefox/Safari).
      if (e.streams?.[0]) {
        moduleAudio.srcObject = e.streams[0];
      } else if (e.track) {
        // Fallback: alguns PBX/encoders entregam track avulso sem stream
        // associado. Montamos um MediaStream local com o track.
        const stream = new MediaStream([e.track]);
        moduleAudio.srcObject = stream;
      }
      // Garante que o elemento <audio> esteja tocando — autoplay policy
      // pode suspender mesmo com autoplay=true se a aba não teve
      // interação recente; o user clicou em "Ligar" há ms, então deve
      // ter "user gesture" válido.
      moduleAudio.play().catch((err) => {
        console.warn("[softphone] audio.play() bloqueado:", err);
      });
    };
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    dial,
    answer,
    hangup,
    toggleMute,
    toggleHold,
    sendDtmf,
    isConnected: state.status !== "disconnected" && state.status !== "error",
  };
}
