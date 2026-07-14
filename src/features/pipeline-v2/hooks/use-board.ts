"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getBoard,
  getBoardFiltered,
  listPipelines,
  type BoardSortParam,
  type BoardStageDto,
  type PipelineListItemDto,
  type StatusFilter,
} from "../api";

import type { AdvancedDealFilters } from "@/components/pipeline/kanban-filters/types";
import { isEmptyFilters, hasServerSideFilters } from "@/components/pipeline/kanban-filters/types";

import { isPreviewMode } from "@/lib/preview-mode";

/** Lista de pipelines (dropdown do header). */
export function usePipelines(enabled = true) {
  return useQuery<PipelineListItemDto[]>({
    queryKey: ["pipelines-v2"],
    queryFn: listPipelines,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Quando `sort` é passado, anexamos o discriminador `field:direction`
 * à query key pra que cada modo tenha cache próprio (Mais recentes
 * ↔ Mais antigos não invalidam um ao outro). Quando OMITIDO, voltamos
 * pra key antiga `["pipeline-board", pid, status]` — preserva 100%
 * a invalidação cruzada feita por mutações já existentes
 * (`use-deal-mutations.ts`, `bulk-actions-bar.tsx`, etc.) que usam
 * essa key exata pra refetch do board após mover/editar deals.
 */
export function boardKey(
  pipelineId: string | null,
  status: StatusFilter,
  sort?: BoardSortParam,
) {
  const base = ["pipeline-board", pipelineId ?? "__none__", status] as const;
  if (!sort) return base;
  return [...base, `${sort.field}:${sort.direction}`] as const;
}

/** Board (stages + deals) do pipeline ativo. */
export function useBoard(params: {
  pipelineId: string | null;
  status?: StatusFilter;
  sort?: BoardSortParam;
  enabled?: boolean;
}) {
  const status = params.status ?? "OPEN";
  const sort = params.sort;
  const preview = isPreviewMode();
  return useQuery<BoardStageDto[]>({
    queryKey: boardKey(params.pipelineId ?? "pl-1", status, sort),
    queryFn: () => getBoard(params.pipelineId ?? "pl-1", status, sort),
    enabled: preview ? true : ((params.enabled ?? true) && !!params.pipelineId),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

/**
 * Board com busca server-side via POST /api/pipelines/:id/board.
 *
 * Roda em paralelo com `useBoard` — ativado SOMENTE quando há termo de
 * busca (≥2 chars, já debounced pelo caller). Tem queryKey própria pra
 * NÃO invalidar o cache do board normal: ao limpar a busca, o paginado
 * volta sem flicker.
 *
 * `perStage` default 200 cobre o "matches por coluna" tipico de buscas
 * por nome/telefone/número. Se atingir o limite numa coluna, dá pra
 * sinalizar "refine a busca" (não implementado por enquanto).
 */
export function useBoardSearch(params: {
  pipelineId: string | null;
  status: StatusFilter;
  search: string;
  sort?: BoardSortParam;
  enabled?: boolean;
  perStage?: number;
}) {
  const term = params.search.trim();
  const sortKey = params.sort
    ? `${params.sort.field}:${params.sort.direction}`
    : "default";
  const perStage = params.perStage ?? 200;
  return useQuery<BoardStageDto[]>({
    queryKey: [
      "pipeline-board-search",
      params.pipelineId ?? "__none__",
      params.status,
      term,
      sortKey,
      perStage,
    ],
    queryFn: () =>
      getBoardFiltered(params.pipelineId ?? "pl-1", {
        status: params.status,
        filters: { search: term },
        sort: params.sort,
        perStage,
      }),
    enabled:
      (params.enabled ?? true) && !!params.pipelineId && term.length >= 2,
    staleTime: 10_000,
  });
}

/**
 * Board com filtros avançados server-side via POST /api/pipelines/:id/board.
 *
 * Ativado quando há qualquer critério em `filters` (origem, tags, datas,
 * responsável, etc.). O GET pagina 100 deals/coluna e não aplica esses
 * filtros — sem este hook, origem e demais critérios parecem "não funcionar".
 */
export function useBoardFiltered(params: {
  pipelineId: string | null;
  status: StatusFilter;
  filters: AdvancedDealFilters;
  sort?: BoardSortParam;
  enabled?: boolean;
  perStage?: number;
}) {
  const sortKey = params.sort
    ? `${params.sort.field}:${params.sort.direction}`
    : "default";
  const perStage = params.perStage ?? 200;
  const active = hasServerSideFilters(params.filters);
  return useQuery<BoardStageDto[]>({
    queryKey: [
      "pipeline-board-filtered",
      params.pipelineId ?? "__none__",
      params.status,
      params.filters,
      sortKey,
      perStage,
    ],
    queryFn: () =>
      getBoardFiltered(params.pipelineId ?? "pl-1", {
        status: params.status,
        filters: params.filters,
        sort: params.sort,
        perStage,
      }),
    enabled: (params.enabled ?? true) && !!params.pipelineId && active,
    staleTime: 10_000,
  });
}
