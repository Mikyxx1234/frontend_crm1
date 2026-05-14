"use client";

/**
 * StageRibbon — Funil no Pipeline Ágil: segmentos em chevron (clip-path)
 * apontando para o próximo. "Todos" = primeiro segmento sem recorte à esquerda.
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

/** Primeiro segmento: borda reta à esquerda. */
const CLIP_FIRST =
  "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)";
/** Demais: entalhe à esquerda (encaixa no chevron anterior). */
const CLIP_CHEVRON =
  "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)";

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
        "relative shrink-0 border-b border-border bg-white",
        compact ? "shadow-none" : "shadow-[0_1px_0_rgba(15,23,42,0.03)]",
      )}
    >
      <div
        className={cn(
          "scrollbar-none flex items-stretch overflow-x-scroll gap-[2px]",
          compact ? "px-1.5 py-1 pr-8" : "px-2 py-2 pr-8",
        )}
      >
        <button
          type="button"
          aria-pressed={selectedStageId === null}
          onClick={() => onSelectStage(null)}
          style={{
            clipPath: CLIP_FIRST,
            minWidth: compact ? 72 : 90,
          }}
          className={cn(
            "relative flex shrink-0 flex-col items-center justify-center px-5 text-[11.5px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
            compact ? "h-8 min-h-8" : "h-9 min-h-9",
            selectedStageId === null
              ? "bg-primary text-[var(--color-primary-foreground)]"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
        >
          <span>Todos</span>
          <span
            className={cn(
              "mt-px text-[9px] font-bold tabular-nums",
              selectedStageId === null
                ? "text-[var(--color-primary-foreground)]/80"
                : "text-slate-400",
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
              aria-pressed={isActive}
              onClick={() => onSelectStage(isActive ? null : stage.id)}
              style={{
                clipPath: CLIP_CHEVRON,
                minWidth: compact ? 72 : 90,
                backgroundColor: isActive ? stage.color : `${stage.color}22`,
                color: isActive ? "#ffffff" : stage.color,
              }}
              className={cn(
                "relative flex shrink-0 flex-col items-center justify-center px-5 text-[11.5px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2",
                compact ? "h-8 min-h-8" : "h-9 min-h-9",
                isActive ? "text-white" : "text-slate-500 hover:opacity-90",
              )}
            >
              <span className="max-w-[160px] truncate">{stage.name}</span>
              <span className="mt-px text-[9px] font-bold tabular-nums opacity-75">
                {stage.count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
