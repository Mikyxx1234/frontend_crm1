"use client";

import { useMemo } from "react";
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
};

const CHARTS: ChartSpec[] = [
  { key: "container_cpu", title: "CPU % por container", format: (v) => `${v.toFixed(1)}%` },
  { key: "container_mem", title: "Memoria por container", format: fmtBytes },
  { key: "api_rps", title: "RPS por env", format: (v) => v.toFixed(2) },
  { key: "api_p95", title: "Latencia p95 (s) por env", format: (v) => `${(v * 1000).toFixed(0)}ms` },
  { key: "api_errors", title: "Erros 5xx/s por env", format: (v) => v.toFixed(2) },
  { key: "queue_waiting", title: "BullMQ waiting por fila", format: (v) => v.toFixed(0) },
];

export function MonitoringCharts({ data }: { data: SeriesResponse }) {
  if (data.error || !data.window) {
    return (
      <section className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground shadow-sm">
        Series indisponiveis: {data.error ?? "PROMETHEUS_URL nao configurado."}
      </section>
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
    <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
      <div className="mb-2 text-sm font-semibold">{spec.title}</div>
      {rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">Sem dados</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              stroke="#94a3b8"
              fontSize={11}
            />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={spec.format} width={60} />
            <Tooltip
              labelFormatter={(t) => new Date((t as number) * 1000).toLocaleString()}
              formatter={(v: number) => spec.format(v)}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {labels.map((label, idx) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
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
