"use client";

/**
 * StageRibbon — abas de etapa do Sales Hub (estilo browser tab).
 * Ativa: fundo claro + barra superior na cor da fase + badge sólido.
 * Inativas: label + pill tintada, sem “chip” bordado.
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

function StageTab({
  label,
  count,
  color,
  active,
  compact,
  hasUrgent,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  compact: boolean;
  hasUrgent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-2 border-t-[3px] px-3 font-display text-[12px] font-semibold tracking-tight transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        compact ? "h-8 pb-0.5 pt-1" : "h-9 pb-1 pt-1.5",
        active
          ? "z-[1] -mb-px rounded-t-lg border-[var(--glass-border-subtle)] border-x border-b-0 bg-[var(--surface-elevated,#f7f4ef)] text-[var(--text-primary)] shadow-[0_1px_0_var(--surface-elevated,#f7f4ef)] dark:bg-[#ebe6df]"
          : "border-transparent text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
      )}
      style={active ? { borderTopColor: color, color } : undefined}
    >
      <span className="max-w-[11rem] truncate">{label}</span>
      <span
        className={cn(
          "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums leading-none",
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
      {hasUrgent && !active ? (
        <span
          className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--color-danger)]"
          aria-label="Há deals urgentes"
        />
      ) : null}
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
        "relative w-full shrink-0 border-b border-[var(--glass-border-subtle)]",
        compact ? "px-0.5" : "px-1",
      )}
    >
      <div
        className={cn(
          "flex w-full items-end gap-0.5 overflow-x-auto",
          "[scrollbar-width:thin] [scrollbar-color:rgba(128,128,128,0.35)_transparent]",
          "[&::-webkit-scrollbar]:h-1.5",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20",
          "[&::-webkit-scrollbar-track]:bg-transparent",
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
              hasUrgent={stage.hasUrgent}
              onClick={() => onSelectStage(isActive ? null : stage.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
