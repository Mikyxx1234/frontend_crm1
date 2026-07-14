"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useFunnelData } from "@/hooks/use-dashboard-data";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

const STAGE_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "var(--color-fuchsia)", "#ec4899", "var(--color-rose)", "var(--color-orange)",
];

export function FunnelWidget() {
  const { filters } = useDashboardStore();

  const { data: pipelines = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["pipelines-list"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/pipelines"));
      const j = await r.json();
      return Array.isArray(j) ? j : j.pipelines ?? [];
    },
    staleTime: 120_000,
  });

  const pipelineId = filters.pipelineId ?? pipelines[0]?.id ?? null;
  const { data: funnel, isLoading } = useFunnelData(pipelineId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!funnel || funnel.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Selecione um pipeline nos filtros.</p>;
  }

  const maxCount = Math.max(...funnel.map((s) => s.dealCount), 1);

  return (
    <div className="space-y-2">
      {funnel.map((stage, idx) => {
        const pct = (stage.dealCount / maxCount) * 100;
        const color = STAGE_COLORS[idx % STAGE_COLORS.length];
        return (
          <div key={`${stage.stagePosition}-${idx}`} className="group">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold text-foreground">
                  {stage.stageName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold tabular-nums text-foreground">
                  {stage.dealCount} deals
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(stage.totalValue)}
                </span>
                {stage.conversionFromPrevious !== null && (
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    stage.conversionFromPrevious >= 50
                      ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                      : stage.conversionFromPrevious >= 25
                        ? "bg-[var(--color-warn-bg)] text-[var(--color-warn)]"
                        : "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
                  )}>
                    {stage.conversionFromPrevious.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-lg bg-[var(--glass-bg-overlay)]">
              <div
                className="h-full rounded-lg transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: color,
                  opacity: 0.75,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
