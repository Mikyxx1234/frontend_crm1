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
  /**
   * Quando `false`, o checkbox "selecionar todos" do header NÃO é
   * renderizado — alinhando com o "modo seleção" global do kanban.
   * Default: `true` (mantém compat com kanban antigo).
   */
  enabled?: boolean
}

interface KanbanColumnProps {
  title: string
  color: ColumnColor
  /**
   * Cor hex opcional (ex.: `#ec4899`) do backend `stage.color`.
   * Quando fornecida, sobrepõe o preset de `color` na strip do topo
   * e no badge de contagem — devolve identidade por estágio em vez
   * de forçar a paleta fixa de 5 slugs.
   */
  stageColor?: string
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
  /** Formulário inline de criação de deal — renderizado acima do botão "Adicionar negócio". */
  addFormSlot?: ReactNode
}

const colorMap: Record<ColumnColor, string> = {
  novo: "var(--col-novo)",
  quali: "var(--col-quali)",
  proposta: "var(--col-proposta)",
  nego: "var(--col-nego)",
  fecha: "var(--col-fecha)",
}

const colorBgMap: Record<ColumnColor, string> = {
  novo:     "color-mix(in srgb, var(--col-novo) 10%, transparent)",
  quali:    "color-mix(in srgb, var(--col-quali) 10%, transparent)",
  proposta: "color-mix(in srgb, var(--col-proposta) 10%, transparent)",
  nego:     "color-mix(in srgb, var(--col-nego) 10%, transparent)",
  fecha:    "color-mix(in srgb, var(--col-fecha) 10%, transparent)",
}

export function KanbanColumn({
  title,
  color,
  stageColor,
  count,
  total,
  deals,
  onDealClick,
  onAddDeal,
  renderDeal,
  dealsContainerRef,
  dealsContainerProps,
  placeholderSlot,
  selection,
  addFormSlot,
}: KanbanColumnProps) {
  const showSelectAll =
    !!selection &&
    selection.totalInColumn > 0 &&
    selection.enabled !== false

  // Cor efetiva do estágio: hex do backend > preset. Badge usa
  // color-mix inline para gerar background 15% da cor do estágio
  // (opacidade um pouco maior que o preset 10% p/ melhorar contraste
  // sobre lavanda do mesh).
  const effectiveColor = stageColor ?? colorMap[color]
  const effectiveBg = stageColor
    ? `color-mix(in srgb, ${stageColor} 15%, transparent)`
    : colorBgMap[color]

  return (
    <section
      aria-label={`Coluna ${title}`}
      className="kanban-col flex w-[300px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white/60 pb-2"
    >

      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <div className="flex items-center gap-2">
          {/* Checkbox "selecionar todos desta etapa" */}
          {showSelectAll && selection ? (
            <TooltipGlass
              label={
                selection.allSelected
                  ? `Limpar seleção desta etapa (${selection.selectedCount})`
                  : selection.someSelected
                    ? `Selecionar todos os ${selection.totalInColumn} (já marcados: ${selection.selectedCount})`
                    : `Selecionar todos os ${selection.totalInColumn} desta etapa`
              }
              side="top"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  selection.onToggleAll()
                }}
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
            </TooltipGlass>
          ) : null}

          <h3 className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h3>

          {/* Badge de contagem — círculo colorido simples, sem background */}
          <span
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 font-display text-[11px] font-bold text-white"
            style={{ background: effectiveColor }}
          >
            {count}
          </span>
        </div>

        <TooltipGlass label="Adicionar negócio" side="top">
          <button
            type="button"
            onClick={onAddDeal}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] transition-colors hover:text-white"
            style={
              {
                "--hover-bg": effectiveColor,
              } as React.CSSProperties
            }
            onMouseEnter={(e) => {
              const btn = e.currentTarget
              btn.style.background = effectiveColor
              btn.style.borderColor = effectiveColor
              btn.style.color = "#fff"
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget
              btn.style.background = ""
              btn.style.borderColor = ""
              btn.style.color = ""
            }}
          >
            <IconPlus size={15} />
          </button>
        </TooltipGlass>
      </div>

      {/* Total */}
      <div className="mb-1.5 px-3 pb-1 font-display text-[11px] font-medium text-[var(--text-muted)]">
        {total}
      </div>

      {/* Padding lateral dos deals */}
      <div className="flex min-h-0 flex-1 flex-col px-2">

      {/* Deals — container respeita Droppable (ref + props do react-dnd).
          min-h-0 e' OBRIGATORIO: este e' o no onde o scroll-Y precisa
          ativar. Sem min-h-0, flex-1 em flex-col calcula min-content
          (= soma dos filhos) e estoura. Com min-h-0, ele respeita o
          espaco restante e o overflow-y-auto passa a funcionar. */}
      <div
        ref={dealsContainerRef}
        {...dealsContainerProps}
        className="kanban-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
      >
        {/* Formulário inline de criação — renderizado no TOPO da fase,
            acima dos cards. Disparado pelo "+" no header da coluna. */}
        {addFormSlot}

        {deals.map((deal, index) =>
          renderDeal ? (
            renderDeal(deal, index)
          ) : (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick?.(deal.id)} />
          ),
        )}
        {placeholderSlot}
      </div>
      </div>{/* fim do padding lateral */}
    </section>
  )
}
// DEBUG ONLY
