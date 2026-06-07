"use client";

/*
 * Dashboard comercial — conteúdo do tab "Negócios" (Fase 1).
 *
 * Renderiza cards principais + novos cards comerciais, o funil por
 * etapa, "Negócios por origem" e o "Ranking de consultores". Todos os
 * dados já chegam agregados pelo backend (GET /api/dashboard),
 * respeitando os filtros — nada de cálculo pesado aqui.
 */

import { useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  IconAlertTriangle,
  IconArrowsRight,
  IconBriefcase,
  IconChartLine,
  IconChevronLeft,
  IconChevronRight,
  IconCircleX,
  IconClockHour4,
  IconCurrencyReal,
  IconHourglassHigh,
  IconReceipt,
  IconTag,
  IconTargetArrow,
  IconTrendingDown,
  IconTrophy,
  IconUserPlus,
  IconUserQuestion,
} from "@tabler/icons-react";

import { StatCard } from "@/components/crm/stat-card";
import { ButtonGlass } from "@/components/crm/button-glass";
import { ChartCard } from "@/components/crm/chart-card";
import { EmptyState } from "@/components/crm/empty-state";
import {
  HoverEffectGroup,
  HoverEffectItem,
} from "@/components/crm/dashboard/card-hover-effect";
import { tagPillStyle } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/features/dashboard-v2/format";
import type { DashboardData } from "@/features/dashboard-v2/api";
import type { ResolvedDashboardBlock } from "@/lib/dashboard-blocks-catalog";

/** "2026-06-05" -> "05/06" para o eixo X do gráfico. */
function shortDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--tooltip-bg)] px-3 py-2 shadow-[var(--glass-shadow)]">
      {label && (
        <p className="mb-1 font-display text-[11px] font-bold text-[var(--tooltip-text)]">
          {shortDay(String(label))}
        </p>
      )}
      {payload.map((entry: any) => (
        <p
          key={entry.dataKey}
          className="flex items-center gap-1.5 font-body text-[11px] text-[var(--tooltip-text)]"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="capitalize">{entry.name}:</span>
          <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Renderizadores de cada bloco por `key` (catálogo de blocos). */
const BLOCK_RENDERERS: Record<string, (data: DashboardData) => React.ReactNode> = {
  summary: (d) => <SummaryCards summary={d.summary} />,
  funnel: (d) => <FunnelSection funnel={d.funnel} />,
  dailyEvolution: (d) => <DailyEvolutionSection data={d.dailyEvolution} />,
  bySource: (d) => <SourceSection rows={d.bySource} />,
  byOwner: (d) => <OwnerSection rows={d.byOwner} />,
  byTag: (d) => <TagSection rows={d.byTag} />,
  lossReasons: (d) => <LossReasonSection rows={d.lossReasons} />,
  stalled: (d) => <StalledSection rows={d.stalled} />,
};

export function DealsDashboard({
  data,
  blocks,
}: {
  data: DashboardData;
  blocks: ResolvedDashboardBlock[];
}) {
  const visible = blocks.filter((b) => b.enabled && BLOCK_RENDERERS[b.key]);

  return (
    <div className="flex flex-col gap-4">
      {visible.map((b) => (
        <div key={b.key}>{BLOCK_RENDERERS[b.key](data)}</div>
      ))}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────────

const EMPTY_SUMMARY: DashboardData["summary"] = {
  totalValue: 0,
  openDeals: 0,
  winRate: 0,
  avgTicket: 0,
  newContacts: 0,
  wonCount: 0,
  lostCount: 0,
  wonValue: 0,
  lostValue: 0,
  leadsWithoutOwner: 0,
  avgTimeToWinDays: 0,
  deltas: { winRate: 0, avgTicket: 0, wonCount: 0, wonValue: 0 },
};

function SummaryCards({ summary }: { summary: DashboardData["summary"] }) {
  const s = summary ?? EMPTY_SUMMARY;
  const deltas = s.deltas ?? EMPTY_SUMMARY.deltas;
  return (
    <HoverEffectGroup>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
        <HoverEffectItem itemKey="kpi-valor" className="h-full">
          <StatCard
            icon={<IconCurrencyReal size={18} />}
            label="Valor total"
            value={formatCurrency(s.totalValue)}
            accent="brand"
            caption="no funil ativo"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-andamento" className="h-full">
          <StatCard
            icon={<IconBriefcase size={18} />}
            label="Em andamento"
            value={formatNumber(s.openDeals)}
            accent="teal"
            caption="negócios abertos"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-taxa" className="h-full">
          <StatCard
            icon={<IconTargetArrow size={18} />}
            label="Taxa de ganho"
            value={`${s.winRate}%`}
            delta={deltas.winRate}
            accent="success"
            caption="vs. período anterior"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-ticket" className="h-full">
          <StatCard
            icon={<IconReceipt size={18} />}
            label="Ticket médio"
            value={formatCurrency(s.avgTicket)}
            delta={deltas.avgTicket}
            accent="purple"
            caption="por negócio ganho"
          />
        </HoverEffectItem>

        <HoverEffectItem itemKey="kpi-ganhos" className="h-full">
          <StatCard
            icon={<IconTrophy size={18} />}
            label="Ganhos"
            value={formatNumber(s.wonCount)}
            delta={deltas.wonCount}
            accent="success"
            caption="no período"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-perdidos" className="h-full">
          <StatCard
            icon={<IconCircleX size={18} />}
            label="Perdidos"
            value={formatNumber(s.lostCount)}
            accent="danger"
            caption="no período"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-valor-ganho" className="h-full">
          <StatCard
            icon={<IconCurrencyReal size={18} />}
            label="Valor ganho"
            value={formatCurrency(s.wonValue)}
            delta={deltas.wonValue}
            accent="success"
            caption="no período"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-valor-perdido" className="h-full">
          <StatCard
            icon={<IconTrendingDown size={18} />}
            label="Valor perdido"
            value={formatCurrency(s.lostValue)}
            accent="danger"
            caption="no período"
          />
        </HoverEffectItem>

        <HoverEffectItem itemKey="kpi-novos" className="h-full">
          <StatCard
            icon={<IconUserPlus size={18} />}
            label="Novos contatos"
            value={formatNumber(s.newContacts)}
            accent="brand"
            caption="criados no período"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-sem-resp" className="h-full">
          <StatCard
            icon={<IconUserQuestion size={18} />}
            label="Sem responsável"
            value={formatNumber(s.leadsWithoutOwner)}
            accent="warning"
            caption="negócios abertos"
          />
        </HoverEffectItem>
        <HoverEffectItem itemKey="kpi-tempo-ganho" className="h-full">
          <StatCard
            icon={<IconClockHour4 size={18} />}
            label="Tempo até ganho"
            value={s.avgTimeToWinDays > 0 ? `${s.avgTimeToWinDays}d` : "—"}
            accent="purple"
            caption="da criação ao ganho"
          />
        </HoverEffectItem>
      </div>
    </HoverEffectGroup>
  );
}

// ── Funil por etapa ──────────────────────────────────────────────────

function FunnelSection({ funnel }: { funnel: DashboardData["funnel"] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxCount = Math.max(1, ...funnel.map((s) => s.count));

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <section className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <header className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
            Funil por etapa
          </h3>
          <p className="font-body text-[11px] text-[var(--text-muted)]">
            Negócios abertos por etapa + ganhos/perdidos no período.
          </p>
        </div>
        {funnel.length > 0 && (
          <div className="flex items-center gap-1.5">
            <ButtonGlass variant="icon" size="icon" aria-label="Anterior" onClick={() => scroll("left")}>
              <IconChevronLeft size={18} />
            </ButtonGlass>
            <ButtonGlass variant="icon" size="icon" aria-label="Próximo" onClick={() => scroll("right")}>
              <IconChevronRight size={18} />
            </ButtonGlass>
          </div>
        )}
      </header>

      {funnel.length === 0 ? (
        <EmptyState
          icon={<IconArrowsRight size={24} />}
          title="Nenhuma etapa encontrada"
          description="O pipeline selecionado não possui etapas ou negócios no período."
        />
      ) : (
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
          <HoverEffectGroup>
            {funnel.map((stage) => (
              <HoverEffectItem key={stage.id} itemKey={stage.id} className="shrink-0">
                <article className="flex h-full w-[252px] flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3.5 shadow-[var(--glass-shadow-sm)]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color }} />
                      <h4 className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                        {stage.name}
                      </h4>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(stage.count / maxCount) * 100}%`, background: stage.color }}
                      />
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-display text-[20px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
                        {stage.count}
                      </span>
                      <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        em andamento
                      </span>
                    </div>
                    <span className="font-display text-[13px] font-bold text-[var(--text-secondary)]">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--glass-border-subtle)] pt-2.5">
                    <Metric icon={<IconTrophy size={13} />} value={stage.won} label="Ganhos" tone="success" />
                    <Metric icon={<IconCircleX size={13} />} value={stage.lost} label="Perdidos" tone="danger" />
                    <Metric icon={<IconTargetArrow size={13} />} value={`${stage.conversion}%`} label="Conversão" tone="brand" />
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--glass-border-subtle)] pt-2 font-body text-[10px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <IconArrowsRight size={12} className="text-[var(--color-success)]" />
                      Entraram <strong className="font-bold text-[var(--text-secondary)]">{stage.entered}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Avançaram <strong className="font-bold text-[var(--text-secondary)]">{stage.exited}</strong>
                    </span>
                  </div>
                </article>
              </HoverEffectItem>
            ))}
          </HoverEffectGroup>
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  tone: "success" | "brand" | "danger";
}) {
  const toneClass = {
    success: "text-[var(--color-success)]",
    brand: "text-[var(--brand-primary)]",
    danger: "text-[var(--color-danger)]",
  }[tone];

  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className={`flex items-center gap-0.5 font-display text-[13px] font-bold ${toneClass}`}>
        {icon}
        {value}
      </span>
      <span className="font-body text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

// ── Negócios por origem ──────────────────────────────────────────────

function SourceSection({ rows }: { rows: DashboardData["bySource"] }) {
  return (
    <ChartCard
      title="Negócios por origem"
      subtitle="Distribuição de leads e conversão por canal de aquisição"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconTargetArrow size={24} />}
          title="Sem dados de origem"
          description="Nenhum negócio no período para os filtros atuais."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--glass-border-subtle)]">
                <Th>Origem</Th>
                <Th align="right">Negócios</Th>
                <Th align="right">Ganhos</Th>
                <Th align="right">Perdidos</Th>
                <Th align="right">Conversão</Th>
                <Th align="right">Valor ganho</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className="border-b border-[var(--glass-border-subtle)] last:border-0 transition-colors hover:bg-[var(--glass-bg-subtle)]"
                >
                  <Td>
                    <span className="font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                      {r.label}
                    </span>
                  </Td>
                  <Td align="right">{formatNumber(r.count)}</Td>
                  <Td align="right" className="text-[var(--color-success)]">{formatNumber(r.won)}</Td>
                  <Td align="right" className="text-[var(--color-danger)]">{formatNumber(r.lost)}</Td>
                  <Td align="right">{r.conversion}%</Td>
                  <Td align="right" className="font-bold">{formatCurrency(r.wonValue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

// ── Ranking de consultores ───────────────────────────────────────────

function OwnerSection({ rows }: { rows: DashboardData["byOwner"] }) {
  return (
    <ChartCard
      title="Ranking de consultores"
      subtitle="Desempenho por responsável no período"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconUserQuestion size={24} />}
          title="Sem dados de consultores"
          description="Nenhum negócio atribuído no período para os filtros atuais."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--glass-border-subtle)]">
                <Th>Consultor</Th>
                <Th align="right">Recebidos</Th>
                <Th align="right">Andamento</Th>
                <Th align="right">Ganhos</Th>
                <Th align="right">Conversão</Th>
                <Th align="right">Valor ganho</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--glass-border-subtle)] last:border-0 transition-colors hover:bg-[var(--glass-bg-subtle)]"
                >
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] font-display text-[10px] font-bold text-[var(--text-muted)]">
                        {i + 1}
                      </span>
                      <span className="truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                        {r.name}
                      </span>
                    </span>
                  </Td>
                  <Td align="right">{formatNumber(r.leads)}</Td>
                  <Td align="right">{formatNumber(r.open)}</Td>
                  <Td align="right" className="text-[var(--color-success)]">{formatNumber(r.won)}</Td>
                  <Td align="right">{r.conversion}%</Td>
                  <Td align="right" className="font-bold">{formatCurrency(r.wonValue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2.5 font-display text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-2.5 font-body text-[12.5px] text-[var(--text-secondary)] ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

// ── Evolução diária ──────────────────────────────────────────────────

function DailyEvolutionSection({
  data,
}: {
  data: DashboardData["dailyEvolution"];
}) {
  const hasData = data.some((d) => d.novos || d.ganhos || d.perdidos);
  return (
    <ChartCard
      title="Evolução diária"
      subtitle="Novos, ganhos e perdidos por dia no período"
      legend={[
        { label: "Novos", color: "var(--brand-primary)" },
        { label: "Ganhos", color: "var(--color-success)" },
        { label: "Perdidos", color: "var(--color-danger)" },
      ]}
    >
      <div className="h-[260px] w-full">
        {!hasData ? (
          <EmptyState
            icon={<IconChartLine size={24} />}
            title="Sem movimentação no período"
            description="Nenhum negócio criado, ganho ou perdido para os filtros atuais."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-novos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-ganhos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-perdidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDay}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="novos" name="Novos" stroke="var(--brand-primary)" strokeWidth={2.5} fill="url(#grad-novos)" />
              <Area type="monotone" dataKey="ganhos" name="Ganhos" stroke="var(--color-success)" strokeWidth={2.5} fill="url(#grad-ganhos)" />
              <Area type="monotone" dataKey="perdidos" name="Perdidos" stroke="var(--color-danger)" strokeWidth={2.5} fill="url(#grad-perdidos)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

// ── Performance por tags ─────────────────────────────────────────────

function TagSection({ rows }: { rows: DashboardData["byTag"] }) {
  return (
    <ChartCard
      title="Performance por tags"
      subtitle="Conversão e valor ganho por tag no período"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconTag size={24} />}
          title="Sem dados de tags"
          description="Nenhum negócio com tags no período para os filtros atuais."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--glass-border-subtle)]">
                <Th>Tag</Th>
                <Th align="right">Negócios</Th>
                <Th align="right">Ganhos</Th>
                <Th align="right">Perdidos</Th>
                <Th align="right">Conversão</Th>
                <Th align="right">Valor ganho</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--glass-border-subtle)] last:border-0 transition-colors hover:bg-[var(--glass-bg-subtle)]"
                >
                  <Td>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 font-display text-[11px] font-semibold"
                      style={tagPillStyle(r.name, r.color)}
                    >
                      {r.name}
                    </span>
                  </Td>
                  <Td align="right">{formatNumber(r.count)}</Td>
                  <Td align="right" className="text-[var(--color-success)]">{formatNumber(r.won)}</Td>
                  <Td align="right" className="text-[var(--color-danger)]">{formatNumber(r.lost)}</Td>
                  <Td align="right">{r.conversion}%</Td>
                  <Td align="right" className="font-bold">{formatCurrency(r.wonValue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

// ── Motivos de perda ─────────────────────────────────────────────────

function LossReasonSection({ rows }: { rows: DashboardData["lossReasons"] }) {
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  return (
    <ChartCard
      title="Motivos de perda"
      subtitle="Por que os negócios foram perdidos no período"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconCircleX size={24} />}
          title="Sem perdas no período"
          description="Nenhum negócio perdido para os filtros atuais."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--glass-border-subtle)]">
                <Th>Motivo</Th>
                <Th align="right">Negócios</Th>
                <Th align="right">% do total</Th>
                <Th align="right">Valor perdido</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.reason}
                  className="border-b border-[var(--glass-border-subtle)] last:border-0 transition-colors hover:bg-[var(--glass-bg-subtle)]"
                >
                  <Td>
                    <span className="font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                      {r.reason}
                    </span>
                  </Td>
                  <Td align="right">{formatNumber(r.count)}</Td>
                  <Td align="right">
                    {total > 0 ? Math.round((r.count / total) * 100) : 0}%
                  </Td>
                  <Td align="right" className="font-bold text-[var(--color-danger)]">
                    {formatCurrency(r.value)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

// ── Leads parados por etapa ──────────────────────────────────────────

function StalledSection({ rows }: { rows: DashboardData["stalled"] }) {
  return (
    <ChartCard
      title="Leads parados por etapa"
      subtitle="Negócios abertos sem atualização além do tempo de apodrecimento da etapa"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconHourglassHigh size={24} />}
          title="Nenhum lead parado"
          description="Todos os negócios abertos estão dentro do prazo das etapas."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--glass-border-subtle)]">
                <Th>Etapa</Th>
                <Th align="right">Parados</Th>
                <Th align="right">Sem mexer há</Th>
                <Th align="right">Valor parado</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--glass-border-subtle)] last:border-0 transition-colors hover:bg-[var(--glass-bg-subtle)]"
                >
                  <Td>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span className="font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                        {r.name}
                      </span>
                    </span>
                  </Td>
                  <Td align="right" className="font-bold text-[var(--color-warning)]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <IconAlertTriangle size={13} />
                      {formatNumber(r.count)}
                    </span>
                  </Td>
                  <Td align="right">+{r.rottingDays} dias</Td>
                  <Td align="right" className="font-bold">{formatCurrency(r.value)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
