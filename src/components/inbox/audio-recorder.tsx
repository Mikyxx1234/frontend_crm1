"use client";

import * as React from "react";
import { Mic, MicOff, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AudioRecorderProps = { onSend: (blob: Blob) => void; disabled?: boolean; className?: string };

export function AudioRecorder({ onSend, disabled, className }: AudioRecorderProps) {
  const [state, setState] = React.useState<"idle" | "recording" | "preview">("idle");
  const [duration, setDuration] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const cleanup = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    mediaRecorder.current = null;
    chunks.current = [];
  }, [audioUrl]);

  React.useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob)); setState("preview");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.start(250); setDuration(0); setState("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch { toast.error("Não foi possível acessar o microfone."); }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") mediaRecorder.current.stop();
  };
  const discard = () => { cleanup(); setAudioBlob(null); setAudioUrl(null); setDuration(0); setState("idle"); };
  const send = () => { if (audioBlob) { onSend(audioBlob); discard(); } };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <TooltipHost label="Gravar mensagem de voz" side="top">
        <button type="button" onClick={startRecording} disabled={disabled}
          className={cn("flex size-[52px] items-center justify-center rounded-full eduit-accent-gradient text-white shadow-[0_4px_12px_rgba(0,212,170,0.3)] eduit-transition hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,212,170,0.4)] disabled:opacity-50", className)}
          aria-label="Gravar áudio">
          <Mic className="size-5" />
        </button>
      </TooltipHost>
    );
  }

  if (state === "recording") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 rounded-full bg-[#ef4444]/10 px-3 py-1.5">
          <span className="size-2.5 rounded-full bg-[#ef4444]" style={{ animation: "pulse-dot 2s infinite" }} />
          <span className="text-[14px] font-medium text-[#ef4444]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatTime(duration)}</span>
        </div>
        <TooltipHost label="Cancelar gravação" side="top">
          <button type="button" onClick={discard} aria-label="Cancelar gravação"
            className="flex size-10 items-center justify-center rounded-[14px] text-[#64748b] eduit-transition hover:bg-[#f8fafc] hover:text-[#1e40af] hover:scale-105">
            <Trash2 className="size-[18px]" />
          </button>
        </TooltipHost>
        <TooltipHost label="Parar gravação" side="top">
          <button type="button" onClick={stopRecording} aria-label="Parar gravação"
            className="flex size-[52px] items-center justify-center rounded-full bg-[#ef4444] text-white eduit-transition hover:scale-105"
            style={{ animation: "pulse-record 1s infinite" }}>
            <MicOff className="size-5" />
          </button>
        </TooltipHost>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {audioUrl && <audio src={audioUrl} controls className="h-8 max-w-[180px]" />}
      <TooltipHost label="Descartar áudio" side="top">
        <button type="button" onClick={discard} aria-label="Descartar áudio"
          className="flex size-10 items-center justify-center rounded-[14px] text-[#ef4444] eduit-transition hover:bg-[#ef4444]/10 hover:scale-105">
          <Trash2 className="size-[18px]" />
        </button>
      </TooltipHost>
      <TooltipHost label="Enviar áudio" side="top">
        <button type="button" onClick={send} disabled={disabled} aria-label="Enviar áudio"
          className="flex size-[52px] items-center justify-center rounded-full eduit-accent-gradient text-white shadow-[0_4px_12px_rgba(0,212,170,0.3)] eduit-transition hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,212,170,0.4)] disabled:opacity-50">
          <Send className="size-5" />
        </button>
      </TooltipHost>
    </div>
  );
}
