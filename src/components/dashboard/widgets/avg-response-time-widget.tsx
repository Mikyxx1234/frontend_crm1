"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useInboxMetrics } from "@/hooks/use-inbox-metrics";
import { cn } from "@/lib/utils";

function formatMinutes(min: number) {
  if (!Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

export function AvgResponseTimeWidget() {
  const { data, isLoading } = useInboxMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const globalAvg = data?.avgFirstResponseMinutes ?? 0;
  const byAgent = data?.byAgent ?? [];
  const sorted = [...byAgent]
    .filter((a) => a.avgResponseMinutes > 0)
    .sort((a, b) => a.avgResponseMinutes - b.avgResponseMinutes)
    .slice(0, 6);

  const worst = [...byAgent]
    .filter((a) => a.avgResponseMinutes > 0)
    .sort((a, b) => b.avgResponseMinutes - a.avgResponseMinutes)[0];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-3xl font-extrabold tabular-nums text-foreground">
          {formatMinutes(globalAvg)}
        </p>
        <p className="text-xs text-muted-foreground">TMR médio da equipe</p>
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top agentes (mais rápidos)
          </p>
          {sorted.map((agent, idx) => {
            const max = sorted[sorted.length - 1]?.avgResponseMinutes || 1;
            const pct = (agent.avgResponseMinutes / max) * 100;
            const isBest = idx === 0;
            return (
              <div key={agent.userId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-foreground">
                    {agent.userName}
                  </span>
                  <span className={cn(
                    "font-bold tabular-nums",
                    isBest ? "text-emerald-600" : "text-muted-foreground",
                  )}>
                    {formatMinutes(agent.avgResponseMinutes)}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isBest ? "bg-emerald-500" : "bg-primary/60",
                    )}
                    style={{ width: `${Math.max(10, 100 - pct + 20)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Sem dados de agentes no período.
        </p>
      )}

      {worst && worst.avgResponseMinutes > globalAvg * 1.5 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <p className="text-[11px] font-medium text-amber-700">
            <span className="font-bold">{worst.userName}</span> está{" "}
            {((worst.avgResponseMinutes / globalAvg - 1) * 100).toFixed(0)}% acima da média.
          </p>
        </div>
      )}
    </div>
  );
}
