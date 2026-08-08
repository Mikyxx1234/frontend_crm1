"use client";

/**
 * StageRibbon — filtro de etapas do Sales Hub.
 * Visual alinhado aos chips/segmented controls do Inbox/CRM
 * (`PageSegmentedControl` + `Chip`), não a um funil analytics.
 */

import { cn } from "@/lib/utils";

type StageRibbonStage = {
  id: string;
  name: string;
  color: string;
  count: number;
  hasUrgent: boolean;
};

type StageRibbonProps = {
  stages: StageRibbonStage[];
  totalDeals: number;
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  /** Menos padding — com deal ativo no hub, libera altura para o chat. */
  compact?: boolean;
};

const chipBase =
  "inline-flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 overflow-hidden rounded-[var(--radius-sm)] border px-2 font-display text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

export function StageRibbon({
  stages,
  totalDeals,
  selectedStageId,
  onSelectStage,
  compact = false,
}: StageRibbonProps) {
  return (
    <div
      className={cn(
        "relative w-full shrink-0 bg-transparent",
        compact ? "px-0.5 py-1.5" : "px-0.5 py-2",
      )}
    >
      <div
        className="scrollbar-none flex w-full items-stretch gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Filtrar por etapa"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedStageId === null}
          aria-pressed={selectedStageId === null}
          onClick={() => onSelectStage(null)}
          className={cn(
            chipBase,
            compact ? "h-7" : "h-8",
            // min width only as scroll fallback on very narrow viewports
            "min-w-[4.5rem]",
            selectedStageId === null
              ? "border-[var(--brand-primary)]/25 bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-secondary)]",
          )}
        >
          <span className="min-w-0 truncate">Todos</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
              selectedStageId === null
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-black/[0.06] text-[var(--text-muted)] dark:bg-white/10",
            )}
          >
            {totalDeals}
          </span>
        </button>

        {stages.map((stage) => {
          const isActive = stage.id === selectedStageId;
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-pressed={isActive}
              onClick={() => onSelectStage(isActive ? null : stage.id)}
              className={cn(
                chipBase,
                compact ? "h-7" : "h-8",
                "min-w-[4.5rem]",
                isActive
                  ? "shadow-[var(--glass-shadow-sm)]"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-secondary)]",
              )}
              style={
                isActive
                  ? {
                      color: stage.color,
                      borderColor: `color-mix(in srgb, ${stage.color} 30%, transparent)`,
                      background: `color-mix(in srgb, ${stage.color} 12%, transparent)`,
                    }
                  : undefined
              }
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
                aria-hidden
              />
              <span className="min-w-0 truncate">{stage.name}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-black/[0.08] dark:bg-white/15"
                    : "bg-black/[0.06] text-[var(--text-muted)] dark:bg-white/10",
                )}
                style={isActive ? { color: stage.color } : undefined}
              >
                {stage.count}
              </span>
              {stage.hasUrgent && !isActive ? (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-[var(--color-danger)]"
                  aria-label="Há deals urgentes"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
