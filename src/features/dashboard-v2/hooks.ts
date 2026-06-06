"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchDashboard,
  fetchDealsOverview,
  fetchPipelines,
  fetchServiceOverview,
  type DashboardData,
  type DashboardFiltersState,
  type DashboardPeriod,
  type DealsOverview,
  type PipelineOption,
  type ServiceOverview,
} from "./api";

import { fetchFilterOptions } from "@/components/pipeline/kanban-filters/api";
import type { FilterOptionsResponse } from "@/components/pipeline/kanban-filters/types";
import { isPreviewMode } from "@/lib/preview-mode";

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
    enabled: isPreviewMode() ? true : (params.enabled ?? true),
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
    enabled: isPreviewMode() ? true : (params.enabled ?? true),
    staleTime: 30_000,
  });
}

export function usePipelineOptions(enabled = true) {
  return useQuery<PipelineOption[]>({
    queryKey: ["dashboard-v2", "pipelines"],
    queryFn: fetchPipelines,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Dashboard comercial filtrado (Fase 1). Mantém os dados anteriores
 * enquanto refaz a busca ao trocar de filtro (evita flicker / skeleton
 * a cada ajuste).
 */
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

/** Opções de filtros do dashboard — reutiliza /api/kanban/filter-options. */
export function useDashboardFilterOptions(enabled = true) {
  return useQuery<FilterOptionsResponse>({
    queryKey: ["dashboard-filter-options"],
    queryFn: fetchFilterOptions,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 5 * 60_000,
  });
}
