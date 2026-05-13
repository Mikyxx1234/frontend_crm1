"use client";

import { useDashboardMetrics } from "@/hooks/use-dashboard-data";
import { ComparisonBadge } from "../comparison-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  StickyNote,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";

const ACTIVITY_TYPES = [
  { key: "call", label: "Ligações", icon: Phone, color: "text-emerald-600 bg-emerald-50" },
  { key: "email", label: "E-mails", icon: Mail, color: "text-blue-600 bg-blue-50" },
  { key: "meeting", label: "Reuniões", icon: Calendar, color: "text-violet-600 bg-violet-50" },
  { key: "task", label: "Tarefas", icon: CheckSquare, color: "text-amber-600 bg-amber-50" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-600 bg-green-50" },
  { key: "note", label: "Notas", icon: StickyNote, color: "text-slate-600 bg-slate-50" },
] as const;

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

      <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
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
