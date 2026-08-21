"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchDashboard,
  fetchDashboardMe,
  fetchServiceOverview,
  type DashboardData,
  type DashboardFiltersState,
  type DashboardMeData,
  type DashboardPeriod,
  type PipelineOption,
  type ServiceOverview,
} from "./api";

import { fetchFilterOptions } from "@/components/pipeline/kanban-filters/api";
import type { FilterOptionsResponse } from "@/components/pipeline/kanban-filters/types";
import { isPreviewMode } from "@/lib/preview-mode";
import { usePipelinesQuery } from "@/features/shared/queries/pipelines";

export function useServiceOverview(params: {
  period: DashboardPeriod;
  enabled?: boolean;
}) {
  return useQuery<ServiceOverview>({
    queryKey: ["dashboard-v2", "service", params.period],
    queryFn: () => fetchServiceOverview({ period: params.period }),
    enabled: isPreviewMode() ? true : (params.enabled ?? true),
    staleTime: 30_000,
  });
}

export function usePipelineOptions(enabled = true) {
  return usePipelinesQuery<PipelineOption>(enabled);
}

export function useDashboard(
  filters: DashboardFiltersState,
  enabled = true,
) {
  return useQuery<DashboardData>({
    queryKey: ["dashboard-v2", "commercial", filters],
    queryFn: () => fetchDashboard(filters),
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useDashboardMe(enabled = true) {
  return useQuery<DashboardMeData>({
    queryKey: ["dashboard-v2", "me"],
    queryFn: fetchDashboardMe,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardFilterOptions(enabled = true) {
  return useQuery<FilterOptionsResponse>({
    queryKey: ["dashboard-filter-options"],
    queryFn: fetchFilterOptions,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 5 * 60_000,
  });
}
