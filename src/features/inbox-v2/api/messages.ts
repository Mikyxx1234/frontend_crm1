/*
 * Endpoints REST de mensagens da conversa ativa (chat).
 * Espelham as linhas 15-22, 28-31, 49-50 do contrato Fase 1.
 */

import { apiUrl } from "@/lib/api";

import type {
  InboxMessageDto,
  MessagesResponse,
  ReactionDto,
} from "./types";

/** GET /api/conversations/:id/messages */
export async function getMessages(
  conversationId: string,
): Promise<MessagesResponse> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/messages`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar mensagens",
    );
  }
  return {
    messages: Array.isArray(data.messages) ? data.messages : [],
    pinnedNoteId: data.pinnedNoteId ?? null,
    channelProvider: data.channelProvider ?? null,
    session: data.session ?? undefined,
  };
}

/** POST /api/conversations/:id/messages */
export async function sendMessage(
  conversationId: string,
  payload: {
    content: string;
    asNote?: boolean;
    replyToId?: string | null;
  },
): Promise<{ message: InboxMessageDto; metaError?: string }> {
  const body: Record<string, unknown> = payload.asNote
    ? { content: payload.content, messageType: "note", private: true }
    : { content: payload.content };
  if (payload.replyToId) body.replyToId = payload.replyToId;
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/messages`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao enviar mensagem",
    );
  }
  return data as { message: InboxMessageDto; metaError?: string };
}

/** POST /api/conversations/:id/attachments — multipart/form-data */
export async function sendAttachment(
  conversationId: string,
  file: File | Blob,
  options?: { caption?: string; fileName?: string },
): Promise<{ message: InboxMessageDto }> {
  const form = new FormData();
  form.append(
    "file",
    file,
    options?.fileName ?? (file instanceof File ? file.name : "anexo.bin"),
  );
  if (options?.caption) form.append("caption", options.caption);
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/attachments`), {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao enviar anexo",
    );
  }
  if (data.metaError) {
    throw new Error(
      `Salvo localmente, mas falhou via WhatsApp: ${data.metaError}`,
    );
  }
  return data as { message: InboxMessageDto };
}

/** POST /api/messages/:id/reactions */
export async function sendReaction(
  messageId: string,
  emoji: string,
): Promise<{ reactions?: ReactionDto[] }> {
  const res = await fetch(
    apiUrl(`/api/messages/${encodeURIComponent(messageId)}/reactions`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof (data as { message?: unknown })?.message === "string"
        ? (data as { message: string }).message
        : "Nao foi possivel reagir",
    );
  }
  return data as { reactions?: ReactionDto[] };
}

/** POST /api/conversations/:targetId/forward */
export async function forwardMessage(params: {
  targetConversationId: string;
  sourceConversationId: string;
  messageRef: string;
}): Promise<{ metaError?: string }> {
  const res = await fetch(
    apiUrl(`/api/conversations/${params.targetConversationId}/forward`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceConversationId: params.sourceConversationId,
        messageRef: params.messageRef,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao encaminhar",
    );
  }
  return data as { metaError?: string };
}

/** POST /api/conversations/:id/template */
export async function sendTemplate(
  conversationId: string,
  vars: {
    templateName: string;
    bodyPreview?: string;
    components?: unknown[];
    flowToken?: string | null;
    flowActionData?: Record<string, unknown> | null;
    templateGraphId?: string | null;
  },
): Promise<{ message: InboxMessageDto }> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/template`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateName: vars.templateName,
      ...(vars.bodyPreview != null ? { bodyPreview: vars.bodyPreview } : {}),
      ...(vars.components ? { components: vars.components } : {}),
      ...(vars.flowToken ? { flowToken: vars.flowToken } : {}),
      ...(vars.flowActionData && Object.keys(vars.flowActionData).length > 0
        ? { flowActionData: vars.flowActionData }
        : {}),
      ...(vars.templateGraphId ? { templateGraphId: vars.templateGraphId } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao enviar template",
    );
  }
  return data as { message: InboxMessageDto };
}

/** POST /api/media/transcribe */
export async function transcribeMessage(messageId: string): Promise<{
  transcript: string;
}> {
  const res = await fetch(apiUrl("/api/media/transcribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao transcrever audio",
    );
  }
  return data as { transcript: string };
}

/** POST /api/ai-agents/drafts/:messageId/approve */
export async function approveAiDraft(messageId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/ai-agents/drafts/${messageId}/approve`), {
    method: "POST",
  });
  if (!res.ok) throw new Error("Falha ao aprovar rascunho");
}

/** POST /api/ai-agents/drafts/:messageId/discard */
export async function discardAiDraft(messageId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/ai-agents/drafts/${messageId}/discard`), {
    method: "POST",
  });
  if (!res.ok) throw new Error("Falha ao descartar rascunho");
}
