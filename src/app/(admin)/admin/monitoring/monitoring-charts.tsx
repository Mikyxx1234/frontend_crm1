"use client";

import { useMemo } from "react";
import {
  IconChartLine as ChartLine,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/crm/glass-card";

export type SeriesResponse = {
  window: { from: string; to: string } | null;
  stepSec: number;
  series: Record<string, Array<{ label: string; points: Array<{ t: number; v: number }> }>>;
  error?: string;
};

const COLORS = [
  "#5b6ff5",
  "#3d52e8",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

type ChartSpec = {
  key: keyof SeriesResponse["series"] | string;
  title: string;
  format: (v: number) => string;
  /** Dica exibida no estado vazio (por que pode estar sem dados). */
  emptyHint?: string;
};

const CHARTS: ChartSpec[] = [
  { key: "container_cpu", title: "CPU % por container", format: (v) => `${v.toFixed(1)}%` },
  { key: "container_mem", title: "Memória por container", format: fmtBytes },
  {
    key: "api_rps",
    title: "RPS por env",
    format: (v) => v.toFixed(2),
    emptyHint: "Sem tráfego na janela ou métrica de HTTP ainda não instrumentada no backend.",
  },
  {
    key: "api_p95",
    title: "Latência p95 (s) por env",
    format: (v) => `${(v * 1000).toFixed(0)}ms`,
    emptyHint: "Depende da métrica de duração de requests (crm_http_request_duration).",
  },
  {
    key: "api_errors",
    title: "Erros 5xx/s por env",
    format: (v) => v.toFixed(2),
    emptyHint: "Sem erros 5xx (ótimo) ou métrica de HTTP ainda não instrumentada.",
  },
  {
    key: "queue_waiting",
    title: "BullMQ waiting por fila",
    format: (v) => v.toFixed(0),
    emptyHint: "Filas vazias ou Redis/METRICS_TOKEN indisponível no scrape.",
  },
];

export function MonitoringCharts({ data }: { data: SeriesResponse }) {
  if (data.error || !data.window) {
    return (
      <GlassCard variant="panel" className="p-5 text-[13px] text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <InfoCircle className="size-4" />
          Séries indisponíveis: {data.error ?? "PROMETHEUS_URL não configurado."}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {CHARTS.map((c) => (
        <ChartCard key={String(c.key)} spec={c} series={data.series[c.key] ?? []} />
      ))}
    </div>
  );
}

function ChartCard({
  spec,
  series,
}: {
  spec: ChartSpec;
  series: Array<{ label: string; points: Array<{ t: number; v: number }> }>;
}) {
  const rows = useMemo(() => alignSeries(series), [series]);
  const labels = series.map((s) => s.label);

  return (
    <GlassCard variant="panel" className="overflow-hidden">
      <div className="border-b border-[var(--glass-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
          <ChartLine className="size-4 text-[var(--brand-primary)]" />
          {spec.title}
        </div>
      </div>
      <div className="p-3">
        {rows.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-1.5 text-center">
            <ChartLine className="size-6 text-[var(--text-muted)] opacity-50" />
            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Sem dados na janela</span>
            {spec.emptyHint ? (
              <span className="max-w-[280px] text-[11px] text-[var(--text-muted)]">{spec.emptyHint}</span>
            ) : null}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--glass-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={spec.format} width={60} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(t) => new Date((t as number) * 1000).toLocaleString()}
                formatter={(v: number) => spec.format(v)}
                contentStyle={{
                  borderRadius: 10,
                  fontSize: 12,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-bg-modal)",
                  backdropFilter: "blur(12px)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {labels.map((label, idx) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}

/**
 * Alinha varias series por timestamp em um array de linhas
 * `[{ t, [label1]: v, [label2]: v, ... }]` consumivel pelo Recharts.
 */
function alignSeries(
  series: Array<{ label: string; points: Array<{ t: number; v: number }> }>,
): Array<Record<string, number>> {
  const byTs = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const p of s.points) {
      const row = byTs.get(p.t) ?? { t: p.t };
      row[s.label] = p.v;
      byTs.set(p.t, row);
    }
  }
  return Array.from(byTs.values()).sort((a, b) => a.t - b.t);
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1024) return `${n.toFixed(0)}B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)}MB`;
  return `${(n / 1024 ** 3).toFixed(2)}GB`;
}
