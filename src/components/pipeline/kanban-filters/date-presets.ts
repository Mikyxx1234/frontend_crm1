/**
 * Presets de data para o painel de filtros.
 * Trabalhamos com strings ISO (YYYY-MM-DD) — o backend converte para Date.
 */

import type { DateRangeValue } from "./types";

export type DatePresetKey =
  | "any"
  | "today"
  | "yesterday"
  | "last_7"
  | "last_15"
  | "last_30"
  | "this_month"
  | "last_month"
  | "custom";

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dateRangeFromPreset(key: DatePresetKey): DateRangeValue | null {
  if (key === "any" || key === "custom") return null;
  const now = new Date();
  const today = startOfDay(now);

  if (key === "today") {
    return { from: toIso(today), to: toIso(today) };
  }
  if (key === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: toIso(y), to: toIso(y) };
  }
  if (key === "last_7") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toIso(from), to: toIso(today) };
  }
  if (key === "last_15") {
    const from = new Date(today);
    from.setDate(from.getDate() - 14);
    return { from: toIso(from), to: toIso(today) };
  }
  if (key === "last_30") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toIso(from), to: toIso(today) };
  }
  if (key === "this_month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toIso(from), to: toIso(today) };
  }
  if (key === "last_month") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toIso(from), to: toIso(to) };
  }
  return null;
}

export const DATE_PRESET_LABELS: Record<DatePresetKey, string> = {
  any: "Qualquer data",
  today: "Hoje",
  yesterday: "Ontem",
  last_7: "Últimos 7 dias",
  last_15: "Últimos 15 dias",
  last_30: "Últimos 30 dias",
  this_month: "Este mês",
  last_month: "Mês passado",
  custom: "Personalizado",
};

export function detectPreset(range: DateRangeValue | undefined): DatePresetKey {
  if (!range || (!range.from && !range.to)) return "any";
  const keys: DatePresetKey[] = [
    "today",
    "yesterday",
    "last_7",
    "last_15",
    "last_30",
    "this_month",
    "last_month",
  ];
  for (const k of keys) {
    const p = dateRangeFromPreset(k);
    if (p && p.from === range.from && p.to === range.to) return k;
  }
  return "custom";
}
