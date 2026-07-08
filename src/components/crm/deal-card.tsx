"use client"

import { cn } from "@/lib/utils"
import { IconCircleX, IconClock, IconMessage } from "@tabler/icons-react"
import { Chip } from "./chip"

export type AvatarColor =
  | "green"
  | "blue"
  | "orange"
  | "purple"
  | "pink"
  | "coral"
  | "teal"
  | "mint"
  | "gray"
export type TagType = "hot" | "warm" | "cold" | "vip" | "partner" | "ref"

export interface Deal {
  id: string
  name: string
  subtitle: string
  initials: string
  avatarColor: AvatarColor
  online?: boolean
  dealNumber: string
  date: string
  message?: {
    text: string
    time: string
  }
  timeAgo?: string
  tags?: { label: string; type: TagType }[]
  owner: {
    initials: string
    name: string
    avatarColor: AvatarColor
  }
  /** Motivo da perda — exibido em destaque quando o deal está perdido. */
  lostReason?: string
}

interface DealCardProps {
  deal: Deal
  onClick?: () => void
  /**
   * Slot opcional que substitui o bloco padrao de tags
   * (tags estaticas + botao "+"). Usado pelo
   * `/pipeline/kanban-v2` para injetar o `TagsPopover` real.
   */
  tagsSlot?: React.ReactNode
  /**
   * Slot opcional que substitui o Chip do responsavel no rodape
   * do card — permite plugar o `AssigneePopover` no kanban-v2.
   */
  ownerSlot?: React.ReactNode
  /**
   * Slot opcional renderizado no canto direito do rodape — usado para
   * o menu de "mover de fase" (alternativa ao drag-and-drop).
   */
  moveMenuSlot?: React.ReactNode
  /**
   * Seleção em massa. Quando `onToggleSelect` é passado, o card exibe um
   * checkbox no canto superior esquerdo (visível em hover ou quando
   * selecionado) e ganha um anel de destaque ao ser selecionado.
   */
  isSelected?: boolean
  onToggleSelect?: () => void
  /**
   * Modo seleção global. Quando `true`, o checkbox fica permanentemente
   * visível em todos os cards e o conteúdo desloca para a direita para
   * abrir espaço (estilo Kommo).
   */
  selectionMode?: boolean
}

const tagStyles: Record<TagType, string> = {
  hot: "bg-[rgba(239,68,68,0.12)] text-[var(--color-danger-text)] border-[rgba(239,68,68,0.20)]",
  warm: "bg-[var(--color-lead-bg)] text-[var(--color-warning-text)] border-[rgba(245,158,11,0.25)]",
  cold: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] border-[rgba(91,111,245,0.25)]",
  vip: "bg-[rgba(167,139,250,0.15)] text-violet-800 border-[rgba(167,139,250,0.25)]",
  partner: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[rgba(16,185,129,0.25)]",
  ref: "bg-[rgba(244,114,182,0.12)] text-pink-700 border-[rgba(244,114,182,0.25)]",
}

export function DealCard({ deal, onClick, tagsSlot, ownerSlot, moveMenuSlot, isSelected, onToggleSelect, selectionMode }: DealCardProps) {
  // O checkbox SÓ aparece quando o "modo seleção" global está ativo
  // (acionado pelo kebab "Selecionar..."). Removemos o antigo
  // comportamento de "aparecer no hover" para que entrada e saída
  // do modo sejam explícitas e previsíveis.
  const showCheckbox = !!selectionMode && !!onToggleSelect
  return (
    <article
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-white py-1.5 shadow-[var(--glass-shadow-sm)] transition-all",
        "hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]",
        isSelected && "border-[var(--brand-primary)]/50 ring-2 ring-[var(--brand-primary)]/40",
        "active:cursor-grabbing",
        // Em modo seleção o conteúdo desloca para a direita para abrir
        // espaço ao checkbox fixo no canto esquerdo.
        showCheckbox ? "pl-9 pr-3" : "px-3",
      )}
    >
      {/* Checkbox de seleção em massa — só renderizado quando o
          "modo seleção" está ativo. stopPropagation em vários eventos
          evita abrir o deal ou iniciar o drag. */}
      {showCheckbox ? (
        <label
          className="absolute left-2 top-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-sm backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--brand-primary)]"
          />
        </label>
      ) : null}

      {/* Top row: avatar + name + dealNumber/date */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            `av-${deal.avatarColor}`,
            "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[10px] font-bold text-white",
          )}
        >
          {deal.initials}
          {deal.online !== undefined && (
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[1.5px] border-white"
              style={{ background: deal.online ? "var(--color-online)" : "var(--color-offline)" }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
            {deal.name}
          </div>
          <div className="mt-px truncate text-[11px] text-[var(--text-muted)]">
            {deal.subtitle}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-enterprise-bg)] px-1.5 py-px font-display text-[10px] font-bold text-[var(--brand-primary)]">
            {deal.dealNumber}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">{deal.date}</span>
        </div>
      </div>

      {/* Message preview */}
      {deal.message && (
        <div className="mt-1 flex items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 text-[11.5px] italic leading-[1.35] text-[var(--text-secondary)]">
          {/* Ícone de conversa com borda azul — mesmo do card de
              conversa do inbox, para padronizar a leitura visual. */}
          <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[rgba(91,111,245,0.40)] text-[var(--brand-primary)]">
            <IconMessage size={9} />
          </span>
          <span className="line-clamp-2 flex-1 overflow-hidden">{deal.message.text}</span>
          <span className="shrink-0 text-[10px] not-italic text-[var(--text-muted)]">
            {deal.message.time}
          </span>
        </div>
      )}

      {!deal.message && deal.timeAgo && (
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <IconClock size={11} />
          {deal.timeAgo}
        </div>
      )}

      {/* Motivo da perda — destaque vermelho suave em deals perdidos,
          permite bater o olho e saber por que o negócio foi perdido. */}
      {deal.lostReason && (
        <div className="mt-1 flex items-start gap-1.5 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.20)] bg-[rgba(239,68,68,0.08)] px-2.5 py-1 text-[11px] leading-[1.35]">
          <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-danger-dark)]">
            <IconCircleX size={12} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display text-[9.5px] font-bold uppercase tracking-wide text-[var(--color-danger-dark)]">
              Motivo da perda
            </span>
            <span className="line-clamp-2 block text-[var(--color-danger-text)]">{deal.lostReason}</span>
          </span>
        </div>
      )}

      {/* Tags — slot tem prioridade. Sem slot, mantemos fallback v0
          (tags estaticas + botao "+" decorativo).
          stopPropagation em multiplos eventos para nao abrir o deal
          ou iniciar drag ao interagir com popovers injetados. */}
      <div
        className="mb-1 mt-1 flex flex-wrap items-center gap-1"
        onClick={tagsSlot ? (e) => e.stopPropagation() : undefined}
        onMouseDown={tagsSlot ? (e) => e.stopPropagation() : undefined}
        onPointerDown={tagsSlot ? (e) => e.stopPropagation() : undefined}
        onTouchStart={tagsSlot ? (e) => e.stopPropagation() : undefined}
      >
        {tagsSlot ?? (
          <>
            {deal.tags?.map((tag, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-px font-display text-[9.5px] font-bold tracking-wide",
                  tagStyles[tag.type],
                )}
              >
                {tag.label}
              </span>
            ))}
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-[var(--glass-border)] bg-transparent px-2 py-px font-display text-[9.5px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            >
              +
            </button>
          </>
        )}
      </div>

      {/* Owner — slot tem prioridade. */}
      <div
        className="flex items-center gap-1.5 border-t border-[var(--glass-border-subtle)] pt-1"
        onClick={ownerSlot ? (e) => e.stopPropagation() : undefined}
        onMouseDown={ownerSlot ? (e) => e.stopPropagation() : undefined}
        onPointerDown={ownerSlot ? (e) => e.stopPropagation() : undefined}
        onTouchStart={ownerSlot ? (e) => e.stopPropagation() : undefined}
      >
        {ownerSlot ?? (
          <Chip variant="brand" className="cursor-pointer transition-colors hover:bg-[rgba(91,111,245,0.22)]">
            {deal.owner.name}
          </Chip>
        )}
        {moveMenuSlot && (
          <div
            className="ml-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {moveMenuSlot}
          </div>
        )}
      </div>
    </article>
  )
}
