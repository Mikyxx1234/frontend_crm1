"use client"

import { IconGripVertical, IconClock, IconMessage } from "@tabler/icons-react"
import { Chip } from "./chip"

export type AvatarColor = "green" | "blue" | "orange" | "purple" | "pink" | "coral" | "teal" | "mint" | "gray"
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
}

const tagStyles: Record<TagType, string> = {
  hot: "bg-[rgba(239,68,68,0.12)] text-[#991b1b] border border-[rgba(239,68,68,0.2)]",
  warm: "bg-[rgba(245,158,11,0.15)] text-[#92600a] border border-[rgba(245,158,11,0.2)]",
  cold: "bg-[rgba(91,111,245,0.10)] text-[#5b6ff5] border border-[rgba(91,111,245,0.2)]",
  vip: "bg-[rgba(167,139,250,0.15)] text-[#6d28d9] border border-[rgba(167,139,250,0.25)]",
  partner: "bg-[rgba(16,185,129,0.12)] text-[#065f46] border border-[rgba(16,185,129,0.2)]",
  ref: "bg-[rgba(244,114,182,0.12)] text-[#be185d] border border-[rgba(244,114,182,0.25)]",
}

export function DealCard({ deal, onClick }: DealCardProps) {
  return (
    <article
      onClick={onClick}
      className="bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3.5 py-3 cursor-pointer transition-all duration-[250ms] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-overlay)] hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)] active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5 mb-2">
        <IconGripVertical
          size={14}
          className="text-[var(--text-muted)] opacity-50 cursor-grab self-center flex-shrink-0"
        />
        <div
          className={`av-${deal.avatarColor} flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white border-2 border-white relative`}
        >
          {deal.initials}
          {deal.online !== undefined && (
            <span
              className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full border-[1.5px] border-white"
              style={{ background: deal.online ? "var(--color-online)" : "var(--color-offline)" }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] font-bold text-[var(--text-primary)] truncate">{deal.name}</div>
          <div className="text-[11px] text-[var(--text-muted)] truncate mt-px">{deal.subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-display text-[10px] font-bold text-[var(--brand-primary)] bg-[var(--color-enterprise-bg)] px-1.5 py-px rounded-[var(--radius-sm)]">
            {deal.dealNumber}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">{deal.date}</span>
        </div>
      </div>

      {deal.message && (
        <div className="text-[11.5px] text-[var(--text-secondary)] italic leading-[1.45] py-1.5 pb-2 flex items-start gap-1.5">
          <IconMessage size={11} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
          <span className="flex-1 overflow-hidden line-clamp-2">{deal.message.text}</span>
          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{deal.message.time}</span>
        </div>
      )}

      {!deal.message && deal.timeAgo && (
        <div className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-1 mb-1.5">
          <IconClock size={11} />
          {deal.timeAgo}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {deal.tags?.map((tag, i) => (
          <span
            key={i}
            className={`font-display text-[9.5px] font-bold px-2 py-px rounded-full inline-flex items-center tracking-wide ${tagStyles[tag.type]}`}
          >
            {tag.label}
          </span>
        ))}
        <button
          onClick={(e) => e.stopPropagation()}
          className="font-display text-[9.5px] font-semibold px-2 py-px rounded-full inline-flex items-center bg-transparent text-[var(--text-muted)] border border-dashed border-[rgba(163,163,163,0.4)] cursor-pointer hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
        >
          +
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/35">
        <Chip variant="brand" className="cursor-pointer hover:bg-[rgba(91,111,245,0.22)] transition-colors">
          {deal.owner.name}
        </Chip>
      </div>
    </article>
  )
}
