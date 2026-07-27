"use client";

import * as React from "react";
import { startOfDay, subDays } from "date-fns";

import {
  DateRangePicker,
  type DateRange,
} from "@/components/crm/date-range-picker";
import { cn } from "@/lib/utils";

export type SystemUsagePreset = "7d" | "30d" | "90d" | "custom";

export interface SystemUsagePeriodValue {
  preset: SystemUsagePreset;
  range: DateRange;
}

const PRESETS: { id: Exclude<SystemUsagePreset, "custom">; label: string; days: number }[] = [
  { id: "7d", label: "7 dias", days: 7 },
  { id: "30d", label: "30 dias", days: 30 },
  { id: "90d", label: "90 dias", days: 90 },
];

export function defaultSystemUsagePeriod(): SystemUsagePeriodValue {
  return {
    preset: "30d",
    range: rangeFromDays(30),
  };
}

export function rangeFromDays(days: number): DateRange {
  return {
    from: startOfDay(subDays(new Date(), days - 1)),
    to: startOfDay(new Date()),
  };
}

/**
 * Filtro de período do "Uso do sistema" — 3 presets fixos + intervalo
 * customizado. Estilo alinhado ao PageHeader.center dos outros logs.
 */
export function SystemUsagePeriodFilter({
  value,
  onChange,
}: {
  value: SystemUsagePeriodValue;
  onChange: (v: SystemUsagePeriodValue) => void;
}) {
  function setPreset(preset: Exclude<SystemUsagePreset, "custom">, days: number) {
    onChange({ preset, range: rangeFromDays(days) });
  }
  function setCustom(range: DateRange) {
    onChange({ preset: "custom", range });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1 shadow-[var(--glass-shadow-sm)]">
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id, p.days)}
              className={cn(
                "rounded-full px-3 py-1 font-display text-[12px] font-bold transition-colors",
                active
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]",
              )}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-[220px]">
        <DateRangePicker
          value={value.range}
          onChange={setCustom}
          placeholder="Período personalizado"
        />
      </div>

      {value.preset === "custom" && (
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--brand-primary)]">
          Custom
        </span>
      )}
    </div>
  );
}
