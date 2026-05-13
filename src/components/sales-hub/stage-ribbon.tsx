"use client";

/**
 * StageRibbon — Tabs horizontais (DNA Chat).
 * ────────────────────────────────────────────────────────────
 * Refatorado para alinhar com o mesmo padrão do segmented
 * picker do composer do Chat (`Mensagem / Nota`):
 *
 *   • Linha branca com border-b slate-100 (= sub-header do chat).
 *   • Cada etapa é uma tab plana, sem chevron clip-path, sem cor
 *     de marca, sem badge colorida. Ativa ganha apenas:
 *       - texto slate-900 font-semibold (vs slate-500 inativa)
 *       - underline azul de 2px com layoutId animado (Framer)
 *   • "Todos" idem — mesmo formato, sem destaque diferenciado.
 *   • Counts em pílulas soft (bg-slate-100 / bg-blue-50 ativo)
 *     sem borda, sem caps uppercase agressivo.
 *   • Scroll horizontal nativo com scrollbar fina.
 *
 * Tipografia segue o DNA: nome 13px medium, badge 11px tabular.
 * Removido o tracking-widest font-black 11px que destoava do
 * resto da app.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SUBTLE_SPRING } from "@/lib/design-system";

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
};

function StageTab({
  active,
  label,
  count,
  hasUrgent,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  hasUrgent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // Altura e padding maiores pra o ribbon ter presença de
        // header de verdade (antes era 48px/13px, quase invisível).
        // Agora: 56px de altura, texto 14px semi-bold, gap generoso.
        "relative flex h-14 shrink-0 items-center gap-2.5 px-5 text-[14px] tracking-tight transition-colors focus:outline-none",
        active
          ? "font-bold text-slate-900"
          : "font-semibold text-slate-500 hover:text-slate-800",
      )}
    >
      {hasUrgent && (
        <span
          className="size-2 rounded-full bg-red-500 ring-2 ring-red-100"
          aria-label="Etapa com urgência"
        />
      )}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          // Badge maior e mais legível — era 11px soft, agora é uma
          // pílula sólida 12px com contraste real. A contagem é a
          // métrica mais útil do ribbon, precisa saltar.
          "inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums transition-colors",
          active
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
        )}
      >
        {count}
      </span>
      {active && (
        <motion.span
          layoutId="stage-ribbon-underline"
          transition={SUBTLE_SPRING}
          className="pointer-events-none absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-blue-600"
          aria-hidden
        />
      )}
    </button>
  );
}

export function StageRibbon({
  stages,
  totalDeals,
  selectedStageId,
  onSelectStage,
}: StageRibbonProps) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="scrollbar-thin flex items-stretch overflow-x-auto px-2">
        <StageTab
          active={selectedStageId == null}
          label="Todos"
          count={totalDeals}
          onClick={() => onSelectStage(null)}
        />
        {stages.map((stage) => {
          const isActive = stage.id === selectedStageId;
          return (
            <StageTab
              key={stage.id}
              active={isActive}
              label={stage.name}
              count={stage.count}
              hasUrgent={stage.hasUrgent}
              onClick={() => onSelectStage(isActive ? null : stage.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
