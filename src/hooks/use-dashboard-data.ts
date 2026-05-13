import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { DashboardMetrics } from "@/components/analytics/metric-cards";

// ── Types ──

export type CompareResponse = {
  current: DashboardMetrics;
  previous: DashboardMetrics;
};

export type RevenuePoint = { date: string; revenue: number; count: number };

export type FunnelStage = {
  stageName: string;
  stagePosition: number;
  dealCount: number;
  totalValue: number;
  conversionFromPrevious: number | null;
};

export type LossItem = { reason: string; count: number; totalValue: number };
export type LossesResponse = { items: LossItem[]; totalLost: number; totalValue: number };

export type LeadSourceRow = {
  source: string;
  contactCount: number;
  dealCount: number;
  revenue: number;
  conversionRate: number;
};

export type TeamRow = {
  userId: string;
  userName: string;
  dealsWon: number;
  dealsLost: number;
  revenue: number;
  activitiesCompleted: number;
  avgCycleTime: number;
};

// ── Fetchers ──

async function fetchCompare(from: string, to: string, compFrom: string, compTo: string): Promise<CompareResponse> {
  const params = new URLSearchParams({ from, to, compFrom, compTo });
  const res = await fetch(apiUrl(`/api/analytics/dashboard/compare?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar comparação");
  return res.json();
}

async function fetchMetrics(from: string, to: string): Promise<DashboardMetrics> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/dashboard?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar métricas");
  return res.json();
}

async function fetchRevenue(from: string, to: string, groupBy: string): Promise<RevenuePoint[]> {
  const params = new URLSearchParams({ from, to, groupBy });
  const res = await fetch(apiUrl(`/api/analytics/revenue?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar receita");
  const json = await res.json();
  return Array.isArray(json) ? json : json.data ?? [];
}

async function fetchFunnel(pipelineId: string): Promise<FunnelStage[]> {
  const params = new URLSearchParams({ pipelineId });
  const res = await fetch(apiUrl(`/api/analytics/funnel?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar funil");
  const json = await res.json();
  return Array.isArray(json) ? json : json.funnel ?? [];
}

async function fetchLosses(from: string, to: string): Promise<LossesResponse> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/losses?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar perdas");
  return res.json();
}

async function fetchSources(from: string, to: string): Promise<LeadSourceRow[]> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/sources?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar fontes");
  const json = await res.json();
  return Array.isArray(json) ? json : json.sources ?? [];
}

async function fetchTeam(from: string, to: string): Promise<TeamRow[]> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/team?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar equipe");
  const json = await res.json();
  return Array.isArray(json) ? json : json.team ?? [];
}

// ── Hooks ──

function autoGroupBy(from: string, to: string): "day" | "week" | "month" {
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  if (diff <= 14) return "day";
  if (diff <= 90) return "week";
  return "month";
}

export function useDashboardMetrics() {
  const { from, to, comparisonMode, compFrom, compTo } = useDashboardStore();
  const hasComparison = comparisonMode !== "off" && !!compFrom && !!compTo;

  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics", from, to],
    queryFn: () => fetchMetrics(from, to),
    staleTime: 30_000,
  });

  const compareQuery = useQuery({
    queryKey: ["dashboard-compare", from, to, compFrom, compTo],
    queryFn: () => fetchCompare(from, to, compFrom, compTo),
    enabled: hasComparison,
    staleTime: 30_000,
  });

  return {
    current: hasComparison ? compareQuery.data?.current : metricsQuery.data,
    previous: hasComparison ? compareQuery.data?.previous : undefined,
    isLoading: hasComparison ? compareQuery.isLoading : metricsQuery.isLoading,
    hasComparison,
  };
}

export function useRevenueData() {
  const { from, to } = useDashboardStore();
  const groupBy = autoGroupBy(from, to);
  return useQuery({
    queryKey: ["dashboard-revenue", from, to, groupBy],
    queryFn: () => fetchRevenue(from, to, groupBy),
    staleTime: 30_000,
  });
}

export function useFunnelData(pipelineId: string | null) {
  return useQuery({
    queryKey: ["dashboard-funnel", pipelineId],
    queryFn: () => fetchFunnel(pipelineId!),
    enabled: !!pipelineId,
    staleTime: 30_000,
  });
}

export function useLossesData() {
  const { from, to } = useDashboardStore();
  return useQuery({
    queryKey: ["dashboard-losses", from, to],
    queryFn: () => fetchLosses(from, to),
    staleTime: 30_000,
  });
}

export function useSourcesData() {
  const { from, to } = useDashboardStore();
  return useQuery({
    queryKey: ["dashboard-sources", from, to],
    queryFn: () => fetchSources(from, to),
    staleTime: 30_000,
  });
}

export function useTeamData() {
  const { from, to } = useDashboardStore();
  return useQuery({
    queryKey: ["dashboard-team", from, to],
    queryFn: () => fetchTeam(from, to),
    staleTime: 30_000,
  });
}

