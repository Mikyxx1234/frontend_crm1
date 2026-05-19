/**
 * Wrappers HTTP usados pelo painel de filtros do Kanban.
 *
 * Mantemos as URLs relativas pra reaproveitar o rewrite do Next.
 */

import { apiUrl } from "@/lib/api";

import type { AdvancedDealFilters, FilterOptionsResponse, SavedFilter } from "./types";

export async function fetchFilterOptions(): Promise<FilterOptionsResponse> {
  const res = await fetch(apiUrl("/api/kanban/filter-options"), { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao carregar opções.");
  return data as FilterOptionsResponse;
}

export async function fetchBoardWithFilters(
  pipelineId: string,
  status: string,
  filters: AdvancedDealFilters,
): Promise<unknown[]> {
  const res = await fetch(`/api/pipelines/${pipelineId}/board`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, filters }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao carregar quadro.");
  return Array.isArray(data) ? data : Array.isArray(data?.stages) ? data.stages : [];
}

export async function fetchSavedFilters(entityType = "kanban_deals"): Promise<SavedFilter[]> {
  const res = await fetch(apiUrl(`/api/saved-filters?entityType=${encodeURIComponent(entityType)}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao listar filtros.");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createSavedFilter(payload: {
  name: string;
  filterConfig: AdvancedDealFilters;
  isShared?: boolean;
  isDefault?: boolean;
  entityType?: string;
}): Promise<SavedFilter> {
  const res = await fetch(apiUrl("/api/saved-filters"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType: "kanban_deals", ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao salvar filtro.");
  return data as SavedFilter;
}

export async function updateSavedFilter(
  id: string,
  payload: {
    name?: string;
    filterConfig?: AdvancedDealFilters;
    isShared?: boolean;
    isDefault?: boolean;
  },
): Promise<SavedFilter> {
  const res = await fetch(apiUrl(`/api/saved-filters/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao atualizar filtro.");
  return data as SavedFilter;
}

export async function deleteSavedFilter(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/saved-filters/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Erro ao excluir filtro.");
  }
}

export async function duplicateSavedFilter(id: string): Promise<SavedFilter> {
  const res = await fetch(apiUrl(`/api/saved-filters/${id}/duplicate`), { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao duplicar.");
  return data as SavedFilter;
}
