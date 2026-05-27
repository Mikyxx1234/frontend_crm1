"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { IconPlus } from "@tabler/icons-react"
import { DealCard, type Deal } from "./deal-card"

export type ColumnColor = "novo" | "quali" | "proposta" | "nego" | "fecha"

interface KanbanColumnProps {
  title: string
  color: ColumnColor
  count: number
  total: string
  deals: Deal[]
  onDealClick?: (dealId: string) => void
  onAddDeal?: () => void
  showAddButton?: boolean
  /**
   * Render custom de cada deal — usado pelo `/pipeline/kanban-v2`
   * para envolver cada DealCard num `<Draggable>` do
   * `@hello-pangea/dnd`. Quando ausente, comportamento default
   * (renderiza `<DealCard>` direto).
   */
  renderDeal?: (deal: Deal, index: number) => ReactNode
  /** Ref + handlers aplicados no container scrollavel dos cards (Droppable). */
  dealsContainerRef?: (el: HTMLElement | null) => void
  dealsContainerProps?: HTMLAttributes<HTMLDivElement>
  /** Slot do `provided.placeholder` do react-dnd. */
  placeholderSlot?: ReactNode
}

const colorMap: Record<ColumnColor, string> = {
  novo: "var(--col-novo)",
  quali: "var(--col-quali)",
  proposta: "var(--col-proposta)",
  nego: "var(--col-nego)",
  fecha: "var(--col-fecha)",
}

export function KanbanColumn({
  title,
  color,
  count,
  total,
  deals,
  onDealClick,
  onAddDeal,
  showAddButton = true,
  renderDeal,
  dealsContainerRef,
  dealsContainerProps,
  placeholderSlot,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-[290px] flex flex-col bg-[var(--glass-bg)] backdrop-blur-[16px] border border-[var(--glass-border-subtle)] rounded-[var(--radius-xl)] px-3 py-3.5 shadow-[var(--glass-shadow-sm)] max-h-full">
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-[18px] rounded-full" style={{ background: colorMap[color] }} />
          <span className="font-display text-[13px] font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-1.5">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 border-[1.5px] border-[var(--text-muted)] rounded-[3px] bg-transparent cursor-pointer"
            />
            {title}
          </span>
        </div>
        <span className="font-display text-[11px] font-bold text-[var(--text-muted)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] px-2.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      <div className="font-display text-[12px] font-semibold text-[var(--text-secondary)] px-1 pb-2.5 border-b border-[var(--glass-border-subtle)] mb-2.5">
        {total}
      </div>

      {showAddButton && (
        <button
          onClick={onAddDeal}
          className="w-full py-2.5 mb-2.5 bg-transparent border-[1.5px] border-dashed border-[rgba(163,163,163,0.35)] rounded-[var(--radius-lg)] font-display text-[12px] font-semibold text-[var(--text-muted)] cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--color-enterprise-bg)]"
        >
          <IconPlus size={14} />
          Adicionar negócio
        </button>
      )}

      <div
        ref={dealsContainerRef}
        {...dealsContainerProps}
        className="flex-1 overflow-y-auto flex flex-col gap-2.5 px-1 pb-1"
      >
        {deals.map((deal, index) =>
          renderDeal ? (
            renderDeal(deal, index)
          ) : (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick?.(deal.id)} />
          ),
        )}
        {placeholderSlot}
      </div>
    </div>
  )
}
