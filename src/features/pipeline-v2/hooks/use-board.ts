"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getBoard,
  listPipelines,
  type BoardSortParam,
  type BoardStageDto,
  type PipelineListItemDto,
  type StatusFilter,
} from "../api";

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
