"use client";

import { useDashboardMetrics } from "@/hooks/use-dashboard-data";
import { ComparisonBadge } from "../comparison-badge";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivitiesWidget() {
  const { current, previous, isLoading, hasComparison } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const totalDeals = current?.totalDeals ?? 0;
  const newContacts = current?.newContacts ?? 0;
  const conversations = current?.activeConversations ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Novos Contatos
          </p>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">
            {newContacts}
          </p>
          {hasComparison && previous && (
            <ComparisonBadge current={newContacts} previous={previous.newContacts} />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Conversas Ativas
          </p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {conversations}
          </p>
          {hasComparison && previous && (
            <ComparisonBadge current={conversations} previous={previous.activeConversations} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Negócios no Período
        </p>
        <p className="text-lg font-bold tabular-nums text-foreground">{totalDeals}</p>
        {hasComparison && previous && (
          <ComparisonBadge current={totalDeals} previous={previous.totalDeals} />
        )}
      </div>
    </div>
  );
}
