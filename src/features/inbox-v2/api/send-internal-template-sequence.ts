/*
 * Envio sequencial de modelo interno com múltiplos anexos + mensagens
 * intercaladas (`messageBefore`). Compartilhado entre o picker de modelos
 * (menu "+"), o slash "/" e o park+Enter do composer — garante SEMPRE a
 * mesma ordem: content → anexo1 → messageBefore(anexo2) → anexo2 → ...
 *
 * Sequencial (await em loop) — NUNCA Promise.all — pra não estourar o rate
 * limit do canal quando o modelo tem vários arquivos. Falhas intermediárias
 * (messageBefore ou anexo) disparam toast e seguem para o próximo item —
 * não travam a sequência inteira nem falham 100% silenciosamente.
 */
import { toast } from "sonner";

import { apiUrl } from "@/lib/api";

import { sendAttachment, sendMessage } from "./messages";

export interface InternalTemplateSequenceAttachment {
  url: string;
  name: string | null;
  /** Texto enviado ANTES deste arquivo (só faz sentido para índice >= 1). */
  messageBefore?: string | null;
}

export async function sendInternalTemplateSequence({
  conversationId,
  content,
  attachments,
  channelId,
}: {
  conversationId: string;
  content?: string | null;
  attachments: InternalTemplateSequenceAttachment[];
  /** Override de canal de saída (org com >1 WhatsApp conectado). */
  channelId?: string | null;
}): Promise<void> {
  const trimmedContent = (content ?? "").trim();
  if (trimmedContent) {
    try {
      await sendMessage(conversationId, { content: trimmedContent, channelId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar mensagem do modelo");
    }
  }

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];

    // A partir do 2º anexo, `messageBefore` (se preenchido) sai como
    // mensagem de texto própria imediatamente antes do arquivo correspondente.
    if (i > 0 && att.messageBefore?.trim()) {
      try {
        await sendMessage(conversationId, {
          content: att.messageBefore.trim(),
          channelId,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Falha ao enviar mensagem antes do anexo",
        );
      }
    }

    try {
      const res = await fetch(apiUrl(att.url));
      if (!res.ok) throw new Error("Falha ao baixar o arquivo do modelo");
      const blob = await res.blob();
      await sendAttachment(conversationId, blob, {
        fileName: att.name ?? undefined,
        channelId,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Falha ao enviar anexo${att.name ? ` "${att.name}"` : ""}`,
      );
    }
  }
}
