"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCircleX,
  IconReceipt,
  IconTargetArrow,
  IconTrophy,
} from "@tabler/icons-react";

import { StatCard } from "@/components/crm/stat-card";
import { ChartCard } from "@/components/crm/chart-card";
import { EmptyState } from "@/components/crm/empty-state";
import { FunnelProgressStrip } from "@/components/crm/dashboard/funnel-progress-strip";
import { formatCurrency, formatNumber } from "@/features/dashboard-v2/format";
import type { DashboardData } from "@/features/dashboard-v2/api";

export function ManagerDashboard({ data }: { data: DashboardData }) {
  const s = data.summary;
  const owners = (data.byOwner ?? []).slice(0, 5);
  const losses = (data.lossReasons ?? []).slice(0, 5);
  const stalled = data.stalled ?? [];
  const lossTotal = losses.reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Link href="/pipeline" className="min-w-0 rounded-[var(--radius-xl)] outline-none ring-[var(--brand-primary)] focus-visible:ring-2">
          <StatCard
            icon={<IconBriefcase size={18} />}
            label="Em andamento"
            value={formatNumber(s.openDeals)}
            accent="teal"
            caption="negócios abertos"
          />
        </Link>
        <StatCard
          icon={<IconTrophy size={18} />}
          label="Ganhos"
          value={formatNumber(s.wonCount)}
          delta={s.deltas?.wonCount}
          accent="success"
          caption={`${formatCurrency(s.wonValue)} no período`}
        />
        <StatCard
          icon={<IconTargetArrow size={18} />}
          label="Taxa de ganho"
          value={`${s.winRate}%`}
          delta={s.deltas?.winRate}
          accent="brand"
          caption="vs. período anterior"
        />
        <StatCard
          icon={<IconReceipt size={18} />}
          label="Ticket médio"
          value={formatCurrency(s.avgTicket)}
          delta={s.deltas?.avgTicket}
          accent="purple"
          caption="por negócio ganho"
        />
      </div>

      <FunnelProgressStrip
        funnel={data.funnel ?? []}
        pipelineId={data.pipelineId}
        newDeals={
          data.newDeals ?? {
            count: 0,
            value: 0,
            open: 0,
            won: 0,
            lost: 0,
            wonValue: 0,
            lostValue: 0,
          }
        }
        wonCount={s.wonCount}
        wonValue={s.wonValue}
        lostCount={s.lostCount}
        lostValue={s.lostValue}
      />

      <ChartCard
        title="Leads parados"
        subtitle="Sem movimento além do prazo da etapa"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/pipeline?owner=none"
              className="font-display text-[11px] font-semibold text-[var(--color-warning)] hover:underline"
            >
              {formatNumber(s.leadsWithoutOwner)} sem dono
            </Link>
            <Link
              href="/pipeline"
              className="font-display text-[11px] font-semibold text-[var(--brand-primary)] hover:underline"
            >
              Pipeline
            </Link>
          </div>
        }
        bodyClassName="p-0"
      >
        {stalled.length === 0 ? (
          <EmptyState
            icon={<IconAlertTriangle size={24} />}
            title="Nenhum lead parado"
            description="Os negócios abertos estão dentro do prazo."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-[var(--glass-border-subtle)]">
            {stalled.map((row) => (
              <li key={row.id}>
                <Link
                  href="/pipeline"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--glass-bg-subtle)]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                  <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold">
                    {row.name}
                  </span>
                  <span className="shrink-0 font-display text-[12px] font-bold text-[var(--color-warning)]">
                    {formatNumber(row.count)}
                  </span>
                  <span className="w-20 shrink-0 text-right font-body text-[11px] text-[var(--text-muted)]">
                    +{row.rottingDays}d
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Top consultores" subtitle="Ganhos no período" bodyClassName="p-0">
          {owners.length === 0 ? (
            <EmptyState
              icon={<IconTrophy size={24} />}
              title="Sem ranking"
              description="Nenhum negócio atribuído no período."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-[var(--glass-border-subtle)]">
              {owners.map((row, i) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] font-display text-[10px] font-bold text-[var(--text-muted)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold">
                    {row.name}
                  </span>
                  <span className="shrink-0 font-body text-[12px] text-[var(--color-success)]">
                    {formatNumber(row.won)}
                  </span>
                  <span className="w-[4.5rem] shrink-0 text-right font-display text-[12px] font-bold">
                    {formatCurrency(row.wonValue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Por que perdemos" subtitle="Motivos de perda no período" bodyClassName="p-0">
          {losses.length === 0 ? (
            <EmptyState
              icon={<IconCircleX size={24} />}
              title="Sem perdas no período"
              description="Nenhum negócio perdido no recorte."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-[var(--glass-border-subtle)]">
              {losses.map((row) => (
                <li key={row.reason} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-body text-[12.5px]">{row.reason}</span>
                  <span className="shrink-0 font-display text-[12px] font-bold">{row.count}</span>
                  <span className="w-8 shrink-0 text-right font-body text-[11px] text-[var(--text-muted)]">
                    {lossTotal > 0 ? Math.round((row.count / lossTotal) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
