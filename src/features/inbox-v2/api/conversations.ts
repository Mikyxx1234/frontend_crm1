/*
 * Endpoints REST de conversas usados pelo /inbox-v2.
 *
 * Cada funcao aqui espelha exatamente uma linha das tabelas 2.1-2.2
 * do contrato Fase 1 (`frontend/docs/inbox-api-contract.md`). NAO
 * mudar URL, metodo, query params ou body shape sem antes mudar o
 * backend correspondente.
 */

import { apiUrl } from "@/lib/api";

import type {
  ConversationListResponse,
  ConversationListRow,
  InboxFilters,
  InboxTab,
  TabCounts,
} from "./types";

export interface ListConversationsParams extends InboxFilters {
  tab: InboxTab;
  search?: string;
  perPage?: number;
  page?: number;
}

function buildConversationsUrl(p: ListConversationsParams): string {
  const q = new URLSearchParams({
    perPage: String(p.perPage ?? 60),
    tab: p.tab,
  });
  if (p.page && p.page > 1) q.set("page", String(p.page));
  if (p.ownerId) q.set("ownerId", p.ownerId);
  if (p.channel) q.set("channel", p.channel);
  if (p.stageId) q.set("stageId", p.stageId);
  if (p.tagIds?.length) q.set("tagIds", p.tagIds.join(","));
  if (p.sources?.length) q.set("sources", p.sources.join(","));
  if (p.sortBy) q.set("sortBy", p.sortBy);
  if (p.sortOrder) q.set("sortOrder", p.sortOrder);
  const s = p.search?.trim();
  if (s) q.set("search", s);
  return `/api/conversations?${q.toString()}`;
}

/** GET /api/conversations?perPage&tab&ownerId&channel&stageId&tagIds&sortBy&sortOrder&search */
export async function listConversations(
  params: ListConversationsParams,
): Promise<ConversationListResponse> {
  const res = await fetch(apiUrl(buildConversationsUrl(params)));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar conversas",
    );
  }
  return data as ConversationListResponse;
}

/** GET /api/conversations?counts=1 */
export async function fetchTabCounts(): Promise<TabCounts> {
  const res = await fetch(apiUrl("/api/conversations?counts=1"));
  if (!res.ok) {
    return {
      todos: 0,
      entrada: 0,
      esperando: 0,
      respondidas: 0,
      automacao: 0,
      finalizados: 0,
      erro: 0,
    };
  }
  return res.json() as Promise<TabCounts>;
}

/** GET /api/conversations?perPage=80&sortBy=updatedAt&sortOrder=desc — picker do Forward */
export async function listConversationsForForwardPicker(): Promise<ConversationListResponse> {
  const res = await fetch(
    apiUrl("/api/conversations?perPage=80&sortBy=updatedAt&sortOrder=desc"),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar lista",
    );
  }
  return data as ConversationListResponse;
}

export type ConversationActionPayload =
  | { action: "resolve"; tabulationId?: string | null }
  | { action: "reopen" }
  | { action: "assign"; assignedToId: string | null };

export type TabulationNode = {
  id: string;
  parentId: string | null;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
  children: TabulationNode[];
};

export interface TabulationsResponse {
  departmentId: string;
  requireTabulationOnClose: boolean;
  tree: TabulationNode[];
}

/** GET /api/tabulations?departmentId=xxx — leitura para agentes */
export async function getTabulations(
  departmentId: string,
): Promise<TabulationsResponse> {
  const res = await fetch(
    apiUrl(`/api/tabulations?departmentId=${encodeURIComponent(departmentId)}`),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar tabulacoes",
    );
  }
  return data as TabulationsResponse;
}

/**
 * Retorno de POST /api/conversations/:id/actions.
 * - `resolve`: `conversation` traz o estado atualizado (status=RESOLVED).
 * - `reopen`: modelo de ticket — o backend cria uma NOVA conversa vinculada
 *   ao mesmo contato/canal e retorna o novo id em `conversation.id`; o id
 *   antigo vem em `previousConversationId` para logs/navegacao.
 * - `assign`: `conversation` traz o novo assignedTo.
 */
export interface ConversationActionResponse {
  conversation: ConversationListRow;
  /** Presente apenas em `reopen` (modelo de ticket). */
  previousConversationId?: string;
}

/** POST /api/conversations/:id/actions */
export async function postConversationAction(
  conversationId: string,
  payload: ConversationActionPayload,
): Promise<ConversationActionResponse> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/actions`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao executar acao",
    );
  }
  return data as ConversationActionResponse;
}

/** POST /api/conversations/:id/read */
export async function markConversationRead(conversationId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/read`), {
    method: "POST",
  });
  if (!res.ok) throw new Error("Falha ao marcar como lida");
}

/** POST /api/conversations/:id/typing — fire-and-forget */
export function postTyping(conversationId: string): void {
  void fetch(apiUrl(`/api/conversations/${conversationId}/typing`), {
    method: "POST",
  }).catch(() => {});
}

/** POST /api/conversations/:id/pin-note */
export async function pinConversationNote(
  conversationId: string,
  messageId: string | null,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/pin-note`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  if (!res.ok) throw new Error("Falha ao fixar nota");
}

export type BulkAction = "resolve" | "reopen" | "delete" | "assign";

export interface BulkActionResult {
  updated?: number;
  /** IDs pulados por regra do backend (ex.: dept exige tabulacao). */
  skipped?: string[];
}

/** POST /api/conversations/bulk */
export async function postBulkAction(
  ids: string[],
  action: BulkAction,
  extra?: Record<string, unknown>,
): Promise<BulkActionResult> {
  const res = await fetch(apiUrl("/api/conversations/bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Falha em acao em lote",
    );
  }
  return (data ?? {}) as BulkActionResult;
}

/** POST /api/conversations/create */
export async function createConversation(payload: {
  contactId?: string;
  phone?: string;
  channelId: string;
  message?: string;
}): Promise<{ conversation: { id: string } }> {
  const res = await fetch(apiUrl("/api/conversations/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao criar conversa",
    );
  }
  return data as { conversation: { id: string } };
}
