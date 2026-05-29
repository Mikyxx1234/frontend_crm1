import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Texto auxiliar (ex.: "+12 hoje"). */
  hint?: ReactNode;
  tone?: "brand" | "success" | "neutral" | "violet";
  className?: string;
}

const toneClasses: Record<NonNullable<StatTileProps["tone"]>, string> = {
  brand: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  violet: "bg-[rgba(167,139,250,0.18)] text-[var(--brand-secondary)]",
  neutral: "bg-[rgba(113,128,150,0.12)] text-[var(--text-secondary)]",
};

/**
 * Tile de métrica compacto em vidro — ícone à esquerda, rótulo + valor.
 * Reutilizável em cabeçalhos de página e barras de resumo.
 */
export function StatTile({ label, value, icon, hint, tone = "brand", className }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)]",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            toneClasses[tone],
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[18px] font-bold leading-tight text-[var(--text-primary)]">
            {value}
          </span>
          {hint && <span className="font-body text-[12px] text-[var(--text-muted)]">{hint}</span>}
        </div>
      </div>
    </div>
  );
}
