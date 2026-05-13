"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Calendar,
  CheckSquare,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ActivityType =
  | "CALL" | "EMAIL" | "MEETING" | "TASK" | "NOTE" | "WHATSAPP" | "OTHER";
type U = { name: string | null };
type TimelineItem =
  | {
      kind: "activity";
      at: string;
      activity: { type: ActivityType; title: string; description: string | null; user: U };
    }
  | { kind: "note"; at: string; note: { content: string; user: U } }
  | {
      kind: "deal";
      at: string;
      event: "created" | "updated" | "closed";
      deal: { title: string; value: string; stage: { name: string; color: string | null }; owner?: U | null };
    };

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  TASK: CheckSquare,
  NOTE: FileText,
  WHATSAPP: MessageSquare,
  OTHER: FileText,
};
const DEAL_LABEL = { created: "Negócio criado", updated: "Negócio atualizado", closed: "Negócio fechado" };

function formatDayHeader(d: Date) {
  return isToday(d) ? "Hoje" : isYesterday(d) ? "Ontem" : format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function groupByDay(items: TimelineItem[]) {
  const m = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const day = format(parseISO(item.at), "yyyy-MM-dd");
    const cur = m.get(day);
    if (cur) cur.push(item);
    else m.set(day, [item]);
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function itemVisuals(item: TimelineItem) {
  if (item.kind === "activity") {
    const a = item.activity;
    return {
      Icon: ACTIVITY_ICONS[a.type] ?? FileText,
      ringClass: "ring-emerald-500/30 text-emerald-700",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
      title: a.title,
      subtitle: a.description,
      userName: a.user.name,
      stageDot: null as string | null,
    };
  }
  if (item.kind === "note") {
    return {
      Icon: StickyNote,
      ringClass: "ring-amber-500/30 text-amber-800",
      bgClass: "bg-amber-50 dark:bg-amber-950/40",
      title: "Anotação",
      subtitle: item.note.content,
      userName: item.note.user.name,
      stageDot: null as string | null,
    };
  }
  const d = item.deal;
  return {
    Icon: Briefcase,
    ringClass: "ring-blue-500/30 text-blue-800",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
    title: `${DEAL_LABEL[item.event]}: ${d.title}`,
    subtitle: `${d.value} · ${d.stage.name}`,
    userName: d.owner?.name ?? null,
    stageDot: d.stage.color,
  };
}

export function ContactTimeline({ contactId }: { contactId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["contact-timeline", contactId],
    enabled: Boolean(contactId),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/contacts/${contactId}/timeline`));
      if (!res.ok) throw new Error("Falha ao carregar timeline");
      return (await res.json()) as TimelineItem[];
    },
  });
  const groups = useMemo(() => (data?.length ? groupByDay(data) : []), [data]);

  if (isLoading) {
    return (
      <div className="space-y-5 pl-2">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-4 w-[75%] max-w-xs" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar o histórico.</p>;
  }
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>;
  }
  return (
    <div className="relative">
      <div className="absolute top-2 bottom-2 left-[17px] w-px bg-border" aria-hidden />
      <div className="space-y-8">
        {groups.map(([dayKey, dayItems]) => (
          <div key={dayKey}>
            <h3 className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {formatDayHeader(parseISO(dayItems[0].at))}
            </h3>
            <ul>
              {dayItems.map((item, idx) => {
                const v = itemVisuals(item);
                const Icon = v.Icon;
                const at = parseISO(item.at);
                const isLast = idx === dayItems.length - 1;
                return (
                  <li key={`${item.kind}-${item.at}-${idx}`} className="relative flex gap-3 pb-6 last:pb-0">
                    <div className="relative z-1 flex shrink-0 flex-col items-center">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background",
                          v.bgClass,
                          v.ringClass
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      {!isLast ? (
                        <span
                          className="absolute top-9 left-1/2 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 bg-border"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium">{v.title}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {format(at, "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {v.stageDot ? (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.stageDot }} />
                          {v.subtitle}
                        </span>
                      ) : v.subtitle ? (
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{v.subtitle}</p>
                      ) : null}
                      {v.userName ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">por {v.userName}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
