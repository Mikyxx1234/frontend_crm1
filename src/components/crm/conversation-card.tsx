"use client"

import { cn } from "@/lib/utils"
import { AvatarGlass } from "./avatar-glass"
import { BadgeGlass } from "./badge-glass"
import { Chip } from "./chip"

export interface Conversation {
  id: string
  name: string
  initials: string
  avatarColor: 'blue' | 'teal' | 'orange' | 'purple' | 'pink' | 'coral'
  status: 'online' | 'offline' | 'none'
  badge?: 'enterprise' | 'lead' | 'success'
  time: string
  preview: string
  assignee?: string
  unread?: number
  active?: boolean
  inactive?: boolean
}

interface ConversationCardProps {
  conversation: Conversation
  onClick?: () => void
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all duration-200",
        "hover:translate-x-0.5 hover:bg-[var(--glass-bg-overlay)]",
        conversation.active && "border-[var(--brand-primary)] bg-[var(--glass-bg-overlay)] shadow-[0_4px_16px_rgba(91,111,245,0.25)]",
        conversation.inactive && "opacity-70"
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2.5">
        <AvatarGlass
          initials={conversation.initials}
          size="md"
          color={conversation.avatarColor}
          status={conversation.status}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
              {conversation.name}
            </span>
            {conversation.badge && (
              <BadgeGlass variant={conversation.badge}>
                {conversation.badge === 'enterprise' ? 'ENTERPRISE' : conversation.badge === 'lead' ? 'LEAD' : 'CLIENTE'}
              </BadgeGlass>
            )}
          </div>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">{conversation.time}</span>
      </div>

      {/* Preview */}
      <p className="ml-[50px] mb-2 truncate text-xs text-[var(--text-muted)]">
        {conversation.preview}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pl-[50px]">
        {conversation.assignee ? (
          <Chip variant="brand">{conversation.assignee}</Chip>
        ) : (
          <Chip variant="ghost">+Responsável</Chip>
        )}
        {conversation.unread && (
          <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 font-display text-[10px] font-bold text-white">
            {conversation.unread}
          </span>
        )}
      </div>
    </article>
  )
}
