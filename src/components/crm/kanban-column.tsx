"use client"

import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import {
  IconPlus,
  IconSquare,
  IconSquareCheckFilled,
  IconSquareMinus,
} from "@tabler/icons-react"
import type { HTMLAttributes, ReactNode } from "react"
import { DealCard, type Deal } from "./deal-card"

export type ColumnColor = "novo" | "quali" | "proposta" | "nego" | "fecha"

/**
 * Estado de seleção em massa por coluna. Quando passado, a coluna
 * exibe um checkbox no header (3 estados: vazio / parcial / cheio) que
 * permite marcar/desmarcar todos os deals JÁ CARREGADOS daquele estágio.
 * Comportamento idêntico ao kanban antigo (`/old/pipeline`).
 */
export interface KanbanColumnSelection {
  allSelected: boolean
  someSelected: boolean
  selectedCount: number
  totalInColumn: number
  onToggleAll: () => void
}

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
  /** Estado de seleção em massa. Sem passar, o checkbox de "selecionar todos" não aparece. */
  selection?: KanbanColumnSelection
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
  selection,
}: KanbanColumnProps) {
  const showSelectAll = !!selection && selection.totalInColumn > 0

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
          {/* Checkbox "selecionar todos desta etapa" — estados:
              vazio / parcial (alguns) / cheio (todos). Aparece apenas
              quando a coluna tem deals e o caller fornece `selection`.
              Comportamento herdado do kanban antigo. */}
          {showSelectAll && selection ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                selection.onToggleAll()
              }}
              title={
                selection.allSelected
                  ? `Limpar seleção desta etapa (${selection.selectedCount})`
                  : selection.someSelected
                    ? `Selecionar todos os ${selection.totalInColumn} (já marcados: ${selection.selectedCount})`
                    : `Selecionar todos os ${selection.totalInColumn} desta etapa`
              }
              aria-label={
                selection.allSelected
                  ? "Limpar seleção desta etapa"
                  : "Selecionar todos desta etapa"
              }
              aria-pressed={selection.someSelected}
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                selection.someSelected
                  ? "text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
              )}
            >
              {selection.allSelected ? (
                <IconSquareCheckFilled size={16} />
              ) : selection.someSelected ? (
                <IconSquareMinus size={16} />
              ) : (
                <IconSquare size={16} />
              )}
            </button>
          ) : null}
          <span
            className="h-[18px] w-[3px] rounded-full"
            style={{ background: colorMap[color] }}
          />
          <h3 className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h3>
          <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--text-muted)]">
            {count}
          </span>
        </div>
        <TooltipGlass label="Adicionar negócio" side="top">
          <button
            type="button"
            onClick={onAddDeal}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
          >
            <IconPlus size={16} />
          </button>
        </TooltipGlass>
      </div>

      {/* Total */}
      <div className="mb-3 border-b border-[var(--glass-border-subtle)] px-1 pb-2.5 font-display text-xs font-semibold text-[var(--text-secondary)]">
        {total}
      </div>

      {/* Deals — container respeita Droppable (ref + props do react-dnd).
          min-h-0 e' OBRIGATORIO: este e' o no onde o scroll-Y precisa
          ativar. Sem min-h-0, flex-1 em flex-col calcula min-content
          (= soma dos filhos) e estoura. Com min-h-0, ele respeita o
          espaco restante e o overflow-y-auto passa a funcionar. */}
      <div
        ref={dealsContainerRef}
        {...dealsContainerProps}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
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
              "mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-[var(--glass-border)] bg-transparent py-2.5 font-display text-xs font-semibold text-[var(--text-muted)] transition-all",
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
