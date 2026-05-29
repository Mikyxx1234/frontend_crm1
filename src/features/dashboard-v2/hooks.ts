"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchDealsOverview,
  fetchPipelines,
  fetchServiceOverview,
  type DashboardPeriod,
  type DealsOverview,
  type PipelineOption,
  type ServiceOverview,
} from "./api";

export function useDealsOverview(params: {
  period: DashboardPeriod;
  pipelineId?: string;
  ownerId?: string;
  enabled?: boolean;
}) {
  return useQuery<DealsOverview>({
    queryKey: ["dashboard-v2", "deals", params.period, params.pipelineId, params.ownerId],
    queryFn: () =>
      fetchDealsOverview({
        period: params.period,
        pipelineId: params.pipelineId,
        ownerId: params.ownerId,
      }),
    enabled: params.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useServiceOverview(params: {
  period: DashboardPeriod;
  enabled?: boolean;
}) {
  return useQuery<ServiceOverview>({
    queryKey: ["dashboard-v2", "service", params.period],
    queryFn: () => fetchServiceOverview({ period: params.period }),
    enabled: params.enabled ?? true,
    staleTime: 30_000,
  });
}

export function usePipelineOptions(enabled = true) {
  return useQuery<PipelineOption[]>({
    queryKey: ["dashboard-v2", "pipelines"],
    queryFn: fetchPipelines,
    enabled,
    staleTime: 5 * 60_000,
  });
}
