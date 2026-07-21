"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertTriangle as AlertTriangle,
  IconRefresh as RefreshCw,
  IconDownload as Download,
  IconClipboardCheck as ClipboardCheck,
  IconClipboard as Clipboard,
  IconCpu as Cpu,
  IconDatabase as Database,
  IconServer as Server,
  IconDeviceSdCard as Memory,
  IconStack2 as Stack,
  IconActivity as Activity,
  IconCircleCheck as CircleCheck,
  IconBolt as Bolt,
  IconClockHour4 as Clock,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import {
  HubStat,
  HubStatGrid,
  HubCallout,
} from "@/features/legacy-v1/settings/message-models/hub-ui";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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

  const criticalCount = report?.recommendations.filter((r) => r.severity === "critical").length ?? 0;
  const warningCount = report?.recommendations.filter((r) => r.severity === "warning").length ?? 0;
  const worstDisk = useMemo(() => {
    const list = report?.host.diskFreePctByMount ?? [];
    if (list.length === 0) return null;
    return list.reduce((min, d) => (d.freePct < min.freePct ? d : min));
  }, [report]);
  const totalCpuPct = useMemo(
    () => (report?.containers ?? []).reduce((s, c) => s + c.cpuPct, 0),
    [report],
  );
  const totalMemBytes = useMemo(
    () => (report?.containers ?? []).reduce((s, c) => s + c.memBytes, 0),
    [report],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar glass */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SegmentedControl
          options={WINDOW_OPTIONS.map((o) => ({ value: String(o.minutes), label: o.label }))}
          value={String(windowMinutes)}
          onChange={(v) => setWindowMinutes(Number(v))}
        />

        {envKeys.length > 0 ? (
          <SegmentedControl
            options={[{ value: "all", label: "todos" }, ...envKeys.map((e) => ({ value: e, label: e }))]}
            value={envFilter}
            onChange={setEnvFilter}
          />
        ) : null}

        <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--brand-primary)]">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="size-3.5 accent-[var(--brand-primary)]"
          />
          Auto 30s
        </label>

        <ToolbarButton onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Atualizar
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-2">
          <ToolbarButton onClick={copyForAi} disabled={!report} title="Copiar JSON completo para colar em prompt de IA">
            {copied ? <ClipboardCheck className="size-4 text-[var(--color-success)]" /> : <Clipboard className="size-4" />}
            {copied ? "Copiado" : "Copiar p/ IA"}
          </ToolbarButton>
          <ToolbarButton onClick={downloadJson} disabled={!report}>
            <Download className="size-4" />
            Baixar JSON
          </ToolbarButton>
        </div>
      </div>

      {report ? (
        <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]">
          <Clock className="size-3.5" />
          Atualizado {new Date(report.generatedAt).toLocaleTimeString()} · janela de{" "}
          {windowMinutes >= 60 ? `${windowMinutes / 60}h` : `${windowMinutes}m`}
          {report.prometheusConfigured ? (
            <span className="inline-flex items-center gap-1 text-[var(--color-success-text)]">
              <span className="size-1.5 rounded-full bg-[var(--color-success)]" /> Prometheus conectado
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <HubCallout tone="danger" icon={<AlertTriangle className="size-[18px]" />}>
          Falha ao carregar: {error}
        </HubCallout>
      ) : null}

      {!report ? (
        <GlassCard variant="panel" className="p-10 text-center">
          <Activity className="mx-auto mb-3 size-8 text-[var(--text-muted)]" />
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Sem dados</p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Verifique se você é super-admin e se <code className="font-mono">PROMETHEUS_URL</code> está configurado no backend.
          </p>
        </GlassCard>
      ) : (
        <>
          {!report.prometheusConfigured ? (
            <HubCallout tone="warn" icon={<AlertTriangle className="size-[18px]" />}>
              Prometheus não configurado no backend (<code className="font-mono">PROMETHEUS_URL</code>). Métricas de
              container/host indisponíveis; slow queries funcionam via pg direto.
            </HubCallout>
          ) : null}

          {/* Visão geral */}
          <HubStatGrid>
            <HubStat
              tone={criticalCount > 0 ? "warn" : warningCount > 0 ? "warn" : "success"}
              icon={criticalCount + warningCount > 0 ? <AlertTriangle className="size-5" /> : <CircleCheck className="size-5" />}
              value={criticalCount + warningCount === 0 ? "OK" : `${criticalCount + warningCount}`}
              label={criticalCount + warningCount === 0 ? "Sistema saudável" : `Alertas (${criticalCount} críticos)`}
            />
            <HubStat
              tone="brand"
              icon={<Stack className="size-5" />}
              value={report.containers.length}
              label="Containers monitorados"
            />
            <HubStat
              tone={totalCpuPct > 300 ? "warn" : "brand"}
              icon={<Cpu className="size-5" />}
              value={`${totalCpuPct.toFixed(0)}%`}
              label="CPU (soma dos serviços)"
            />
            <HubStat
              tone="violet"
              icon={<Memory className="size-5" />}
              value={fmtBytes(totalMemBytes)}
              label="Memória (soma dos serviços)"
            />
            <HubStat
              tone={report.host.load1 > 4 ? "warn" : "violet"}
              icon={<Bolt className="size-5" />}
              value={report.host.load1.toFixed(2)}
              label="Load 1m (host)"
            />
            <HubStat
              tone={worstDisk && worstDisk.freePct < 15 ? "warn" : "success"}
              icon={<Server className="size-5" />}
              value={worstDisk ? `${worstDisk.freePct.toFixed(0)}%` : "—"}
              label={worstDisk ? `Disco livre (${worstDisk.mount})` : "Disco livre"}
            />
          </HubStatGrid>

          <RecommendationsCard recs={report.recommendations} />

          <HostCard host={report.host} />

          <ContainersCard containers={report.containers} />

          {series ? <MonitoringCharts data={series} /> : null}

          {envsToShow.map((env) => (
            <EnvCard key={env} env={env} stats={report.envs[env]!} />
          ))}
        </>
      )}
    </div>
  );
}

/* ────────────────────────── Toolbar bits ────────────────────────── */

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-nowrap gap-1 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[var(--radius-full)] px-3 py-1.5 text-[12.5px] font-bold transition-colors",
              active
                ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.30)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--input-border-focus)] hover:text-[var(--brand-primary)] disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/* ────────────────────────── Section shell ────────────────────────── */

function SectionCard({
  title,
  icon,
  count,
  right,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard variant="panel" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
          {icon}
        </span>
        <h2 className="text-[15px] font-extrabold tracking-tight text-[var(--text-primary)]">{title}</h2>
        {typeof count === "number" ? (
          <span className="rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--text-muted)_15%,transparent)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-secondary)]">
            {count}
          </span>
        ) : null}
        {right ? <div className="ml-auto">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </GlassCard>
  );
}

function StatTile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3.5 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div
        className={cn(
          "mt-1 text-[18px] font-extrabold tabular-nums leading-none tracking-tight",
          warn ? "text-[var(--color-warn)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* ────────────────────────── Sections ────────────────────────── */

function RecommendationsCard({ recs }: { recs: PerfRecommendation[] }) {
  if (recs.length === 0) {
    return (
      <SectionCard title="Recomendações" icon={<AlertTriangle className="size-[18px]" />}>
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <CircleCheck className="size-4 text-[var(--color-success)]" />
          Nenhuma recomendação acima dos thresholds. Sistema saudável na janela atual.
        </div>
      </SectionCard>
    );
  }
  const tone = (s: PerfRecommendation["severity"]): "danger" | "warn" | "info" =>
    s === "critical" ? "danger" : s === "warning" ? "warn" : "info";
  return (
    <SectionCard title="Recomendações" icon={<AlertTriangle className="size-[18px]" />} count={recs.length}>
      <div className="flex flex-col gap-2.5">
        {recs.map((r) => (
          <HubCallout key={r.id} tone={tone(r.severity)} icon={<AlertTriangle className="size-[18px]" />}>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={r.severity} />
              <span className="font-mono text-[11px] text-[var(--text-muted)]">{r.target}</span>
              <span className="text-[13px] font-bold text-[var(--text-primary)]">{r.action}</span>
            </div>
            <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
              {r.rationale}{" "}
              <span className="text-[var(--text-muted)]">
                · metric={r.metric} observed={fmtNum(r.observed)} threshold={fmtNum(r.threshold)}
              </span>
            </div>
          </HubCallout>
        ))}
      </div>
    </SectionCard>
  );
}

function HostCard({ host }: { host: PerfReport["host"] }) {
  return (
    <SectionCard title="Host" icon={<Server className="size-[18px]" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Load 1m" value={host.load1.toFixed(2)} warn={host.load1 > 4} />
        <StatTile label="Load 5m" value={host.load5.toFixed(2)} warn={host.load5 > 4} />
        <StatTile label="Load 15m" value={host.load15.toFixed(2)} warn={host.load15 > 4} />
        <StatTile label="IO r/w /s" value={`${host.ioReadsPerSec.toFixed(0)} / ${host.ioWritesPerSec.toFixed(0)}`} />
      </div>
      {host.diskFreePctByMount.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {host.diskFreePctByMount.map((d) => {
            const low = d.freePct < 15;
            return (
              <div
                key={d.mount}
                className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3.5 py-2.5"
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-mono text-[var(--text-secondary)]">{d.mount}</span>
                  <span className={cn("font-bold tabular-nums", low ? "text-[var(--color-danger)]" : "text-[var(--text-primary)]")}>
                    {d.freePct.toFixed(1)}% livre
                  </span>
                </div>
                <Bar pct={100 - d.freePct} tone={low ? "danger" : d.freePct < 30 ? "warn" : "brand"} />
              </div>
            );
          })}
        </div>
      ) : null}
    </SectionCard>
  );
}

function ContainersCard({ containers }: { containers: ContainerStat[] }) {
  if (containers.length === 0) return null;
  const sorted = [...containers].sort((a, b) => b.cpuPct - a.cpuPct);
  const maxMem = Math.max(...sorted.map((c) => c.memBytes), 1);
  return (
    <SectionCard title="Containers" icon={<Cpu className="size-[18px]" />} count={containers.length}>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-2 py-2 text-left font-semibold">Container</th>
              <th className="px-2 py-2 text-left font-semibold">CPU %</th>
              <th className="px-2 py-2 text-right font-semibold">CPU pico</th>
              <th className="px-2 py-2 text-left font-semibold">Memória</th>
              <th className="px-2 py-2 text-right font-semibold">Mem pico</th>
              <th className="px-2 py-2 text-right font-semibold">Rede rx/tx</th>
              <th className="px-2 py-2 text-right font-semibold">IO r/w</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const hot = c.cpuPct > 80;
              return (
                <tr key={c.name} className="border-t border-[var(--glass-border-subtle)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
                  <td className="max-w-[220px] truncate px-2 py-2 font-mono text-[11.5px] text-[var(--text-secondary)]" title={c.name}>
                    {c.name}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-10 shrink-0 tabular-nums font-bold", hot ? "text-[var(--color-danger)]" : "text-[var(--text-primary)]")}>
                        {c.cpuPct.toFixed(1)}
                      </span>
                      <div className="min-w-[60px] flex-1">
                        <Bar pct={Math.min(c.cpuPct, 100)} tone={hot ? "danger" : c.cpuPct > 50 ? "warn" : "brand"} />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{c.cpuPctPeak.toFixed(1)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 tabular-nums font-semibold text-[var(--text-primary)]">{fmtBytes(c.memBytes)}</span>
                      <div className="min-w-[60px] flex-1">
                        <Bar pct={(c.memBytes / maxMem) * 100} tone="violet" />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{fmtBytes(c.memBytesPeak)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-[11.5px] text-[var(--text-muted)]">
                    {fmtBytes(c.netRxBytesPerSec)}/s · {fmtBytes(c.netTxBytesPerSec)}/s
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-[11.5px] text-[var(--text-muted)]">
                    {fmtBytes(c.ioReadBytesPerSec)}/s · {fmtBytes(c.ioWriteBytesPerSec)}/s
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function EnvCard({ env, stats }: { env: string; stats: EnvStats }) {
  return (
    <SectionCard title={`Env: ${env}`} icon={<Stack className="size-[18px]" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="RPS" value={stats.api.rps.toFixed(2)} />
        <StatTile label="p95" value={`${(stats.api.p95Latency * 1000).toFixed(0)}ms`} warn={stats.api.p95Latency > 1} />
        <StatTile label="Erro 5xx" value={`${(stats.api.errorRate * 100).toFixed(1)}%`} warn={stats.api.errorRate > 0.05} />
        <StatTile label="AI tokens/min" value={stats.ai.tokensPerMin.toFixed(0)} />
        <StatTile label="Meta /min" value={stats.meta.callsPerMin.toFixed(0)} />
        <StatTile label="DB conns" value={stats.db.connectionsActive.toFixed(0)} />
        <StatTile
          label="DB cache hit"
          value={`${(stats.db.cacheHitRatio * 100).toFixed(1)}%`}
          warn={stats.db.cacheHitRatio > 0 && stats.db.cacheHitRatio < 0.9}
        />
        <StatTile label="DB size" value={fmtBytes(stats.db.sizeBytes)} />
      </div>

      {stats.queues.byQueue.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            <Database className="size-3.5" /> Filas BullMQ
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[var(--glass-bg-overlay)] text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-3 py-2 text-left font-semibold">Queue</th>
                  <th className="px-3 py-2 text-right font-semibold">Waiting</th>
                  <th className="px-3 py-2 text-right font-semibold">Active</th>
                  <th className="px-3 py-2 text-right font-semibold">Failed</th>
                </tr>
              </thead>
              <tbody>
                {stats.queues.byQueue.map((q) => (
                  <tr key={q.name} className="border-t border-[var(--glass-border-subtle)]">
                    <td className="px-3 py-1.5 font-mono text-[11.5px] text-[var(--text-secondary)]">{q.name}</td>
                    <td className={cn("px-3 py-1.5 text-right tabular-nums", q.waiting > 1000 && "font-bold text-[var(--color-warn)]")}>{q.waiting}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-secondary)]">{q.active}</td>
                    <td className={cn("px-3 py-1.5 text-right tabular-nums", q.failed > 50 && "font-bold text-[var(--color-danger)]")}>{q.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {stats.db.slowQueries.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Slow queries</div>
          <div className="space-y-2">
            {stats.db.slowQueries.slice(0, 5).map((sq, i) => (
              <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-2.5">
                <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)]">
                  <span>mean {sq.meanExecMs.toFixed(0)}ms · calls {sq.calls}</span>
                  <span>total {(sq.totalExecMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="mt-1 truncate font-mono text-[11.5px] text-[var(--text-secondary)]">{sq.query}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

/* ────────────────────────── Small bits ────────────────────────── */

function Bar({ pct, tone }: { pct: number; tone: "brand" | "warn" | "danger" | "violet" }) {
  const toneClass: Record<string, string> = {
    brand: "bg-[var(--brand-primary)]",
    warn: "bg-[var(--color-warn)]",
    danger: "bg-[var(--color-danger)]",
    violet: "bg-[var(--brand-secondary)]",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text-muted)_18%,transparent)]">
      <div className={cn("h-full rounded-full transition-all", toneClass[tone])} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function SeverityBadge({ severity }: { severity: PerfRecommendation["severity"] }) {
  const map: Record<PerfRecommendation["severity"], string> = {
    info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]",
    warning: "bg-[var(--color-warn-bg)] text-[var(--color-warn)] border-[var(--color-warn-border)]",
    critical: "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)]",
  };
  return (
    <span className={cn("rounded-[var(--radius-full)] border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", map[severity])}>
      {severity}
    </span>
  );
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
