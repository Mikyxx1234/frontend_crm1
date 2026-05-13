"use client";

import { useDashboardMetrics } from "@/hooks/use-dashboard-data";
import { ComparisonBadge } from "../comparison-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export function PipelineWidget() {
  const { current, previous, isLoading, hasComparison } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  const pipelineValue = current?.pipelineValue ?? 0;
  const weightedValue = current?.weightedPipelineValue ?? 0;
  const openDeals = current?.openDeals ?? 0;
  const totalDeals = current?.totalDeals ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Valor no Pipeline
        </p>
        <p className="text-2xl font-extrabold tabular-nums text-foreground">
          {formatCurrency(pipelineValue)}
        </p>
        {hasComparison && previous && (
          <ComparisonBadge
            current={pipelineValue}
            previous={previous.pipelineValue}
            format={formatCurrency}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ponderado
          </p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {formatCurrency(weightedValue)}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Deals Abertos
          </p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {openDeals}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Total no Período
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">
          {totalDeals} negócios
        </p>
        {hasComparison && previous && (
          <ComparisonBadge current={totalDeals} previous={previous.totalDeals} />
        )}
      </div>
    </div>
  );
}
