/*
 * Endpoints REST de tags de Deal — usados pelo TagsPopover do
 * DealDetailPanel (/pipeline/kanban-v2).
 *
 * URLs idênticas às consumidas pelo /pipeline legado.
 */

import { apiUrl } from "@/lib/api";

export interface DealTag {
  id: string;
  name: string;
  color: string | null;
}

/** GET /api/tags — lista todas as tags da org. */
export async function listTags(): Promise<DealTag[]> {
  const res = await fetch(apiUrl("/api/tags"));
  if (!res.ok) throw new Error("Erro ao carregar tags");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.tags ?? []);
}

/**
 * POST /api/deals/:id/tags — adiciona tag ao deal.
 *
 * Aceita `tagId` (existente) OU `tagName` (cria se não existir,
 * desde que o caller seja ADMIN/MANAGER). `color` é opcional.
 */
export async function addDealTag(
  dealId: string,
  payload: { tagId?: string; tagName?: string; color?: string },
): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/tags`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao adicionar tag",
    );
  }
  return { ok: true };
}

/** DELETE /api/deals/:id/tags — remove tag do deal. */
export async function removeDealTag(
  dealId: string,
  tagId: string,
): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/tags`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao remover tag",
    );
  }
  return { ok: true };
}
