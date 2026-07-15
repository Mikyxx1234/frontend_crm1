/*
 * Endpoint: GET /api/conversations/:id/timeline
 *
 * Diferente de /api/activity-feed (feed global restrito a MANAGER),
 * este endpoint retorna a timeline de UMA conversa e fica acessivel
 * a qualquer agente com acesso a conversa. Backend em
 * `backend_crm1/src/app/api/conversations/[id]/timeline/route.ts`.
 */

import { apiUrl } from "@/lib/api";
import type { FeedEvent } from "@/components/crm/feed";

export type ConversationTimelinePage = {
  items: FeedEvent[];
  nextCursor: string | null;
};

function buildQuery(cursor: string | null, limit?: number, types?: string[]): string {
  const sp = new URLSearchParams();
  if (cursor) sp.set("cursor", cursor);
  if (limit) sp.set("limit", String(limit));
  if (types?.length) sp.set("type", types.join(","));
  return sp.toString();
}

export async function fetchConversationTimeline(
  conversationId: string,
  cursor: string | null,
  opts?: { limit?: number; types?: string[] },
): Promise<ConversationTimelinePage> {
  const qs = buildQuery(cursor, opts?.limit, opts?.types);
  const url = apiUrl(
    `/api/conversations/${conversationId}/timeline${qs ? `?${qs}` : ""}`,
  );
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Falha ao carregar timeline da conversa (${res.status})`);
  }
  return (await res.json()) as ConversationTimelinePage;
}
