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
import { cn } from "@/lib/utils";

function pipelineHref(pipelineId: string, extra?: Record<string, string>) {
  const sp = new URLSearchParams({ pipeline: pipelineId, ...extra });
  return `/pipeline?${sp.toString()}`;
}

const colClass =
  "flex min-w-[11.5rem] flex-1 shrink-0 flex-col gap-2.5 border-r border-[var(--glass-border-subtle)] px-4 py-3.5 last:border-r-0 sm:min-w-[13rem]";

function StageColumn({
  stage,
  pipelineId,
}: {
  stage: DashboardFunnelStage;
  pipelineId: string;
}) {
  const openHref = pipelineHref(pipelineId, { stage: stage.id });

  return (
    <div className={colClass}>
      <span
        className="h-1.5 w-full rounded-full"
        style={{ background: stage.color || "var(--brand-primary)" }}
      />
      <p className="truncate font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {stage.name}
      </p>
      <Link href={openHref} className="group min-w-0">
        <p className="font-display text-[26px] font-bold leading-none tabular-nums group-hover:text-[var(--brand-primary)]">
          {formatNumber(stage.count)}
        </p>
        <p className="mt-1 font-body text-[12px] text-[var(--text-muted)]">
          {formatCurrency(stage.value)}
        </p>
      </Link>
      <div className="mt-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] px-2.5 py-2">
        <p
          className={cn(
            "font-display text-[16px] font-bold tabular-nums",
            stage.entered > 0
              ? "text-[var(--color-success)]"
              : "text-[var(--text-muted)]",
          )}
        >
          {stage.entered > 0 ? `+${formatNumber(stage.entered)}` : "0"}
        </p>
        <p className="font-body text-[11px] text-[var(--text-muted)]">entraram</p>
      </div>
      <Link
        href={openHref}
        className={cn(
          "font-body text-[12px] tabular-nums",
          stage.lost > 0
            ? "font-semibold text-[var(--color-danger-text)] hover:underline"
            : "text-[var(--text-muted)]",
        )}
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
    <div className={colClass}>
      <span className="h-1.5 w-full rounded-full bg-[var(--brand-primary)]" />
      <p className="truncate font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Novos
      </p>
      <Link href={pipelineHref(pipelineId)} className="group min-w-0">
        <p className="font-display text-[26px] font-bold leading-none tabular-nums text-[var(--color-success)] group-hover:underline">
          {newDeals.count > 0 ? `+${formatNumber(newDeals.count)}` : "0"}
        </p>
        <p className="mt-1 font-body text-[12px] text-[var(--text-muted)]">
          {formatCurrency(newDeals.value)}
        </p>
      </Link>
      <div className="mt-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] px-2.5 py-2">
        <p className="font-body text-[12px] leading-5 text-[var(--text-muted)]">
          <span className="font-display font-bold text-[var(--text-primary)]">
            {formatNumber(newDeals.open)}
          </span>{" "}
          abertos
        </p>
        <p className="font-body text-[12px] leading-5 text-[var(--color-success)]">
          <span className="font-display font-bold">{formatNumber(newDeals.won)}</span>{" "}
          ganhos
        </p>
        <p className="font-body text-[12px] leading-5 text-[var(--color-danger-text)]">
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
      className="min-w-0 overflow-hidden"
      action={
        <Link
          href={pipelineHref(pipelineId)}
          className="font-display text-[11px] font-semibold text-[var(--brand-primary)] hover:underline"
        >
          Pipeline
        </Link>
      }
      bodyClassName="min-w-0 overflow-hidden p-0"
    >
      {funnel.length === 0 ? (
        <EmptyState
          icon={<IconFilter size={24} />}
          title="Sem etapas neste funil"
          description="Selecione outro pipeline ou cadastre etapas."
          className="py-10"
        />
      ) : (
        <div className="list-hscroll min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <div className="flex w-max min-w-full">
            <NewDealsColumn newDeals={newDeals} pipelineId={pipelineId} />
            {funnel.map((stage) => (
              <StageColumn key={stage.id} stage={stage} pipelineId={pipelineId} />
            ))}
            <div className={cn(colClass, "justify-between")}>
              <Link href={pipelineHref(pipelineId)} className="group">
                <p className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Ganhos
                </p>
                <p className="mt-2 font-display text-[26px] font-bold leading-none tabular-nums text-[var(--color-success)] group-hover:underline">
                  {formatNumber(wonCount)}
                </p>
                <p className="mt-1 font-body text-[12px] text-[var(--text-muted)]">
                  {formatCurrency(wonValue)}
                </p>
              </Link>
              <Link href={pipelineHref(pipelineId)} className="group">
                <p className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Perdidos
                </p>
                <p className="mt-2 font-display text-[22px] font-bold leading-none tabular-nums text-[var(--color-danger-text)] group-hover:underline">
                  {formatNumber(lostCount)}
                </p>
                <p className="mt-1 font-body text-[12px] text-[var(--text-muted)]">
                  {formatCurrency(lostValue)}
                </p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
