import { cn } from "@/lib/utils"
import { AvatarGlass } from "./avatar-glass"

export interface Message {
  id: string
  content: string
  time: string
  type: 'incoming' | 'outgoing'
  senderInitials?: string
  senderColor?: 'blue' | 'teal' | 'orange' | 'purple' | 'pink' | 'coral'
}

interface MessageBubbleProps {
  message: Message
  className?: string
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isOutgoing = message.type === 'outgoing'

  return (
    <div
      className={cn(
        "flex items-end gap-2.5",
        isOutgoing && "flex-row-reverse",
        className
      )}
    >
      {!isOutgoing && message.senderInitials && (
        <AvatarGlass
          initials={message.senderInitials}
          size="sm"
          color={message.senderColor || 'blue'}
        />
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-[var(--radius-lg)] px-4 py-3 text-[13.5px] leading-relaxed",
          isOutgoing
            ? "rounded-br-[var(--radius-sm)] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-[0_4px_16px_rgba(91,111,245,0.35)]"
            : "rounded-bl-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-primary)] backdrop-blur-sm shadow-[var(--glass-shadow-sm)]"
        )}
      >
        {message.content}
        <span
          className={cn(
            "mt-1 block text-right text-[10px]",
            isOutgoing ? "opacity-60" : "text-[var(--text-muted)]"
          )}
        >
          {message.time}
        </span>
      </div>
    </div>
  )
}

interface DaySeparatorProps {
  date: string
}

export function DaySeparator({ date }: DaySeparatorProps) {
  return (
    <div className="self-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
      {date}
    </div>
  )
}
