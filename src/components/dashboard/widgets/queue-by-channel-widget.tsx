"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useInboxMetrics } from "@/hooks/use-inbox-metrics";
import { cn } from "@/lib/utils";

const CHANNEL_META: Record<string, { label: string; dot: string; bar: string }> = {
  WHATSAPP: { label: "WhatsApp", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  INSTAGRAM: { label: "Instagram", dot: "bg-pink-500", bar: "bg-pink-500" },
  FACEBOOK: { label: "Facebook", dot: "bg-blue-500", bar: "bg-blue-500" },
  EMAIL: { label: "E-mail", dot: "bg-amber-500", bar: "bg-amber-500" },
  DEFAULT: { label: "Outros", dot: "bg-muted-foreground", bar: "bg-muted-foreground" },
};

export function QueueByChannelWidget() {
  const { data, isLoading } = useInboxMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const total = data?.openConversations ?? 0;
  const byChannel = data?.byChannel ?? [];

  if (byChannel.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Sem conversas em aberto no período.
      </p>
    );
  }

  const sorted = [...byChannel].sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map((c) => c.count), 1);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-3xl font-extrabold tabular-nums text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">Conversas em aberto agora</p>
      </div>
      <div className="space-y-2">
        {sorted.map((c) => {
          const meta = CHANNEL_META[c.channel] ?? CHANNEL_META.DEFAULT;
          const pct = (c.count / max) * 100;
          return (
            <div key={c.channel} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  <span className="font-semibold text-foreground">{meta.label}</span>
                </div>
                <span className="font-bold tabular-nums text-muted-foreground">{c.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn("h-full rounded-full transition-all", meta.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
