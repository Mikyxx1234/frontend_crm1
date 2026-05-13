"use client";

import { useLossesData } from "@/hooks/use-dashboard-data";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

const BAR_COLORS = ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"];

export function LossesWidget() {
  const { data, isLoading } = useLossesData();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma perda no período.</p>;
  }

  const { items, totalLost, totalValue } = data;
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Perdido
          </p>
          <p className="text-2xl font-extrabold tabular-nums text-red-600">
            {totalLost}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Valor Perdido
          </p>
          <p className="text-lg font-bold tabular-nums text-red-500">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.slice(0, 8).map((item, idx) => {
          const pct = (item.count / maxCount) * 100;
          const color = BAR_COLORS[idx % BAR_COLORS.length];
          return (
            <div key={item.reason}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate text-xs font-medium text-foreground">
                  {item.reason}
                </span>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="font-bold tabular-nums">{item.count}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(item.totalValue)}
                  </span>
                </div>
              </div>
              <div className="h-4 w-full overflow-hidden rounded bg-red-50">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
