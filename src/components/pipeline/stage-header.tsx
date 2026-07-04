"use client";

import { formatCurrency } from "@/lib/utils";

type StageHeaderProps = {
  name: string;
  dealCount: number;
  totalValue: number;
  color: string;
  isIncoming?: boolean;
  conversionRate?: number;
  avgDaysInStage?: number;
  maxColumnValue?: number;
  className?: string;
  onAdd?: () => void;
};

export function StageHeader({
  name,
  dealCount,
  totalValue,
  color,
  maxColumnValue = 0,
}: StageHeaderProps) {
  const progressPct = maxColumnValue > 0 ? Math.min((totalValue / maxColumnValue) * 100, 100) : 0;
  const dotColor = color || "#64748b";

  return (
    // Surface translúcido com tokens (substituiu o gradient inline fixo
    // `#ffffff → #f8fafc` que quebrava o dark mode).
    <div className="bg-[var(--glass-bg-strong)] px-5 pb-3 pt-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="size-[10px] shrink-0 rounded-full"
            style={{ backgroundColor: dotColor, boxShadow: `0 0 0 3px ${dotColor}33` }} aria-hidden />
          <h3 className="truncate text-[15px] font-bold text-foreground">{name}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink-muted)]">
          {dealCount}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)]">
        <span className="font-bold text-blue-700 dark:text-[var(--color-brand-primary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(totalValue)}
        </span>
      </div>

      {maxColumnValue > 0 && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
          <div className="h-full rounded-full lumen-transition" style={{ width: `${progressPct}%`, backgroundColor: dotColor }} />
        </div>
      )}
    </div>
  );
}
