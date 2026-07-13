"use client";

import { cn } from "@/lib/utils";

/**
 * ScopeLegend — legenda de escopos (dot colorido + rótulo), renderizada uma
 * única vez no topo de cada matriz. As cores dos dots são passadas como
 * string CSS (token `var(--x)` ou hex neutro), espelhando o padrão já usado
 * no editor de grupos.
 */

export interface ScopeLegendItem {
  /** Cor do dot: token (`var(--brand-primary)`) ou hex. */
  dot: string;
  label: string;
}

export function ScopeLegend({
  items,
  className,
}: {
  items: readonly ScopeLegendItem[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3.5", className)}>
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold text-[var(--text-muted)]"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: it.dot }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ── Presets alinhados às escalas do ScopeSelector ────────────────────── */

export const MODULE_SCOPE_LEGEND: readonly ScopeLegendItem[] = [
  { dot: "#cbd5e1", label: "Nenhum" },
  { dot: "var(--brand-primary-light)", label: "Ver" },
  { dot: "var(--brand-primary)", label: "Operar / Total" },
];

export const OWNER_SCOPE_LEGEND: readonly ScopeLegendItem[] = [
  { dot: "#cbd5e1", label: "Negado" },
  { dot: "var(--color-warn)", label: "Apenas responsável (próprios registros)" },
  { dot: "var(--brand-primary-light)", label: "Equipe (em breve)" },
  { dot: "var(--brand-primary)", label: "Todos" },
];

export const CHANNEL_SCOPE_LEGEND: readonly ScopeLegendItem[] = [
  { dot: "#cbd5e1", label: "Negado" },
  { dot: "var(--brand-primary-light)", label: "Ver / Responder" },
  { dot: "var(--brand-primary)", label: "Total (administrar)" },
];
