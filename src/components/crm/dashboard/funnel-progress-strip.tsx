"use client";

import Link from "next/link";

import { ChartCard } from "@/components/crm/chart-card";
import { EmptyState } from "@/components/crm/empty-state";
import { formatCurrency, formatNumber } from "@/features/dashboard-v2/format";
import type {
  DashboardFunnelStage,
  DashboardNewDeals,
} from "@/features/dashboard-v2/api";
import { IconFilter } from "@tabler/icons-react";

function pipelineHref(pipelineId: string, extra?: Record<string, string>) {
  const sp = new URLSearchParams({ pipeline: pipelineId, ...extra });
  return `/pipeline?${sp.toString()}`;
}

function StageColumn({
  stage,
  pipelineId,
}: {
  stage: DashboardFunnelStage;
  pipelineId: string;
}) {
  const openHref = pipelineHref(pipelineId, { stage: stage.id });

  return (
    <div className="flex w-[7.75rem] shrink-0 flex-col gap-2 border-r border-[var(--glass-border-subtle)] px-2.5 py-1 last:border-r-0">
      <span
        className="h-1 w-full rounded-full"
        style={{ background: stage.color || "var(--brand-primary)" }}
      />
      <p className="truncate font-display text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {stage.name}
      </p>
      <Link href={openHref} className="group min-w-0">
        <p className="font-display text-[20px] font-bold leading-none tabular-nums group-hover:text-[var(--brand-primary)]">
          {formatNumber(stage.count)}
        </p>
        <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">
          {formatCurrency(stage.value)}
        </p>
      </Link>
      <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-2 py-1.5">
        <p
          className={`font-display text-[13px] font-bold tabular-nums ${
            stage.entered > 0
              ? "text-[var(--color-success)]"
              : "text-[var(--text-muted)]"
          }`}
        >
          {stage.entered > 0 ? `+${formatNumber(stage.entered)}` : "0"}
        </p>
        <p className="font-body text-[10px] text-[var(--text-muted)]">entraram</p>
      </div>
      <Link
        href={openHref}
        className={`font-body text-[11px] tabular-nums ${
          stage.lost > 0
            ? "font-semibold text-[var(--color-danger-text)] hover:underline"
            : "text-[var(--text-muted)]"
        }`}
      >
        {stage.lost > 0
          ? `${formatNumber(stage.lost)} ${stage.lost === 1 ? "perda" : "perdas"}`
          : "0 perdas"}
      </Link>
    </div>
  );
}

function NewDealsColumn({
  newDeals,
  pipelineId,
}: {
  newDeals: DashboardNewDeals;
  pipelineId: string;
}) {
  return (
    <div className="flex w-[8.25rem] shrink-0 flex-col gap-2 border-r border-[var(--glass-border-subtle)] px-2.5 py-1">
      <span className="h-1 w-full rounded-full bg-[var(--brand-primary)]" />
      <p className="truncate font-display text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Novos
      </p>
      <Link href={pipelineHref(pipelineId)} className="group min-w-0">
        <p className="font-display text-[20px] font-bold leading-none tabular-nums text-[var(--color-success)] group-hover:underline">
          {newDeals.count > 0 ? `+${formatNumber(newDeals.count)}` : "0"}
        </p>
        <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">
          {formatCurrency(newDeals.value)}
        </p>
      </Link>
      <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-2 py-1.5">
        <p className="font-body text-[10px] leading-4 text-[var(--text-muted)]">
          <span className="font-display font-bold text-[var(--text-primary)]">
            {formatNumber(newDeals.open)}
          </span>{" "}
          abertos
        </p>
        <p className="font-body text-[10px] leading-4 text-[var(--color-success)]">
          <span className="font-display font-bold">{formatNumber(newDeals.won)}</span>{" "}
          ganhos
        </p>
        <p className="font-body text-[10px] leading-4 text-[var(--color-danger-text)]">
          <span className="font-display font-bold">{formatNumber(newDeals.lost)}</span>{" "}
          perdidos
        </p>
      </div>
    </div>
  );
}

export function FunnelProgressStrip({
  funnel,
  pipelineId,
  newDeals,
  wonCount,
  wonValue,
  lostCount,
  lostValue,
}: {
  funnel: DashboardFunnelStage[];
  pipelineId: string;
  newDeals: DashboardNewDeals;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  lostValue: number;
}) {
  return (
    <ChartCard
      title="Funil e progresso"
      subtitle="Novos do período, estoque aberto e perdas por etapa"
      action={
        <Link
          href={pipelineHref(pipelineId)}
          className="font-display text-[11px] font-semibold text-[var(--brand-primary)] hover:underline"
        >
          Pipeline
        </Link>
      }
      bodyClassName="p-0"
    >
      {funnel.length === 0 ? (
        <EmptyState
          icon={<IconFilter size={24} />}
          title="Sem etapas neste funil"
          description="Selecione outro pipeline ou cadastre etapas."
          className="py-10"
        />
      ) : (
        <div className="flex overflow-x-auto">
          <NewDealsColumn newDeals={newDeals} pipelineId={pipelineId} />
          {funnel.map((stage) => (
            <StageColumn key={stage.id} stage={stage} pipelineId={pipelineId} />
          ))}
          <div className="flex w-[8.5rem] shrink-0 flex-col justify-between gap-3 px-3 py-2">
            <Link href={pipelineHref(pipelineId)} className="group">
              <p className="font-display text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Ganhos
              </p>
              <p className="mt-1 font-display text-[20px] font-bold leading-none tabular-nums text-[var(--color-success)] group-hover:underline">
                {formatNumber(wonCount)}
              </p>
              <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">
                {formatCurrency(wonValue)}
              </p>
            </Link>
            <Link href={pipelineHref(pipelineId)} className="group">
              <p className="font-display text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Perdidos
              </p>
              <p className="mt-1 font-display text-[18px] font-bold leading-none tabular-nums text-[var(--color-danger-text)] group-hover:underline">
                {formatNumber(lostCount)}
              </p>
              <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">
                {formatCurrency(lostValue)}
              </p>
            </Link>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
