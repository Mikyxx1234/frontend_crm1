/*
 * Endpoints REST de deals usados pelo /pipeline/kanban-v2.
 * Mantém URLs idênticas à tela legada do CRM.
 */

import { apiUrl } from "@/lib/api";

import type { BoardDealDto } from "./types";

/** POST /api/deals/:id/move — move o deal entre estágios. */
export async function moveDeal(
  dealId: string,
  payload: { stageId: string; position?: number },
): Promise<{ deal: BoardDealDto }> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/move`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao mover deal",
    );
  }
  return data as { deal: BoardDealDto };
}

/** GET /api/deals/:id — detail panel */
export async function getDeal(dealId: string): Promise<BoardDealDto & {
  notes?: string | null;
  source?: string | null;
  address?: string | null;
  website?: string | null;
}> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar deal",
    );
  }
  return data;
}
