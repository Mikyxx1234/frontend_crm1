"use client";

/*
 * Estado dos filtros do dashboard sincronizado com a URL query string
 * (legível e compartilhável). Recarregar a página mantém os filtros.
 *
 * Exemplo:
 *   /dashboard?period=last_30&pipeline=12&stages=negociacao,proposta&tags=t1
 *
 * Sem query string → padrão "Este mês" (this_month).
 * `pipeline` na URL é o number da org; `stages` continuam slugs.
 * Estado interno e API usam CUID.
 */

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  findPipelineByUrlParam,
  pipelineUrlParam,
} from "@/features/pipeline-v2/hooks/use-pipeline-url-sync";

import { PIPELINE_ALL, type DashboardFiltersState, type PeriodKey } from "./api";

const VALID_PERIODS: PeriodKey[] = [
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "this_month",
  "last_month",
  "custom",
];

export type DashboardPipelineOption = {
  id: string;
  number?: number;
  slug?: string;
  name?: string;
  stages?: Array<{ id: string; slug?: string }>;
};

function parseCsv(value: string | null): string[] {
  return value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

/** Valores crus da URL (number, slug legado ou CUID legado). */
type UrlFilterKeys = {
  period: PeriodKey;
  startDate?: string;
  endDate?: string;
  pipelineKey?: string;
  stageKeys: string[];
  tagIds: string[];
  ownerIds: string[];
  sources: string[];
};

function readUrlKeys(sp: URLSearchParams): UrlFilterKeys {
  const periodRaw = sp.get("period");
  const period: PeriodKey =
    periodRaw && VALID_PERIODS.includes(periodRaw as PeriodKey)
      ? (periodRaw as PeriodKey)
      : "this_month";
  return {
    period,
    startDate: sp.get("startDate") ?? undefined,
    endDate: sp.get("endDate") ?? undefined,
    // Novo: `pipeline=<number>`; legado: slug/nome, ou `pipelineId=<cuid>`.
    pipelineKey: sp.get("pipeline") ?? sp.get("pipelineId") ?? undefined,
    stageKeys: parseCsv(sp.get("stages")),
    tagIds: parseCsv(sp.get("tags")),
    ownerIds: parseCsv(sp.get("owners")),
    sources: parseCsv(sp.get("sources")),
  };
}

function resolveToIds(
  keys: UrlFilterKeys,
  pipelines: DashboardPipelineOption[] | undefined,
): DashboardFiltersState {
  let pipelineId: string | undefined;
  let stageIds: string[] = [];

  if (keys.pipelineKey === "all" || keys.pipelineKey === PIPELINE_ALL) {
    pipelineId = PIPELINE_ALL;
  } else if (keys.pipelineKey && pipelines?.length) {
    const p = findPipelineByUrlParam(pipelines, keys.pipelineKey);
    pipelineId = p?.id;
    if (p && keys.stageKeys.length) {
      const stages = p.stages ?? [];
      stageIds = keys.stageKeys
        .map(
          (k) =>
            stages.find((s) => s.slug === k)?.id ??
            stages.find((s) => s.id === k)?.id,
        )
        .filter((id): id is string => !!id);
    }
  } else if (keys.pipelineKey && /^[a-z][a-z0-9]{20,}$/i.test(keys.pipelineKey)) {
    // Opções ainda não carregaram: CUID legado continua válido na API.
    pipelineId = keys.pipelineKey;
    stageIds = keys.stageKeys.filter((k) => /^[a-z][a-z0-9]{20,}$/i.test(k));
  }

  return {
    period: keys.period,
    startDate: keys.startDate,
    endDate: keys.endDate,
    pipelineId,
    stageIds,
    tagIds: keys.tagIds,
    ownerIds: keys.ownerIds,
    sources: keys.sources,
  };
}

function toSearchParams(
  f: DashboardFiltersState,
  pipelines: DashboardPipelineOption[] | undefined,
): string {
  const sp = new URLSearchParams();
  if (f.period && f.period !== "this_month") sp.set("period", f.period);
  if (f.period === "custom") {
    if (f.startDate) sp.set("startDate", f.startDate);
    if (f.endDate) sp.set("endDate", f.endDate);
  }
  if (f.pipelineId === PIPELINE_ALL) {
    sp.set("pipeline", "all");
  } else if (f.pipelineId) {
    const p = pipelines?.find((x) => x.id === f.pipelineId);
    const urlVal = pipelineUrlParam(p);
    if (urlVal) sp.set("pipeline", urlVal);
  }
  if (f.stageIds.length && f.pipelineId && f.pipelineId !== PIPELINE_ALL) {
    const p = pipelines?.find((x) => x.id === f.pipelineId);
    const stages = p?.stages ?? [];
    const slugs = f.stageIds
      .map((id) => stages.find((s) => s.id === id)?.slug)
      .filter((s): s is string => !!s);
    if (slugs.length) sp.set("stages", slugs.join(","));
  }
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

/** @deprecated use read via hook — mantido para testes/leituras sem resolve. */
export function readDashboardFilters(
  sp: URLSearchParams,
  pipelines?: DashboardPipelineOption[],
): DashboardFiltersState {
  return resolveToIds(readUrlKeys(sp), pipelines);
}

export function useDashboardFilters(
  pipelines?: DashboardPipelineOption[],
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () =>
      resolveToIds(
        readUrlKeys(new URLSearchParams(searchParams.toString())),
        pipelines,
      ),
    [searchParams, pipelines],
  );

  useEffect(() => {
    if (!pipelines?.length || !filters.pipelineId) return;
    if (filters.pipelineId === PIPELINE_ALL) {
      if (searchParams.get("pipeline") === "all" && !searchParams.has("pipelineId")) {
        return;
      }
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("pipeline", "all");
      sp.delete("pipelineId");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      return;
    }
    const p = pipelines.find((x) => x.id === filters.pipelineId);
    const want = pipelineUrlParam(p);
    if (!want) return;
    const current = searchParams.get("pipeline");
    const hasLegacyId = searchParams.has("pipelineId");
    if (current === want && !hasLegacyId) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("pipeline", want);
    sp.delete("pipelineId");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pipelines, filters.pipelineId, searchParams, pathname, router]);

  const setFilters = useCallback(
    (next: DashboardFiltersState) => {
      const qs = toSearchParams(next, pipelines);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, pipelines],
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
