"use client";

import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/// Cabecalho de dia ("Hoje" / "Ontem" / "quinta-feira, 5 de junho").
/// Compartilhado entre o feed global e timelines de deal/contato.
export function FeedDayHeader({ isoDate }: { isoDate: string }) {
  const d = parseISO(isoDate);
  const label = isToday(d)
    ? "Hoje"
    : isYesterday(d)
      ? "Ontem"
      : format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </h3>
  );
}

/// Agrupa eventos por dia (yyyy-MM-dd), retornando entries ordenadas desc.
export function groupFeedByDay<T extends { occurredAt: string }>(
  events: T[],
): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const ev of events) {
    const key = format(parseISO(ev.occurredAt), "yyyy-MM-dd");
    const arr = map.get(key);
    if (arr) arr.push(ev);
    else map.set(key, [ev]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
