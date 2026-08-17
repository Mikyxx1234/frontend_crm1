"use client";

import { useQuery } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";

export type PipelineLossReason = { id: string; label: string };

export type PipelineLossReasonsDto = {
  reasons: PipelineLossReason[];
  lossReasonRequired?: boolean;
  lossReasonAllowOther?: boolean;
};

export function pipelineLossReasonsKey(pipelineId: string | null | undefined) {
  return ["pipeline-loss-reasons", pipelineId ?? "__none__"] as const;
}

async function fetchPipelineLossReasons(
  pipelineId: string,
): Promise<PipelineLossReasonsDto> {
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/loss-reasons`));
  if (!res.ok) {
    return { reasons: [], lossReasonRequired: false, lossReasonAllowOther: true };
  }
  const data = (await res.json()) as {
    reasons?: PipelineLossReason[];
    lossReasonRequired?: boolean;
    lossReasonAllowOther?: boolean;
  };
  return {
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
    lossReasonRequired: Boolean(data.lossReasonRequired),
    lossReasonAllowOther: data.lossReasonAllowOther !== false,
  };
}

/**
 * Metadados + motivos de perda do funil.
 * Query key única — evita fan-out de GET /loss-reasons no mount do kanban
 * (antes: lossMeta + actions-menu + dialog com shapes/keys diferentes).
 */
export function usePipelineLossReasons(
  pipelineId: string | null | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: pipelineLossReasonsKey(pipelineId),
    queryFn: () => fetchPipelineLossReasons(pipelineId as string),
    enabled: !!pipelineId && (opts?.enabled ?? true),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
