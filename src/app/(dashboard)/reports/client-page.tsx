"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Download,
  FileBarChart,
  Loader2,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Shield,
  Wrench,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type Summary = {
  totalMessages: number;
  serviceInbound: number;
  serviceOutbound: number;
  templateMarketing: number;
  templateUtility: number;
  templateUtilityFree: number;
  templateAuth: number;
  templateOther: number;
  flowMessages: number;
};

type DailyRow = {
  date: string;
  inbound: number;
  outbound: number;
  marketing: number;
  utility: number;
  utilityFree: number;
  auth: number;
  flow: number;
};

type MetaSection = {
  /// ISO string da ultima vez que rodamos o sync com a Graph API
  /// (qualquer dia, nao so o periodo atual). Null = nunca sincronizou.
  lastSyncAt: string | null;
  /// Custo total em USD no periodo selecionado, vindo direto do
  /// pricing_analytics da Meta. Esta é a fonte oficial — substitui
  /// nossa estimativa local heuristica.
  totalCostUsd: number;
  totalVolume: number;
  /// Breakdown por pricing_category (MARKETING, UTILITY, ...).
  byCategory: Record<string, { cost: number; volume: number }>;
  /// Breakdown por pricing_type (REGULAR, FREE_CUSTOMER_SERVICE, ...).
  byPricingType: Record<string, { cost: number; volume: number }>;
};

type ReportData = {
  period: { from: string; to: string };
  summary: Summary;
  daily: DailyRow[];
  meta?: MetaSection;
};

type SyncResponse = {
  ok: boolean;
  message?: string;
  pointsFetched?: number;
  rowsUpserted?: number;
  totalCostUsd?: number;
  totalVolume?: number;
  durationMs?: number;
};

const FREE_SERVICE_QUOTA = 1_000;

const COST_PER_MSG: Record<string, { label: string; usd: number }> = {
  serviceInbound: { label: "Serviço (entrada)", usd: 0.0 },
  serviceOutbound: { label: "Serviço (saída)", usd: 0.0 },
  templateMarketing: { label: "Marketing", usd: 0.0625 },
  templateUtility: { label: "Utility", usd: 0.0068 },
  templateAuth: { label: "Autenticação", usd: 0.0068 },
  templateOther: { label: "Template (outros)", usd: 0.0068 },
  flowMessages: { label: "Flow", usd: 0.0 },
};

function formatUSD(value: number): string {
  if (value > 0 && value < 0.01) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ReportsClientPage() {
  const [from, setFrom] = React.useState(firstOfMonthISO);
  const [to, setTo] = React.useState(todayISO);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<ReportData>({
    queryKey: ["report-messaging", from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(apiUrl(`/api/reports/messaging?${params}`));
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    },
  });

  const syncMutation = useMutation<SyncResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/reports/messaging/sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const json = (await res.json()) as SyncResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Falha ao sincronizar com a Meta.");
      }
      return json;
    },
    onSuccess: (result) => {
      const points = result.pointsFetched ?? 0;
      toast.success(
        points > 0
          ? `Meta sincronizada: ${points} buckets (${formatUSD(result.totalCostUsd ?? 0)})`
          : "Meta sincronizada — sem dados novos no período."
      );
      queryClient.invalidateQueries({ queryKey: ["report-messaging"] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const summary = data?.summary;
  const daily = data?.daily ?? [];
  const metaSection = data?.meta;

  // Custo OFICIAL (vem do cache MetaPricingDailyMetric, populado
  // pelo sync com a Graph API). Quando o tenant ainda nao sincronizou,
  // cai pra estimativa local pra nao mostrar zerado e gerar duvida.
  const estimatedCost = summary
    ? (summary.templateMarketing * COST_PER_MSG.templateMarketing.usd) +
      (summary.templateUtility * COST_PER_MSG.templateUtility.usd) +
      (summary.templateAuth * COST_PER_MSG.templateAuth.usd) +
      (summary.templateOther * COST_PER_MSG.templateOther.usd)
    : 0;
  const metaCost = metaSection?.totalCostUsd ?? 0;
  const hasMetaData = (metaSection?.lastSyncAt ?? null) !== null;
  const usingMetaCost = hasMetaData && metaCost > 0;
  const displayedCost = usingMetaCost ? metaCost : estimatedCost;

  const totalUtility = summary ? summary.templateUtility + (summary.templateUtilityFree ?? 0) : 0;

  const maxDaily = React.useMemo(() => {
    if (!daily.length) return 1;
    return Math.max(...daily.map((d) => d.inbound + d.outbound + d.marketing + d.utility + (d.utilityFree ?? 0) + d.auth + d.flow), 1);
  }, [daily]);

  const handleExport = () => {
    if (!daily.length) return;
    const header = "Data,Entrada,Saída,Marketing,Utility (cobrado),Utility (grátis),Auth,Flow\n";
    const rows = daily.map((d) => `${d.date},${d.inbound},${d.outbound},${d.marketing},${d.utility},${d.utilityFree ?? 0},${d.auth},${d.flow}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-mensageria-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Relatório de Mensageria"
        description="Volume de mensagens por tipo e estimativa de custo por conversa WhatsApp (USD) — apenas canal Meta Cloud API (mensagens via Baileys QR não aparecem aqui)."
        icon={<FileBarChart />}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                De
              </label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Até
              </label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              title="Puxa o custo oficial cobrado pela Meta (pricing_analytics da Graph API) pro periodo selecionado."
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3.5" />
              )}
              Sincronizar Meta
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleExport}
              disabled={!daily.length}
            >
              <Download className="mr-1.5 size-3.5" /> CSV
            </Button>
          </div>
        }
      />

      {/* Status barra: ultima sincronizacao com Meta */}
      {summary && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {hasMetaData ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              <CheckCircle2 className="size-3" />
              Última sincronização Meta:{" "}
              {metaSection?.lastSyncAt
                ? new Date(metaSection.lastSyncAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">
              <RefreshCw className="size-3" />
              Custo Meta não sincronizado — clique em &quot;Sincronizar Meta&quot; para puxar o valor oficial.
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar relatório."}
        </div>
      ) : summary ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={MessageCircle}
              label="Total de mensagens"
              value={summary.totalMessages.toLocaleString("pt-BR")}
              color="text-[var(--color-ink-soft)]"
              bg="bg-slate-100"
            />
            <KpiCard
              icon={DollarSign}
              label={usingMetaCost ? "Custo Meta (oficial)" : "Custo estimado"}
              value={formatUSD(displayedCost)}
              subtitle={
                usingMetaCost
                  ? "Cobrado pela Meta (pricing_analytics)"
                  : "Estimativa local — sincronize com a Meta para o valor oficial"
              }
              color={usingMetaCost ? "text-emerald-600" : "text-amber-600"}
              bg={usingMetaCost ? "bg-emerald-100" : "bg-amber-100"}
            />
            <KpiCard
              icon={ArrowDownRight}
              label="Entrada (serviço)"
              value={summary.serviceInbound.toLocaleString("pt-BR")}
              subtitle={`Grátis (${FREE_SERVICE_QUOTA.toLocaleString("pt-BR")}/mês por WABA)`}
              color="text-blue-600"
              bg="bg-blue-100"
            />
            <KpiCard
              icon={ArrowUpRight}
              label="Saída (agente)"
              value={summary.serviceOutbound.toLocaleString("pt-BR")}
              subtitle="Grátis (sessão aberta pelo cliente)"
              color="text-indigo-600"
              bg="bg-indigo-100"
            />
          </div>

          {/* Template breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TypeCard
              icon={Megaphone}
              label="Marketing"
              count={summary.templateMarketing}
              cost={summary.templateMarketing * COST_PER_MSG.templateMarketing.usd}
              unitCost={COST_PER_MSG.templateMarketing.usd}
              color="text-amber-700"
              bg="bg-amber-50"
              border="border-amber-200"
            />
            <TypeCard
              icon={Wrench}
              label="Utility"
              count={totalUtility}
              cost={summary.templateUtility * COST_PER_MSG.templateUtility.usd}
              unitCost={COST_PER_MSG.templateUtility.usd}
              color="text-sky-700"
              bg="bg-sky-50"
              border="border-sky-200"
              extra={summary.templateUtilityFree > 0 ? `${summary.templateUtilityFree} grátis (sessão aberta)` : undefined}
            />
            <TypeCard
              icon={Shield}
              label="Autenticação"
              count={summary.templateAuth}
              cost={summary.templateAuth * COST_PER_MSG.templateAuth.usd}
              unitCost={COST_PER_MSG.templateAuth.usd}
              color="text-violet-700"
              bg="bg-violet-50"
              border="border-violet-200"
            />
            <TypeCard
              icon={Workflow}
              label="Flow"
              count={summary.flowMessages}
              cost={0}
              unitCost={0}
              color="text-teal-700"
              bg="bg-teal-50"
              border="border-teal-200"
            />
          </div>

          {/* Daily chart */}
          {daily.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Volume diário</h2>
              </div>

              <div className="flex gap-4 flex-wrap mb-4 text-[11px]">
                <Legend color="bg-blue-400" label="Entrada" />
                <Legend color="bg-indigo-400" label="Saída" />
                <Legend color="bg-amber-400" label="Marketing" />
                <Legend color="bg-sky-400" label="Utility (cobrado)" />
                <Legend color="bg-sky-200" label="Utility (grátis)" />
                <Legend color="bg-violet-400" label="Auth" />
                <Legend color="bg-teal-400" label="Flow" />
              </div>

              <div className="flex items-end gap-[2px] overflow-x-auto pb-2" style={{ minHeight: 180 }}>
                {daily.map((d) => {
                  const uf = d.utilityFree ?? 0;
                  const total = d.inbound + d.outbound + d.marketing + d.utility + uf + d.auth + d.flow;
                  const h = (total / maxDaily) * 160;
                  return (
                    <div key={d.date} className="group relative flex flex-col items-center" style={{ minWidth: daily.length > 45 ? 8 : 16 }}>
                      <div className="flex flex-col-reverse rounded-t" style={{ height: Math.max(h, 2), width: daily.length > 45 ? 6 : 12 }}>
                        {d.inbound > 0 && <div className="bg-blue-400 rounded-t-sm" style={{ height: (d.inbound / total) * h }} />}
                        {d.outbound > 0 && <div className="bg-indigo-400" style={{ height: (d.outbound / total) * h }} />}
                        {d.marketing > 0 && <div className="bg-amber-400" style={{ height: (d.marketing / total) * h }} />}
                        {d.utility > 0 && <div className="bg-sky-400" style={{ height: (d.utility / total) * h }} />}
                        {uf > 0 && <div className="bg-sky-200" style={{ height: (uf / total) * h }} />}
                        {d.auth > 0 && <div className="bg-violet-400" style={{ height: (d.auth / total) * h }} />}
                        {d.flow > 0 && <div className="bg-teal-400 rounded-b-sm" style={{ height: (d.flow / total) * h }} />}
                      </div>
                      {daily.length <= 31 && (
                        <span className="mt-1 text-[9px] tabular-nums text-muted-foreground">{d.date.slice(8)}</span>
                      )}
                      <div className="pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max rounded-lg border border-border bg-white px-3 py-2 text-[11px] shadow-lg group-hover:block">
                        <p className="font-semibold text-foreground">{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                        <p className="text-muted-foreground">Total: {total}</p>
                        {d.inbound > 0 && <p>Entrada: {d.inbound}</p>}
                        {d.outbound > 0 && <p>Saída: {d.outbound}</p>}
                        {d.marketing > 0 && <p>Marketing: {d.marketing}</p>}
                        {d.utility > 0 && <p>Utility (cobrado): {d.utility}</p>}
                        {uf > 0 && <p>Utility (grátis): {uf}</p>}
                        {d.auth > 0 && <p>Auth: {d.auth}</p>}
                        {d.flow > 0 && <p>Flow: {d.flow}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meta official breakdown — só aparece quando ja sincronizou */}
          {hasMetaData && metaSection && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40">
              <div className="border-b border-emerald-200/70 px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Custos oficiais Meta (pricing_analytics)
                </h2>
                <p className="mt-0.5 text-[11px] text-emerald-800/80">
                  Valores cobrados pela Meta no período, agrupados por categoria de
                  conversa. Esta é a fonte usada na fatura oficial.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-emerald-200/70 bg-emerald-100/50">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium text-emerald-900">Categoria</th>
                    <th className="px-5 py-2.5 text-right font-medium text-emerald-900">Mensagens</th>
                    <th className="px-5 py-2.5 text-right font-medium text-emerald-900">Custo (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metaSection.byCategory)
                    .sort(([, a], [, b]) => b.cost - a.cost)
                    .map(([category, vals]) => (
                      <tr key={category} className="border-b border-emerald-200/50 last:border-0">
                        <td className="px-5 py-2.5 font-medium text-emerald-950">
                          {category.replace(/_/g, " ")}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-emerald-900">
                          {vals.volume.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-medium text-emerald-900">
                          {vals.cost > 0 ? formatUSD(vals.cost) : "—"}
                        </td>
                      </tr>
                    ))}
                  <tr className="bg-emerald-100/60 font-semibold">
                    <td className="px-5 py-3 text-emerald-950">Total cobrado pela Meta</td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-900">
                      {metaSection.totalVolume.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-700">
                      {formatUSD(metaSection.totalCostUsd)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cost breakdown table — estimativa local (heuristica) */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground" />
                Detalhamento de custos estimados {hasMetaData && <span className="text-[11px] font-normal text-muted-foreground">(estimativa local — para comparação)</span>}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Valores em USD baseados na{" "}
                <a href="https://business.whatsapp.com/products/platform-pricing" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  tabela oficial Meta WhatsApp Business
                </a>{" "}
                (Brasil, vigente desde jan/2026). Meta cobra por <strong>mensagem</strong> (template entregue).
                Respostas dentro da janela de 24h são grátis. Alguns templates de utility
                enviados dentro da sessão aberta pelo cliente podem ser grátis.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Tipo</th>
                  <th className="px-5 py-2.5 text-right font-medium">Mensagens</th>
                  <th className="px-5 py-2.5 text-right font-medium">Custo unitário</th>
                  <th className="px-5 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "serviceInbound", count: summary.serviceInbound, note: "Grátis", label: "Entrada (serviço)" },
                  { key: "serviceOutbound", count: summary.serviceOutbound, note: "Grátis", label: "Saída (agente — sessão aberta)" },
                  { key: "templateMarketing", count: summary.templateMarketing, label: "Marketing (abre conversa)" },
                  { key: "templateUtility", count: summary.templateUtility, label: "Utility (abre conversa)" },
                  { key: "templateUtilityFree", count: summary.templateUtilityFree ?? 0, note: "Grátis", label: "Utility (sessão já aberta)" },
                  { key: "templateAuth", count: summary.templateAuth, label: "Autenticação (abre conversa)" },
                  { key: "templateOther", count: summary.templateOther, label: "Template (outros)" },
                  { key: "flowMessages", count: summary.flowMessages, note: "Grátis", label: "Flow" },
                ].map((row) => {
                  const info = COST_PER_MSG[row.key] ?? { label: row.label, usd: 0 };
                  const subtotal = row.count * info.usd;
                  return (
                    <tr key={row.key} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-2.5 font-medium">{row.label ?? info.label}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{row.count.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                        {info.usd > 0 ? formatUSD(info.usd) : (row.note ?? "—")}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">
                        {subtotal > 0 ? formatUSD(subtotal) : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-5 py-3" colSpan={3}>Total estimado (USD)</td>
                  <td className="px-5 py-3 text-right tabular-nums text-emerald-700">{formatUSD(estimatedCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-10 items-center justify-center rounded-xl", bg)}>
          <Icon className={cn("size-5", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function TypeCard({ icon: Icon, label, count, cost, unitCost, color, bg, border, extra }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  cost: number;
  unitCost: number;
  color: string;
  bg: string;
  border: string;
  extra?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", border, bg)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", color)} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", color)}>{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", color)}>{count.toLocaleString("pt-BR")}</p>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{unitCost > 0 ? `${formatUSD(unitCost)}/msg` : "Grátis"}</span>
        <span className={cn("font-semibold", color)}>{cost > 0 ? formatUSD(cost) : "—"}</span>
      </div>
      {extra && <p className="mt-1 text-[10px] text-muted-foreground">{extra}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-2.5 rounded-sm", color)} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
