"use client";

/*
 * Estado dos filtros do dashboard sincronizado com a URL query string
 * (legível e compartilhável). Recarregar a página mantém os filtros.
 *
 * Exemplo:
 *   /dashboard?period=last_30&tags=t1,t2&sources=google,meta&owners=u1
 *
 * Sem query string → padrão "Este mês" (this_month).
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { DashboardFiltersState, PeriodKey } from "./api";

const VALID_PERIODS: PeriodKey[] = [
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "this_month",
  "last_month",
  "custom",
];

function parseCsv(value: string | null): string[] {
  return value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

export function readDashboardFilters(
  sp: URLSearchParams,
): DashboardFiltersState {
  const periodRaw = sp.get("period");
  const period: PeriodKey =
    periodRaw && VALID_PERIODS.includes(periodRaw as PeriodKey)
      ? (periodRaw as PeriodKey)
      : "this_month";
  return {
    period,
    startDate: sp.get("startDate") ?? undefined,
    endDate: sp.get("endDate") ?? undefined,
    pipelineId: sp.get("pipelineId") ?? undefined,
    stageIds: parseCsv(sp.get("stages")),
    tagIds: parseCsv(sp.get("tags")),
    ownerIds: parseCsv(sp.get("owners")),
    sources: parseCsv(sp.get("sources")),
  };
}

function toSearchParams(f: DashboardFiltersState): string {
  const sp = new URLSearchParams();
  if (f.period && f.period !== "this_month") sp.set("period", f.period);
  if (f.period === "custom") {
    if (f.startDate) sp.set("startDate", f.startDate);
    if (f.endDate) sp.set("endDate", f.endDate);
  }
  if (f.pipelineId) sp.set("pipelineId", f.pipelineId);
  if (f.stageIds.length) sp.set("stages", f.stageIds.join(","));
  if (f.tagIds.length) sp.set("tags", f.tagIds.join(","));
  if (f.ownerIds.length) sp.set("owners", f.ownerIds.join(","));
  if (f.sources.length) sp.set("sources", f.sources.join(","));
  return sp.toString();
}

/** Conta filtros ativos para o badge "Limpar filtros". */
export function countActiveDashboardFilters(f: DashboardFiltersState): number {
  let n = 0;
  if (f.period !== "this_month") n++;
  if (f.pipelineId) n++;
  if (f.stageIds.length) n++;
  if (f.tagIds.length) n++;
  if (f.ownerIds.length) n++;
  if (f.sources.length) n++;
  return n;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFiltersState = {
  period: "this_month",
  stageIds: [],
  tagIds: [],
  ownerIds: [],
  sources: [],
};

export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => readDashboardFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: DashboardFiltersState) => {
      const qs = toSearchParams(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const patch = useCallback(
    (partial: Partial<DashboardFiltersState>) => {
      setFilters({ ...filters, ...partial });
    },
    [filters, setFilters],
  );

  const clear = useCallback(() => {
    setFilters(DEFAULT_DASHBOARD_FILTERS);
  }, [setFilters]);

  return { filters, setFilters, patch, clear };
}

/**
 * Converte os filtros de período num intervalo ISO {from,to} para o
 * tab de Atendimento (que ainda usa o endpoint legado por período).
 * Espelha a lógica do backend (computeRange).
 */
export function periodToRangeISO(f: DashboardFiltersState): {
  from: string;
  to: string;
} {
  if (f.period === "custom" && f.startDate && f.endDate) {
    const from = new Date(`${f.startDate}T00:00:00`);
    const to = new Date(`${f.endDate}T23:59:59.999`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }

  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);

  switch (f.period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "last_7":
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "last_30":
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const last = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: first.toISOString(), to: last.toISOString() };
    }
    case "this_month":
    default:
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}
