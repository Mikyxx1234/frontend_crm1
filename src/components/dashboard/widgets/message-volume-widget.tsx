"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useInboxMetrics } from "@/hooks/use-inbox-metrics";

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function MessageVolumeWidget() {
  const { data, isLoading } = useInboxMetrics();

  const byDay = React.useMemo(() => data?.byDay ?? [], [data]);

  const maxTotal = React.useMemo(() => {
    if (byDay.length === 0) return 0;
    return Math.max(...byDay.map((d) => d.inbound + d.outbound), 1);
  }, [byDay]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const inbound = data?.inboundMessages ?? 0;
  const outbound = data?.outboundMessages ?? 0;
  const total = inbound + outbound;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold tabular-nums text-foreground">
            {formatCompact(total)}
          </p>
          <p className="text-xs text-muted-foreground">Mensagens no período</p>
        </div>
        <div className="flex gap-3 text-[11px]">
          <div className="text-right">
            <p className="font-bold tabular-nums text-cyan-600">
              {formatCompact(inbound)}
            </p>
            <p className="uppercase tracking-wider text-muted-foreground">in</p>
          </div>
          <div className="text-right">
            <p className="font-bold tabular-nums text-primary">
              {formatCompact(outbound)}
            </p>
            <p className="uppercase tracking-wider text-muted-foreground">out</p>
          </div>
        </div>
      </div>

      {byDay.length > 0 ? (
        <div>
          <div className="flex h-24 items-end gap-1">
            {byDay.map((d) => {
              const sum = d.inbound + d.outbound;
              const inPct = sum > 0 ? (d.inbound / maxTotal) * 100 : 0;
              const outPct = sum > 0 ? (d.outbound / maxTotal) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="group relative flex flex-1 flex-col justify-end gap-0.5"
                  title={`${new Date(d.date).toLocaleDateString("pt-BR")} · ${sum} msgs`}
                >
                  <div
                    className="rounded-t-sm bg-primary/70 transition-all group-hover:bg-primary"
                    style={{ height: `${outPct}%`, minHeight: outPct > 0 ? 2 : 0 }}
                  />
                  <div
                    className="rounded-sm bg-cyan-500/70 transition-all group-hover:bg-cyan-500"
                    style={{ height: `${inPct}%`, minHeight: inPct > 0 ? 2 : 0 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {new Date(byDay[0].date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
            <span>
              {new Date(byDay[byDay.length - 1].date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Sem mensagens no período.
        </p>
      )}
    </div>
  );
}
