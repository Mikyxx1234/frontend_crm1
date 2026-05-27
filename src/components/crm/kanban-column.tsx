"use client"

import { cn } from "@/lib/utils"
import { IconPlus } from "@tabler/icons-react"
import type { HTMLAttributes, ReactNode } from "react"
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
  novo: "#5b6ff5",
  quali: "#10b981",
  proposta: "#f59e0b",
  nego: "#a78bfa",
  fecha: "#ef4444",
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
    <section
      aria-label={`Coluna ${title}`}
      // h-full + min-h-0 garantem que a coluna ocupe a altura total
      // do flex parent (board) sem estourar — o overflow-y-auto interno
      // do bloco de deals so funciona se aqui a altura for limitada.
      className="flex h-full min-h-0 w-[300px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3.5 pb-3 pt-4 backdrop-blur-md shadow-[var(--glass-shadow)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="h-[18px] w-[3px] rounded-full"
            style={{ background: colorMap[color] }}
          />
          <h3 className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h3>
          <span className="rounded-full border border-black/[0.06] bg-white px-2 py-0.5 font-display text-[11px] font-bold text-[var(--text-muted)]">
            {count}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddDeal}
          title="Adicionar negócio"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-black/[0.06] bg-white text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
        >
          <IconPlus size={16} />
        </button>
      </div>

      {/* Total */}
      <div className="mb-3 border-b border-[var(--glass-border-subtle)] px-1 pb-2.5 font-display text-xs font-semibold text-[var(--text-secondary)]">
        {total}
      </div>

      {/* Deals — container respeita Droppable (ref + props do react-dnd) */}
      <div
        ref={dealsContainerRef}
        {...dealsContainerProps}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
      >
        {deals.map((deal, index) =>
          renderDeal ? (
            renderDeal(deal, index)
          ) : (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick?.(deal.id)} />
          ),
        )}
        {placeholderSlot}

        {showAddButton && (
          <button
            type="button"
            onClick={onAddDeal}
            className={cn(
              "mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-black/15 bg-transparent py-2.5 font-display text-xs font-semibold text-[var(--text-muted)] transition-all",
              "hover:border-[var(--brand-primary)] hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]",
            )}
          >
            <IconPlus size={14} />
            Adicionar negócio
          </button>
        )}
      </div>
    </section>
  )
}
