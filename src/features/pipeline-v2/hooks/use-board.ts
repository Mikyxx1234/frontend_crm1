"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getBoard,
  listPipelines,
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

export function boardKey(pipelineId: string | null, status: StatusFilter) {
  return ["pipeline-board", pipelineId ?? "__none__", status] as const;
}

/** Board (stages + deals) do pipeline ativo. */
export function useBoard(params: {
  pipelineId: string | null;
  status?: StatusFilter;
  enabled?: boolean;
}) {
  const status = params.status ?? "OPEN";
  const preview = isPreviewMode();
  return useQuery<BoardStageDto[]>({
    queryKey: boardKey(params.pipelineId ?? "pl-1", status),
    queryFn: () => getBoard(params.pipelineId ?? "pl-1", status),
    enabled: preview ? true : ((params.enabled ?? true) && !!params.pipelineId),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
