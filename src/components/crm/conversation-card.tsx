"use client"

import { cn } from "@/lib/utils"
import { IconClock } from "@tabler/icons-react"
import { Chip } from "./chip"

export type ConversationAvatarColor = "sunset" | "forest" | "ocean" | "dusk"

export interface Conversation {
  id: string
  name: string
  initials: string
  avatarColor: ConversationAvatarColor | "blue" | "teal" | "orange" | "purple" | "pink" | "coral"
  status: "online" | "offline" | "none"
  time: string
  preview: string
  assignee?: string
  active?: boolean
  inactive?: boolean
  urgent?: boolean
}

interface ConversationCardProps {
  conversation: Conversation
  onClick?: () => void
}

const avatarGradients: Record<string, string> = {
  // Showcase gradients
  sunset: "linear-gradient(135deg, #FFD580 0%, #FF8FA3 50%, #FF6B9D 100%)",
  forest: "linear-gradient(135deg, #5CC7A9 0%, #2C8A6B 60%, #1F5D49 100%)",
  ocean: "linear-gradient(135deg, #6FA8DC 0%, #3D5A80 60%, #293f5d 100%)",
  dusk: "linear-gradient(135deg, #9F8FDF 0%, #5b6ff5 60%, #3d52e8 100%)",
  // Aliases
  blue: "linear-gradient(135deg, #6FA8DC 0%, #3D5A80 60%, #293f5d 100%)",
  teal: "linear-gradient(135deg, #5CC7A9 0%, #2C8A6B 60%, #1F5D49 100%)",
  orange: "linear-gradient(135deg, #FFD580 0%, #FF8FA3 50%, #FF6B9D 100%)",
  coral: "linear-gradient(135deg, #FFD580 0%, #FF8FA3 50%, #FF6B9D 100%)",
  purple: "linear-gradient(135deg, #9F8FDF 0%, #5b6ff5 60%, #3d52e8 100%)",
  pink: "linear-gradient(135deg, #FFB1D6 0%, #FF6B9D 60%, #C13F73 100%)",
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all duration-200",
        "hover:bg-white/75",
        conversation.active &&
          "border-[var(--brand-primary)]/40 bg-white/85 shadow-[0_6px_20px_rgba(91,111,245,0.18)]",
        conversation.inactive && "opacity-70",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white font-display text-sm font-bold text-white"
            style={{ background: avatarGradients[conversation.avatarColor] }}
          >
            {conversation.initials}
          </div>
          {conversation.status !== "none" && (
            <span
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
                conversation.status === "online"
                  ? "bg-[var(--color-online)]"
                  : "bg-[var(--color-offline)]",
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-[var(--text-primary)]">
            {conversation.name}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span>{conversation.time}</span>
          {conversation.urgent && (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
              <IconClock size={8} stroke={3} />
            </span>
          )}
        </div>
      </div>

      <p className="mb-2 ml-[60px] mt-1 truncate text-[12.5px] text-[var(--text-muted)]">
        {conversation.preview}
      </p>

      <div className="pl-[60px]">
        {conversation.assignee ? (
          <Chip variant="brand">{conversation.assignee}</Chip>
        ) : (
          <Chip variant="ghost">+Responsável</Chip>
        )}
      </div>
    </article>
  )
}
