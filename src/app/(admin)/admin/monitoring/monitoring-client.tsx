"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertTriangle as AlertTriangle,
  IconRefresh as RefreshCw,
  IconDownload as Download,
  IconClipboard as Clipboard,
  IconCpu as Cpu,
  IconDatabase as Database,
  IconServer as Server,
  IconStack2 as Stack,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api";

import { MonitoringCharts, type SeriesResponse } from "./monitoring-charts";

/** Contrato do /api/admin/perf-report (backend). */
export type PerfRecommendation = {
  id: string;
  target: string;
  metric: string;
  observed: number;
  threshold: number;
  severity: "info" | "warning" | "critical";
  action: string;
  rationale: string;
};

export type EnvStats = {
  api: {
    rps: number;
    p95Latency: number;
    errorRate: number;
    top5xxRoutes: Array<{ route: string; rate: number }>;
  };
  ai: { tokensPerMin: number; byModel: Array<{ provider: string; model: string; tokensPerMin: number }> };
  meta: { callsPerMin: number; errorRate: number };
  queues: { byQueue: Array<{ name: string; waiting: number; active: number; failed: number }> };
  db: {
    connectionsActive: number;
    cacheHitRatio: number;
    sizeBytes: number;
    slowQueries: Array<{ query: string; calls: number; meanExecMs: number; totalExecMs: number }>;
  };
};

export type ContainerStat = {
  name: string;
  cpuPct: number;
  cpuPctPeak: number;
  memBytes: number;
  memBytesPeak: number;
  netRxBytesPerSec: number;
  netTxBytesPerSec: number;
  ioReadBytesPerSec: number;
  ioWriteBytesPerSec: number;
};

export type PerfReport = {
  schemaVersion: number;
  generatedAt: string;
  window: { from: string; to: string; stepSec: number };
  prometheusConfigured: boolean;
  envs: Record<string, EnvStats>;
  containers: ContainerStat[];
  host: {
    diskFreePctByMount: Array<{ mount: string; freePct: number }>;
    load1: number;
    load5: number;
    load15: number;
    ioReadsPerSec: number;
    ioWritesPerSec: number;
  };
  recommendations: PerfRecommendation[];
};

const WINDOW_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: "15m", minutes: 15 },
  { label: "1h", minutes: 60 },
  { label: "6h", minutes: 360 },
  { label: "24h", minutes: 1440 },
];

export function MonitoringClient({ initial }: { initial: PerfReport | null }) {
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [envFilter, setEnvFilter] = useState<"all" | string>("all");
  const [report, setReport] = useState<PerfReport | null>(initial);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([
        fetch(apiUrl(`/api/admin/perf-report?windowMinutes=${windowMinutes}`), {
          cache: "no-store",
          credentials: "include",
        }).then((res) => (res.ok ? (res.json() as Promise<PerfReport>) : Promise.reject(new Error(String(res.status))))),
        fetch(apiUrl(`/api/admin/perf-series?windowMinutes=${windowMinutes}`), {
          cache: "no-store",
          credentials: "include",
        }).then((res) => (res.ok ? (res.json() as Promise<SeriesResponse>) : Promise.reject(new Error(String(res.status))))),
      ]);
      setReport(r);
      setSeries(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [windowMinutes]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const envKeys = useMemo(() => Object.keys(report?.envs ?? {}), [report]);
  const envsToShow = envFilter === "all" ? envKeys : envKeys.filter((e) => e === envFilter);

  const copyForAi = useCallback(async () => {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }, [report]);

  const downloadJson = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perf-report-${new Date(report.generatedAt).toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-border bg-background">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => setWindowMinutes(opt.minutes)}
              className={`px-3 py-1.5 text-sm transition ${
                windowMinutes === opt.minutes ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-full border border-border bg-background">
          <button
            onClick={() => setEnvFilter("all")}
            className={`px-3 py-1.5 text-sm transition ${envFilter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            all
          </button>
          {envKeys.map((e) => (
            <button
              key={e}
              onClick={() => setEnvFilter(e)}
              className={`px-3 py-1.5 text-sm transition ${envFilter === e ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {e}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="size-3.5"
          />
          Auto (30s)
        </label>

        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={copyForAi}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
            title="Copiar JSON completo para colar em prompt de IA"
          >
            <Clipboard className="size-4" />
            Copiar p/ IA
          </button>
          <button
            onClick={downloadJson}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
          >
            <Download className="size-4" />
            Baixar JSON
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!report ? (
        <div className="rounded-xl border border-border bg-background p-10 text-center text-sm text-muted-foreground">
          Sem dados. Verifique se voce e super-admin e se `PROMETHEUS_URL` esta configurado no backend.
        </div>
      ) : (
        <>
          {!report.prometheusConfigured ? (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
              Prometheus nao configurado no backend (`PROMETHEUS_URL`). Metricas de container/host indisponiveis;
              slow queries funcionam via pg direto.
            </div>
          ) : null}

          {/* Recomendacoes */}
          <RecommendationsCard recs={report.recommendations} />

          {/* Host */}
          <HostCard host={report.host} />

          {/* Containers */}
          <ContainersCard containers={report.containers} />

          {/* Charts */}
          {series ? <MonitoringCharts data={series} /> : null}

          {/* Por env */}
          {envsToShow.map((env) => (
            <EnvCard key={env} env={env} stats={report.envs[env]!} />
          ))}
        </>
      )}
    </div>
  );
}

function RecommendationsCard({ recs }: { recs: PerfRecommendation[] }) {
  if (recs.length === 0) {
    return (
      <Section title="Recomendacoes" icon={<AlertTriangle className="size-4" />}>
        <div className="text-sm text-muted-foreground">
          Nenhuma recomendacao acima dos thresholds. Sistema saudavel na janela atual.
        </div>
      </Section>
    );
  }
  return (
    <Section title={`Recomendacoes (${recs.length})`} icon={<AlertTriangle className="size-4" />}>
      <ul className="divide-y divide-border">
        {recs.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={r.severity} />
              <span className="font-mono text-xs text-muted-foreground">{r.target}</span>
              <span className="text-sm font-medium">{r.action}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.rationale} <span className="opacity-70">· metric={r.metric} observed={fmtNum(r.observed)} threshold={fmtNum(r.threshold)}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function HostCard({ host }: { host: PerfReport["host"] }) {
  return (
    <Section title="Host" icon={<Server className="size-4" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="load 1m" value={host.load1.toFixed(2)} />
        <Metric label="load 5m" value={host.load5.toFixed(2)} />
        <Metric label="load 15m" value={host.load15.toFixed(2)} />
        <Metric label="IO r/w /s" value={`${host.ioReadsPerSec.toFixed(0)} / ${host.ioWritesPerSec.toFixed(0)}`} />
      </div>
      {host.diskFreePctByMount.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {host.diskFreePctByMount.map((d) => (
            <div key={d.mount} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
              <span className="font-mono">{d.mount}</span>
              <span className={d.freePct < 15 ? "font-semibold text-destructive" : "text-foreground"}>
                {d.freePct.toFixed(1)}% livre
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function ContainersCard({ containers }: { containers: ContainerStat[] }) {
  if (containers.length === 0) return null;
  return (
    <Section title={`Containers (${containers.length})`} icon={<Cpu className="size-4" />}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">Container</th>
              <th className="px-2 py-2 text-right">CPU %</th>
              <th className="px-2 py-2 text-right">CPU pico</th>
              <th className="px-2 py-2 text-right">Mem</th>
              <th className="px-2 py-2 text-right">Mem pico</th>
              <th className="px-2 py-2 text-right">Rede rx/tx</th>
              <th className="px-2 py-2 text-right">IO r/w</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {containers.map((c) => (
              <tr key={c.name} className="hover:bg-muted/30">
                <td className="px-2 py-1.5 font-mono text-xs">{c.name}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${c.cpuPct > 80 ? "font-semibold text-destructive" : ""}`}>
                  {c.cpuPct.toFixed(1)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c.cpuPctPeak.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtBytes(c.memBytes)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtBytes(c.memBytesPeak)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-xs">
                  {fmtBytes(c.netRxBytesPerSec)}/s · {fmtBytes(c.netTxBytesPerSec)}/s
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-xs">
                  {fmtBytes(c.ioReadBytesPerSec)}/s · {fmtBytes(c.ioWriteBytesPerSec)}/s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function EnvCard({ env, stats }: { env: string; stats: EnvStats }) {
  return (
    <Section title={`Env: ${env}`} icon={<Stack className="size-4" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="RPS" value={stats.api.rps.toFixed(2)} />
        <Metric
          label="p95"
          value={`${(stats.api.p95Latency * 1000).toFixed(0)}ms`}
          warn={stats.api.p95Latency > 1}
        />
        <Metric
          label="erro 5xx"
          value={`${(stats.api.errorRate * 100).toFixed(1)}%`}
          warn={stats.api.errorRate > 0.05}
        />
        <Metric label="AI tokens/min" value={stats.ai.tokensPerMin.toFixed(0)} />
        <Metric label="Meta /min" value={stats.meta.callsPerMin.toFixed(0)} />
        <Metric label="DB conns" value={stats.db.connectionsActive.toFixed(0)} />
        <Metric
          label="DB cache hit"
          value={`${(stats.db.cacheHitRatio * 100).toFixed(1)}%`}
          warn={stats.db.cacheHitRatio > 0 && stats.db.cacheHitRatio < 0.9}
        />
        <Metric label="DB size" value={fmtBytes(stats.db.sizeBytes)} />
      </div>

      {stats.queues.byQueue.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Database className="mr-1 inline size-3" /> Filas BullMQ
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">Queue</th>
                <th className="px-2 py-1 text-right">Waiting</th>
                <th className="px-2 py-1 text-right">Active</th>
                <th className="px-2 py-1 text-right">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.queues.byQueue.map((q) => (
                <tr key={q.name}>
                  <td className="px-2 py-1 font-mono text-xs">{q.name}</td>
                  <td className={`px-2 py-1 text-right tabular-nums ${q.waiting > 1000 ? "text-warning" : ""}`}>{q.waiting}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{q.active}</td>
                  <td className={`px-2 py-1 text-right tabular-nums ${q.failed > 50 ? "text-destructive" : ""}`}>{q.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {stats.db.slowQueries.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Slow queries</div>
          <div className="space-y-2">
            {stats.db.slowQueries.slice(0, 5).map((sq, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/20 p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    mean {sq.meanExecMs.toFixed(0)}ms · calls {sq.calls}
                  </span>
                  <span className="text-muted-foreground">total {(sq.totalExecMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="mt-1 truncate font-mono text-xs">{sq.query}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${warn ? "text-warning" : ""}`}>{value}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: PerfRecommendation["severity"] }) {
  const map: Record<PerfRecommendation["severity"], "secondary" | "warning" | "destructive"> = {
    info: "secondary",
    warning: "warning",
    critical: "destructive",
  };
  return <Badge variant={map[severity]}>{severity}</Badge>;
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1024) return `${n.toFixed(0)}B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)}MB`;
  return `${(n / 1024 ** 3).toFixed(2)}GB`;
}

function fmtNum(n: number): string {
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(2);
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  return n.toFixed(2);
}
