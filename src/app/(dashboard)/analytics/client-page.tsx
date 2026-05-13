"use client";

import { apiUrl } from "@/lib/api";
/**
 * AnalyticsPage — Dashboard Premium (DNA Studioia)
 * ───────────────────────────────────────────────────
 * Refactor visual alinhado ao preview `Studioia/src/components/AnalyticsPreview.tsx`:
 *   · Header "Linear/Stripe" (título 24px bold tracking-tight + subtítulo slate-500
 *     + botão "Exportar Relatório" em pill).
 *   · Filtros em card Bento branco, presets como pills com leve shadow no ativo.
 *   · Tabs minimalistas com underline em `brand-blue`, sem fundo pesado.
 *   · Grid Bento para métricas e gráficos (espaço em branco generoso).
 *
 * A estrutura funcional (queries, presets, pipelineId) foi preservada.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar } from "lucide-react";

import { ForecastChart } from "@/components/analytics/forecast-chart";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import {
  MetricCards,
  type DashboardMetrics,
} from "@/components/analytics/metric-cards";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { SourcesChart } from "@/components/analytics/sources-chart";
import { TeamTable } from "@/components/analytics/team-table";
import { StageRankingWidget } from "@/components/dashboard/widgets/stage-ranking-widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  bentoCardLargeClass,
  bentoLabelClass,
  dashboardPageTitleClass,
} from "@/lib/dashboard-tokens";
import { cn } from "@/lib/utils";

type PeriodPreset = "7d" | "30d" | "90d" | "month" | "year" | "custom";

type PipelineOption = { id: string; name: string };

async function fetchDashboard(
  from: string,
  to: string
): Promise<DashboardMetrics> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/dashboard?${params}`));
  if (!res.ok) throw new Error("Falha ao carregar métricas");
  return res.json() as Promise<DashboardMetrics>;
}

async function fetchPipelines(): Promise<PipelineOption[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  if (!res.ok) throw new Error("Falha ao carregar pipelines");
  const json: unknown = await res.json();
  if (Array.isArray(json)) return json as PipelineOption[];
  if (
    json &&
    typeof json === "object" &&
    "pipelines" in json &&
    Array.isArray((json as { pipelines: unknown }).pipelines)
  ) {
    return (json as { pipelines: PipelineOption[] }).pipelines;
  }
  return [];
}

function resolvePeriod(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string
): { from: string; to: string } {
  const now = new Date();
  if (preset === "custom" && customFrom && customTo) {
    const from = startOfDay(new Date(`${customFrom}T12:00:00`));
    const to = endOfDay(new Date(`${customTo}T12:00:00`));
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const to = endOfDay(now);
  switch (preset) {
    case "7d":
      return {
        from: startOfDay(subDays(to, 6)).toISOString(),
        to: to.toISOString(),
      };
    case "30d":
      return {
        from: startOfDay(subDays(to, 29)).toISOString(),
        to: to.toISOString(),
      };
    case "90d":
      return {
        from: startOfDay(subDays(to, 89)).toISOString(),
        to: to.toISOString(),
      };
    case "month":
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      };
    case "year":
      return {
        from: startOfYear(now).toISOString(),
        to: endOfYear(now).toISOString(),
      };
    case "custom":
    default:
      return {
        from: startOfDay(subDays(to, 29)).toISOString(),
        to: to.toISOString(),
      };
  }
}

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "custom", label: "Personalizado" },
];

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [customFrom, setCustomFrom] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [pipelineId, setPipelineId] = useState("");

  const { from, to } = useMemo(
    () => resolvePeriod(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const { data: pipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: fetchPipelines,
  });

  useEffect(() => {
    if (pipelines?.length && !pipelineId) {
      setPipelineId(pipelines[0]!.id);
    }
  }, [pipelines, pipelineId]);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["analytics-dashboard", from, to],
    queryFn: () => fetchDashboard(from, to),
    enabled: Boolean(from && to),
  });

  const activePresetLabel =
    PRESETS.find((p) => p.id === preset)?.label ?? "Período";

  return (
    <div className="w-full space-y-8 font-outfit">
      {/* ─── Header 70px · Linear/Stripe ─── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className={bentoLabelClass}>Analytics</span>
          <h1 className={cn(dashboardPageTitleClass, "mt-1")}>
            Visão Geral de Performance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas consolidadas de vendas e engajamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">
            <Calendar className="size-3.5" />
            {activePresetLabel}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-50 hover:shadow-sm"
          >
            Exportar Relatório <ArrowUpRight className="size-4" />
          </button>
        </div>
      </motion.header>

      {/* ─── Filtros: period presets + pipeline picker (bento) ─── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 340, damping: 28 }}
        className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm md:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className={bentoLabelClass}>Período</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all",
                      active
                        ? "bg-brand-blue text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:max-w-xs lg:w-72">
            <span className={bentoLabelClass}>Pipeline</span>
            <div className="relative">
              <select
                id="pipeline-select"
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                disabled={!pipelines?.length}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                {!pipelines?.length ? (
                  <option value="">Carregando…</option>
                ) : (
                  pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
              <ArrowUpRight className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
            </div>
          </div>
        </div>

        {preset === "custom" && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <div className="flex-1 space-y-2 sm:max-w-[220px]">
              <span className={bentoLabelClass}>De</span>
              <input
                id="from-date"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div className="flex-1 space-y-2 sm:max-w-[220px]">
              <span className={bentoLabelClass}>Até</span>
              <input
                id="to-date"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        )}
      </motion.section>

      {/* ─── Tabs minimalistas (underline, sem fundo pesado) ─── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-full bg-slate-50 p-1">
          {[
            { v: "overview", label: "Visão geral" },
            { v: "revenue", label: "Receita" },
            { v: "funnel", label: "Funil" },
            { v: "stage-ranking", label: "Ranking" },
            { v: "team", label: "Equipe" },
            { v: "sources", label: "Fontes" },
            { v: "forecast", label: "Previsão" },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-full px-4 py-1.5 text-[12px] font-bold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <MetricCards data={dashboard} isLoading={dashboardLoading} />
          <div className={cn(bentoCardLargeClass, "p-0 overflow-hidden")}>
            <RevenueChart from={from} to={to} compact />
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <div className={cn(bentoCardLargeClass, "p-0 overflow-hidden")}>
            <RevenueChart from={from} to={to} />
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="mt-6">
          <div className={cn(bentoCardLargeClass, "p-0 overflow-hidden")}>
            <FunnelChart pipelineId={pipelineId} />
          </div>
        </TabsContent>

        <TabsContent value="stage-ranking" className="mt-6">
          <StageRankingWidget
            pipelineId={pipelineId || null}
            from={from}
            to={to}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTable from={from} to={to} />
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <SourcesChart from={from} to={to} />
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <ForecastChart pipelineId={pipelineId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
