"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getBoard,
  listPipelines,
  type BoardStageDto,
  type PipelineListItemDto,
  type StatusFilter,
} from "../api";

/** Lista de pipelines (dropdown do header). */
export function usePipelines(enabled = true) {
  return useQuery<PipelineListItemDto[]>({
    queryKey: ["pipelines-v2"],
    queryFn: listPipelines,
    enabled,
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
  return useQuery<BoardStageDto[]>({
    queryKey: boardKey(params.pipelineId, status),
    queryFn: () => getBoard(params.pipelineId as string, status),
    enabled: (params.enabled ?? true) && !!params.pipelineId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
