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
  tags?: { id: string; name: string; color: string | null }[];
  expectedCloseAt?: string | null;
  customFields?: Record<string, unknown> | null;
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

/**
 * PUT /api/deals/:id — atualiza qualquer campo escalar do deal.
 *
 * Backend aceita campos parcialmente (PATCH-like): title, value,
 * ownerId, contactId, source, expectedCloseAt, customFields, etc.
 */
export interface UpdateDealPayload {
  title?: string;
  value?: number | null;
  ownerId?: string | null;
  contactId?: string | null;
  source?: string | null;
  expectedCloseAt?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
}

export async function updateDeal(
  dealId: string,
  payload: UpdateDealPayload,
): Promise<{ deal: BoardDealDto }> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao atualizar negocio",
    );
  }
  return data as { deal: BoardDealDto };
}

/** PUT /api/deals/:id/status — marcar WON / LOST / reabrir OPEN. */
export type DealStatus = "WON" | "LOST" | "OPEN";

export async function setDealStatus(
  dealId: string,
  payload: { status: DealStatus; lostReason?: string },
): Promise<{ deal: BoardDealDto }> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/status`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao atualizar status",
    );
  }
  return data as { deal: BoardDealDto };
}
