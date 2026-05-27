"use client";

import { useEffect, useRef, useState } from "react";
import { IconMicrophone, IconPlayerStop, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useSendAttachment } from "@/features/inbox-v2/hooks";

/**
 * Gravação de áudio simples via MediaRecorder. Press para iniciar,
 * press de novo para parar e enviar; ✕ para descartar. Não tenta
 * reproduzir prévia (mantém a UX rápida e o componente enxuto).
 */
export function AudioRecorderButton({
  conversationId,
  className,
}: {
  conversationId: string | null;
  className?: string;
}) {
  const sendAttachment = useSendAttachment(conversationId);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    if (!conversationId) {
      toast.error("Selecione uma conversa antes de gravar");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Gravacao de audio nao suportada neste navegador");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (discarding) {
          setDiscarding(false);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        sendAttachment.mutate(
          { file: blob, fileName: `audio-${Date.now()}.webm` },
          {
            onSuccess: () => toast.success("Audio enviado"),
            onError: (err) => toast.error(err.message || "Falha ao enviar audio"),
          },
        );
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nao foi possivel acessar o microfone",
      );
    }
  }

  function stopAndSend() {
    if (!recorderRef.current) return;
    setRecording(false);
    recorderRef.current.stop();
    recorderRef.current = null;
  }

  function discard() {
    if (!recorderRef.current) return;
    setDiscarding(true);
    setRecording(false);
    try {
      recorderRef.current.stop();
    } catch {
      /* já parado */
    }
    recorderRef.current = null;
  }

  if (recording) {
    return (
      <div className="flex items-center gap-1.5">
        <ButtonGlass
          type="button"
          variant="icon"
          size="icon"
          className="h-9 w-9 text-[var(--color-danger)]"
          onClick={discard}
          title="Descartar gravacao"
        >
          <IconTrash size={18} />
        </ButtonGlass>
        <ButtonGlass
          type="button"
          variant="primary"
          size="icon"
          className="h-9 w-9"
          onClick={stopAndSend}
          title="Parar e enviar"
        >
          <IconPlayerStop size={18} />
        </ButtonGlass>
      </div>
    );
  }

  return (
    <ButtonGlass
      type="button"
      variant="icon"
      size="icon"
      className={className}
      onClick={start}
      disabled={sendAttachment.isPending || !conversationId}
      title="Gravar audio"
    >
      <IconMicrophone size={20} />
    </ButtonGlass>
  );
}
