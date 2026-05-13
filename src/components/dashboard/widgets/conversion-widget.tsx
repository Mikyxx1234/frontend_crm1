"use client";

import { useDashboardMetrics } from "@/hooks/use-dashboard-data";
import { ComparisonBadge } from "../comparison-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ConversionWidget() {
  const { current, previous, isLoading, hasComparison } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  const rate = current?.conversionRate ?? 0;
  const wonDeals = current?.wonDeals ?? 0;
  const lostDeals = current?.lostDeals ?? 0;
  const total = wonDeals + lostDeals;
  const avgCycle = current?.avgCycleTime ?? 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-4xl font-extrabold tabular-nums text-foreground">
          {rate.toFixed(1)}%
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Taxa de conversão</p>
        {hasComparison && previous && (
          <div className="mt-1 flex justify-center">
            <ComparisonBadge current={rate} previous={previous.conversionRate} />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/50">
          {total > 0 && (
            <>
              <div
                className="rounded-l-full bg-emerald-500 transition-all"
                style={{ width: `${(wonDeals / total) * 100}%` }}
              />
              <div
                className="rounded-r-full bg-red-400 transition-all"
                style={{ width: `${(lostDeals / total) * 100}%` }}
              />
            </>
          )}
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="font-semibold text-emerald-600">{wonDeals} ganhos</span>
          <span className="font-semibold text-red-500">{lostDeals} perdidos</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ciclo médio
        </p>
        <p className="text-lg font-bold tabular-nums text-foreground">
          {avgCycle.toFixed(1)} dias
        </p>
        {hasComparison && previous && (
          <ComparisonBadge current={avgCycle} previous={previous.avgCycleTime} invertColors />
        )}
      </div>
    </div>
  );
}
