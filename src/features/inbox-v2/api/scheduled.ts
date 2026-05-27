/*
 * Endpoints REST de mensagens agendadas.
 * Espelham as linhas 23-26 do contrato Fase 1.
 */

import { apiUrl } from "@/lib/api";

export interface ScheduledMessage {
  id: string;
  content: string;
  scheduledAt: string;
  createdBy?: { name?: string | null } | null;
  fallbackTemplateName?: string | null;
}

/** GET /api/scheduled-messages?conversationId=... */
export async function listScheduledMessages(
  conversationId: string,
): Promise<{ items: ScheduledMessage[] }> {
  const res = await fetch(
    apiUrl(`/api/scheduled-messages?conversationId=${encodeURIComponent(conversationId)}`),
  );
  if (!res.ok) return { items: [] };
  return res.json() as Promise<{ items: ScheduledMessage[] }>;
}

/** POST /api/uploads/automation-media (multipart) — usado antes de agendar com anexo */
export async function uploadAutomationMedia(file: File): Promise<{
  url: string;
  fileName?: string;
  mimeType?: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(apiUrl("/api/uploads/automation-media"), {
    method: "POST",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    fileName?: string;
    mimeType?: string;
    message?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.message || "Falha ao enviar anexo");
  }
  return { url: data.url, fileName: data.fileName, mimeType: data.mimeType };
}

/** POST /api/scheduled-messages */
export async function createScheduledMessage(payload: {
  conversationId: string;
  content: string;
  scheduledAt: string; // ISO
  media?: { url: string; type?: string; name?: string };
  fallbackTemplate?: { name: string; language?: string };
}): Promise<ScheduledMessage> {
  const res = await fetch(apiUrl("/api/scheduled-messages"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao agendar",
    );
  }
  return data as ScheduledMessage;
}

/** DELETE /api/scheduled-messages/:id */
export async function cancelScheduledMessage(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/scheduled-messages/${id}`), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao cancelar");
}
