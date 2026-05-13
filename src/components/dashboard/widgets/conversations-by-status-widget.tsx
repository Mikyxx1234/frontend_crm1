"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useInboxMetrics } from "@/hooks/use-inbox-metrics";

type StatusRow = {
  label: string;
  count: number;
  tone: string;
  dot: string;
};

export function ConversationsByStatusWidget() {
  const { data, isLoading } = useInboxMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const total = data?.totalConversations ?? 0;
  const open = data?.openConversations ?? 0;
  const resolved = data?.resolvedConversations ?? 0;
  const other = Math.max(0, total - open - resolved);

  const rows: StatusRow[] = [
    { label: "Em aberto", count: open, tone: "text-amber-600", dot: "bg-amber-500" },
    { label: "Resolvidas", count: resolved, tone: "text-emerald-600", dot: "bg-emerald-500" },
    { label: "Outras", count: other, tone: "text-muted-foreground", dot: "bg-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-3xl font-extrabold tabular-nums text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">Conversas no período</p>
      </div>

      {total > 0 ? (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/50">
            {rows.map((r) =>
              r.count > 0 ? (
                <div
                  key={r.label}
                  className={r.dot}
                  style={{ width: `${(r.count / total) * 100}%` }}
                  title={`${r.label}: ${r.count}`}
                />
              ) : null,
            )}
          </div>
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${r.dot}`} />
                  <span className="font-medium text-foreground">{r.label}</span>
                </div>
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span className={`font-bold ${r.tone}`}>{r.count}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {total > 0 ? ((r.count / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Sem conversas no período.
        </p>
      )}
    </div>
  );
}
