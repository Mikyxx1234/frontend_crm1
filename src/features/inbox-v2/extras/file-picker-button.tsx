"use client";

import { useRef } from "react";
import { toast } from "sonner";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useSendAttachment } from "@/features/inbox-v2/hooks";

/**
 * Botão "Anexar arquivo": abre o file picker do SO, faz upload via
 * /api/conversations/:id/attachments e invalida a lista de mensagens.
 *
 * Aceita 1 arquivo por vez (suficiente para o fluxo principal). Para
 * múltiplos, o usuário repete a ação — o backend WhatsApp não
 * aceita anexos múltiplos numa mesma mensagem nativamente.
 */
export function FilePickerButton({
  conversationId,
  children,
  className,
  accept,
}: {
  conversationId: string | null;
  children: React.ReactNode;
  className?: string;
  accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const sendAttachment = useSendAttachment(conversationId);

  function openPicker() {
    if (!conversationId) {
      toast.error("Selecione uma conversa antes de anexar");
      return;
    }
    ref.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // permite reanexar o mesmo arquivo depois
    sendAttachment.mutate(
      { file, fileName: file.name },
      {
        onSuccess: () => toast.success("Anexo enviado"),
        onError: (err) => toast.error(err.message || "Falha ao enviar anexo"),
      },
    );
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />
      <ButtonGlass
        type="button"
        variant="icon"
        size="icon"
        className={className}
        onClick={openPicker}
        disabled={sendAttachment.isPending || !conversationId}
      >
        {children}
      </ButtonGlass>
    </>
  );
}
