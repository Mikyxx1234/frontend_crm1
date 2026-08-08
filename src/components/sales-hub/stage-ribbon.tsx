"use client";

/**
 * StageRibbon — abas de etapa do Sales Hub.
 * Estilo “pasta”: só o topo arredondado, alinhadas à largura dos painéis abaixo.
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
        "relative flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 px-1.5 font-display font-semibold tracking-tight transition-colors sm:gap-2 sm:px-2.5",
        /* Contorno superior só — aba “sentada” na linha de base */
        "rounded-t-[var(--radius-md)] rounded-b-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
        compact
          ? "h-8 text-[12px] sm:h-9 sm:text-[12.5px]"
          : "h-9 text-[12.5px] sm:h-10 sm:text-[13px]",
        active
          ? "z-[1] bg-[var(--glass-bg)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
      )}
      style={active ? { color } : undefined}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-2 top-0 h-[2.5px] rounded-b-full"
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
        compact ? "mb-2" : "mb-3",
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 items-end gap-0.5 border-b border-[var(--glass-border-subtle)]",
          compact ? "pb-0" : "pb-0",
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
