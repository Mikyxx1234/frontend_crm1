"use client"

import { cn } from "@/lib/utils"
import { IconClock, IconMessage } from "@tabler/icons-react"
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
}

const tagStyles: Record<TagType, string> = {
  hot: "bg-[rgba(239,68,68,0.12)] text-[#991b1b] border-[rgba(239,68,68,0.20)]",
  warm: "bg-[var(--color-lead-bg)] text-[var(--color-warning-text)] border-[rgba(245,158,11,0.25)]",
  cold: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] border-[rgba(91,111,245,0.25)]",
  vip: "bg-[rgba(167,139,250,0.15)] text-[#6d28d9] border-[rgba(167,139,250,0.25)]",
  partner: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[rgba(16,185,129,0.25)]",
  ref: "bg-[rgba(244,114,182,0.12)] text-[#be185d] border-[rgba(244,114,182,0.25)]",
}

export function DealCard({ deal, onClick, tagsSlot, ownerSlot }: DealCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all",
        "hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[var(--glass-shadow)]",
        "active:cursor-grabbing",
      )}
    >
      {/* Top row: avatar + name + dealNumber/date */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            `av-${deal.avatarColor}`,
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[11px] font-bold text-white",
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
        <div className="mt-2 flex items-start gap-1.5 rounded-[var(--radius-md)] bg-white/50 px-2.5 py-2 text-[11.5px] italic leading-[1.45] text-[var(--text-secondary)]">
          <IconMessage size={11} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
          <span className="line-clamp-2 flex-1 overflow-hidden">{deal.message.text}</span>
          <span className="shrink-0 text-[10px] not-italic text-[var(--text-muted)]">
            {deal.message.time}
          </span>
        </div>
      )}

      {!deal.message && deal.timeAgo && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <IconClock size={11} />
          {deal.timeAgo}
        </div>
      )}

      {/* Tags — slot tem prioridade. Sem slot, mantemos fallback v0
          (tags estaticas + botao "+" decorativo).
          stopPropagation em multiplos eventos para nao abrir o deal
          ou iniciar drag ao interagir com popovers injetados. */}
      <div
        className="mb-2 mt-2 flex flex-wrap items-center gap-1"
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
              className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-black/20 bg-transparent px-2 py-px font-display text-[9.5px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            >
              +
            </button>
          </>
        )}
      </div>

      {/* Owner — slot tem prioridade. */}
      <div
        className="flex items-center gap-1.5 border-t border-black/[0.06] pt-2"
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
      </div>
    </article>
  )
}
