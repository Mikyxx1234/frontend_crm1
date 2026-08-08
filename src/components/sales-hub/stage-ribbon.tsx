"use client";

/**
 * StageRibbon — abas de etapa do Sales Hub.
 * Flutuam acima dos containers (não “coladas”); linha base contínua abaixo.
 * Largura total com flex-1 — achatam quando há mais etapas.
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
      title={label}
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 px-1.5 font-display font-semibold tracking-tight transition-colors sm:gap-2 sm:px-2.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        compact
          ? "h-9 text-[12px] sm:text-[12.5px]"
          : "h-10 text-[12.5px] sm:h-11 sm:text-[13px]",
        active
          ? "rounded-t-md bg-[var(--glass-bg-overlay)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
      )}
      style={active ? { color } : undefined}
    >
      {/* Indicador ativo no topo — não cola no painel de baixo */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-1 top-0 h-[3px] rounded-b-full transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundColor: color }}
      />
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
        "relative w-full min-w-0 shrink-0",
        // Espaço abaixo da linha base → descola dos containers do split
        compact ? "mb-2 px-0" : "mb-3 px-0.5",
      )}
    >
      <div
        className="flex w-full min-w-0 items-stretch gap-0.5"
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
      {/* Linha base sob todas as abas */}
      <div
        className="mt-0.5 h-px w-full bg-[var(--glass-border)]"
        aria-hidden
      />
    </div>
  );
}
