"use client";

/**
 * StageRibbon — abas de etapa do Sales Hub.
 * Contorno arredondado (mesmo idioma dos painéis) + abas pill.
 * Largura total com flex-1 — achatam quando há mais etapas.
 */

import { cn } from "@/lib/utils";

type StageRibbonStage = {
  id: string;
  name: string;
  color: string;
  count: number;
};

type StageRibbonProps = {
  stages: StageRibbonStage[];
  totalDeals: number;
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  /** Menos padding — com deal ativo no hub, libera altura para o chat. */
  compact?: boolean;
};

function StageTab({
  label,
  count,
  color,
  active,
  compact,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-1.5 font-display font-semibold tracking-tight transition-colors sm:gap-2 sm:px-2.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        compact
          ? "h-8 text-[12px] sm:h-9 sm:text-[12.5px]"
          : "h-9 text-[12.5px] sm:h-10 sm:text-[13px]",
        active
          ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] ring-1 ring-[var(--glass-border-subtle)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
      )}
      style={active ? { color } : undefined}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-2 top-1 h-[2.5px] rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums leading-none sm:h-[22px] sm:min-w-[22px] sm:text-[11px]",
          !active && "text-[var(--text-primary)]",
        )}
        style={
          active
            ? { backgroundColor: color, color: "#fff" }
            : {
                backgroundColor: `color-mix(in srgb, ${color} 28%, #ffffff)`,
                color: `color-mix(in srgb, ${color} 75%, #1a1a1a)`,
              }
        }
      >
        {count}
      </span>
    </button>
  );
}

export function StageRibbon({
  stages,
  totalDeals,
  selectedStageId,
  onSelectStage,
  compact = false,
}: StageRibbonProps) {
  const allActive = selectedStageId === null;
  const allColor = "var(--brand-primary, #5b6ff5)";

  return (
    <div
      className={cn(
        "relative w-full min-w-0 shrink-0",
        compact ? "mb-2 px-0" : "mb-3 px-0.5",
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-0.5 rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
          compact ? "p-1" : "p-1.5",
        )}
        role="tablist"
        aria-label="Filtrar por etapa"
      >
        <StageTab
          label="Todos"
          count={totalDeals}
          color={allColor}
          active={allActive}
          compact={compact}
          onClick={() => onSelectStage(null)}
        />

        {stages.map((stage) => {
          const isActive = stage.id === selectedStageId;
          return (
            <StageTab
              key={stage.id}
              label={stage.name}
              count={stage.count}
              color={stage.color || "#64748b"}
              active={isActive}
              compact={compact}
              onClick={() => onSelectStage(isActive ? null : stage.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
