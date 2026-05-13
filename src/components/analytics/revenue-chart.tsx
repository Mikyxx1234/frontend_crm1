"use client";

import { apiUrl } from "@/lib/api";
/**
 * RevenueChart (Bento / Linear-Stripe)
 * ─────────────────────────────────────
 * Área da receita repaginada para o DNA Studioia: fundo branco, cartão
 * `rounded-[24px]/[32px]`, grid horizontal muito sutil (`#f1f5f9`), paleta
 * `brand-blue` com gradiente linear descendente para transparente. Tooltip
 * `rounded-2xl` com sombra suave e tipografia `slate-900`.
 */

import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { bentoLabelClass } from "@/lib/dashboard-tokens";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export type RevenuePoint = { date: string; revenue: number; count: number };

type GroupBy = "day" | "week" | "month";

const BRAND_BLUE = "#507df1";

function normalizeRevenueResponse(json: unknown): RevenuePoint[] {
  if (Array.isArray(json)) return json as RevenuePoint[];
  if (
    json &&
    typeof json === "object" &&
    "data" in json &&
    Array.isArray((json as { data: unknown }).data)
  ) {
    return (json as { data: RevenuePoint[] }).data;
  }
  return [];
}

async function fetchRevenue(
  from: string,
  to: string,
  groupBy: GroupBy
): Promise<RevenuePoint[]> {
  const params = new URLSearchParams({ from, to, groupBy });
  const res = await fetch(apiUrl(`/api/analytics/revenue?${params}`));
  if (!res.ok) throw new Error("Falha ao carregar receita");
  const json: unknown = await res.json();
  return normalizeRevenueResponse(json);
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: RevenuePoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const revenue = row?.revenue ?? Number(payload[0]?.value);
  const count = row?.count;
  const labelStr =
    typeof label === "string" && label
      ? formatDate(label)
      : label != null
        ? String(label)
        : "";
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {labelStr}
      </p>
      <p className="mt-0.5 text-[14px] font-bold tracking-tight text-slate-900">
        {formatCurrency(revenue)}
      </p>
      {count != null && (
        <p className="text-[11px] font-semibold text-slate-500">
          {count} negócio{count === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

export function RevenueChart({
  from,
  to,
  compact,
  className,
}: {
  from: string;
  to: string;
  compact?: boolean;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-revenue", from, to, groupBy],
    queryFn: () => fetchRevenue(from, to, groupBy),
    enabled: Boolean(from && to),
  });

  const chartData = useMemo(() => data ?? [], [data]);
  const height = compact ? 220 : 320;

  return (
    <div className={cn("bg-white p-6 md:p-8", className)}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className={bentoLabelClass}>Projeção de Receita</span>
          <h3 className="mt-1 text-[18px] font-bold tracking-tight text-slate-900">
            {compact ? "Receita no período" : "Performance do período"}
          </h3>
        </div>
        {!compact ? (
          <div className="flex items-center gap-1 rounded-full bg-slate-50 p-0.5">
            {(
              [
                { id: "day" as const, label: "Dia" },
                { id: "week" as const, label: "Semana" },
                { id: "month" as const, label: "Mês" },
              ] as const
            ).map((g) => {
              const active = groupBy === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupBy(g.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            aria-label="Mais opções"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <MoreVertical className="size-4" />
          </button>
        )}
      </div>

      {/* Chart body */}
      {isLoading ? (
        <div
          className="w-full animate-pulse rounded-2xl bg-slate-50"
          style={{ height }}
        />
      ) : isError ? (
        <p className="py-12 text-center text-[13px] font-medium text-slate-500">
          Não foi possível carregar o gráfico de receita.
        </p>
      ) : chartData.length === 0 ? (
        <p className="py-12 text-center text-[13px] font-medium text-slate-500">
          Sem receita fechada neste intervalo.
        </p>
      ) : (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`rvGrad-${gradId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={BRAND_BLUE} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={BRAND_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(String(v))}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={8}
                minTickGap={compact ? 24 : 32}
              />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat("pt-BR", {
                    maximumFractionDigits: 0,
                    notation: "compact",
                  }).format(Number(v))
                }
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={compact ? 44 : 56}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={BRAND_BLUE}
                strokeWidth={2.5}
                fill={`url(#rvGrad-${gradId})`}
                dot={false}
                activeDot={{ r: 5, fill: BRAND_BLUE, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
