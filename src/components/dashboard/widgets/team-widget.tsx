"use client";

import { useTeamData } from "@/hooks/use-dashboard-data";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { Trophy, TrendingDown } from "lucide-react";

export function TeamWidget() {
  const { data: team, isLoading } = useTeamData();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!team || team.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados da equipe no período.</p>;
  }

  const sorted = [...team]
    .filter((u) => u.dealsWon > 0 || u.dealsLost > 0 || u.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum membro com atividade no período.</p>;
  }

  const topRevenue = sorted[0]?.revenue ?? 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 text-left">
            <th className="pb-2 pr-3 font-semibold text-muted-foreground">#</th>
            <th className="pb-2 pr-3 font-semibold text-muted-foreground">Agente</th>
            <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Ganhos</th>
            <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Perdidos</th>
            <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Receita</th>
            <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Ciclo</th>
            <th className="pb-2 font-semibold text-muted-foreground">Desempenho</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((u, idx) => {
            const revPct = topRevenue > 0 ? (u.revenue / topRevenue) * 100 : 0;
            const total = u.dealsWon + u.dealsLost;
            const convRate = total > 0 ? (u.dealsWon / total) * 100 : 0;

            return (
              <tr key={u.userId} className="border-b border-border/20">
                <td className="py-2.5 pr-3">
                  {idx === 0 ? (
                    <Trophy className="size-4 text-amber-500" />
                  ) : (
                    <span className="font-bold text-muted-foreground">{idx + 1}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  <p className="font-semibold text-foreground">{u.userName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Conv. {convRate.toFixed(0)}%
                  </p>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-emerald-600">
                  {u.dealsWon}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-red-500">
                  {u.dealsLost}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums font-bold">
                  {formatCurrency(u.revenue)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                  {u.avgCycleTime > 0 ? `${u.avgCycleTime.toFixed(1)}d` : "—"}
                </td>
                <td className="py-2.5">
                  <div className="h-2.5 w-full min-w-16 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max(revPct, 3)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
