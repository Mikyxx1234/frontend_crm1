"use client";

import { apiUrl } from "@/lib/api";
/**
 * FunnelChart (Bento / Linear-Stripe)
 * ────────────────────────────────────
 * Dois blocos no DNA Studioia:
 *   1. Bar chart horizontal com cores da paleta Lumen (`primary`,
 *      `indigo`, `purple`, `pink`, `amber`, `emerald`).
 *   2. Visão em "mini-funnel" vertical estreitando ao longo das etapas,
 *      com labels claras, contagem e conversão entre etapas.
 * Sem bordas grossas, sem grid desnecessário, tooltip limpo.
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { bentoLabelClass } from "@/lib/dashboard-tokens";
import { cn, formatCurrency } from "@/lib/utils";

export type FunnelStage = {
  stageName: string;
  stagePosition: number;
  dealCount: number;
  totalValue: number;
  conversionFromPrevious: number | null;
};

function normalizeFunnel(json: unknown): FunnelStage[] {
  if (Array.isArray(json)) return json as FunnelStage[];
  if (
    json &&
    typeof json === "object" &&
    "funnel" in json &&
    Array.isArray((json as { funnel: unknown }).funnel)
  ) {
    return (json as { funnel: FunnelStage[] }).funnel;
  }
  return [];
}

async function fetchFunnel(pipelineId: string): Promise<FunnelStage[]> {
  const params = new URLSearchParams({ pipelineId });
  const res = await fetch(apiUrl(`/api/analytics/funnel?${params}`));
  if (!res.ok) throw new Error("Falha ao carregar funil");
  const json: unknown = await res.json();
  return normalizeFunnel(json);
}

/**
 * Paleta alinhada ao SalesHub funnelStages (primary → indigo → purple → pink →
 * amber → emerald). A ordem reflete "entrada → fechamento" e transmite
 * intuitivamente o movimento de afunilamento.
 */
const STAGE_COLORS = [
  "#3370FF", // primary / indigo Lumen (topo)
  "#818cf8", // indigo
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fbbf24", // amber
  "#10b981", // emerald (fechamento)
];

function FunnelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FunnelStage }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const conv =
    row.conversionFromPrevious != null
      ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(row.conversionFromPrevious)}% da etapa anterior`
      : "Etapa inicial";
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
        {row.stageName}
      </p>
      <p className="mt-0.5 text-[14px] font-bold tracking-tight text-slate-900">
        {row.dealCount} negócio{row.dealCount === 1 ? "" : "s"}
      </p>
      <p className="text-[11px] font-semibold text-slate-500">
        {formatCurrency(row.totalValue)}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-muted)]">
        {conv}
      </p>
    </div>
  );
}

export function FunnelChart({
  pipelineId,
  className,
}: {
  pipelineId: string;
  className?: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-funnel", pipelineId],
    queryFn: () => fetchFunnel(pipelineId),
    enabled: Boolean(pipelineId),
  });

  const rows = data ?? [];
  const chartData = [...rows].sort(
    (a, b) => a.stagePosition - b.stagePosition,
  );

  return (
    <div className={cn("bg-white p-6 md:p-8", className)}>
      {/* Header */}
      <div className="mb-6">
        <span className={bentoLabelClass}>Pipeline Health</span>
        <h3 className="mt-1 text-[18px] font-bold tracking-tight text-slate-900">
          Funil de Conversão
        </h3>
      </div>

      {!pipelineId ? (
        <p className="py-12 text-center text-[13px] font-medium text-slate-500">
          Selecione um pipeline para ver o funil.
        </p>
      ) : isLoading ? (
        <div className="h-[360px] w-full animate-pulse rounded-2xl bg-[var(--color-bg-subtle)]" />
      ) : isError ? (
        <p className="py-12 text-center text-[13px] font-medium text-slate-500">
          Não foi possível carregar o funil.
        </p>
      ) : chartData.length === 0 ? (
        <p className="py-12 text-center text-[13px] font-medium text-slate-500">
          Nenhuma etapa neste pipeline.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Bar chart horizontal — 3/5 colunas */}
          <div
            className="lg:col-span-3"
            style={{ height: Math.max(280, chartData.length * 56) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 16, left: -16, bottom: 8 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stageName"
                  width={118}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "transparent" }} content={<FunnelTooltip />} />
                <Bar dataKey="dealCount" radius={[0, 8, 8, 0]} barSize={32}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={STAGE_COLORS[i % STAGE_COLORS.length]}
                      fillOpacity={0.88}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini-funnel vertical — 2/5 colunas */}
          <div className="space-y-3 lg:col-span-2">
            <span className={bentoLabelClass}>Visão em funil</span>
            <div className="flex flex-col items-center gap-1.5">
              {chartData.map((stage, i) => {
                const max = chartData[0]?.dealCount || 1;
                const widthPct = Math.max(
                  14,
                  Math.round((stage.dealCount / max) * 100),
                );
                const bg = STAGE_COLORS[i % STAGE_COLORS.length];
                return (
                  <motion.div
                    key={stage.stageName}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.05,
                      type: "spring",
                      stiffness: 340,
                      damping: 28,
                    }}
                    className="w-full"
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11px] font-bold uppercase tracking-wide text-foreground">
                        {stage.stageName}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-slate-900">
                        {stage.dealCount}
                      </span>
                    </div>
                    <div className="h-7 w-full overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                      <div
                        className="flex h-full items-center justify-end rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: bg,
                        }}
                      >
                        {stage.conversionFromPrevious != null &&
                          `${new Intl.NumberFormat("pt-BR", {
                            maximumFractionDigits: 0,
                          }).format(stage.conversionFromPrevious)}%`}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-ink-muted)]">
                      {formatCurrency(stage.totalValue)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
