"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useInboxMetrics } from "@/hooks/use-inbox-metrics";
import { cn } from "@/lib/utils";

/**
 * Meta de SLA de primeira resposta em minutos. Quando tivermos settings
 * persistidos por organização, esse número passa a vir do banco. Por ora,
 * seguimos o mesmo default usado na aba SAC do Monitor.
 */
const SLA_MINUTES = 5;

export function SlaBreachesWidget() {
  const { data, isLoading } = useInboxMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  const avg = data?.avgFirstResponseMinutes ?? 0;
  const withinSla = avg > 0 && avg <= SLA_MINUTES;
  const diff = avg - SLA_MINUTES;

  const hours = Math.floor(avg / 60);
  const minutes = Math.floor(avg % 60);
  const formatted = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className={cn(
          "text-4xl font-extrabold tabular-nums",
          withinSla ? "text-emerald-600" : "text-rose-600",
        )}>
          {avg > 0 ? formatted : "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Tempo médio de 1ª resposta</p>
      </div>

      <div className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2.5",
        withinSla
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-rose-500/30 bg-rose-500/5",
      )}>
        {withinSla ? (
          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        ) : (
          <AlertTriangle className="size-5 shrink-0 text-rose-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">
            {withinSla ? "Dentro da meta" : "Fora da meta"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Meta: ≤ {SLA_MINUTES}min
            {avg > 0 && !withinSla && (
              <> · {diff > 0 ? "+" : ""}{diff.toFixed(0)}min acima</>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Em aberto
          </p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {data?.openConversations ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Resolvidas
          </p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {data?.resolvedConversations ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
