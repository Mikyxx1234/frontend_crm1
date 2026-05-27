import { cn } from "@/lib/utils"

export interface Message {
  id: string
  content: string
  time: string
  type: "incoming" | "outgoing"
  senderInitials?: string
}

interface MessageBubbleProps {
  message: Message
  className?: string
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing"

  return (
    <div
      className={cn(
        "flex max-w-[75%] items-end gap-2.5",
        isOutgoing && "ml-auto flex-row-reverse",
        className,
      )}
    >
      {isOutgoing ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] font-display text-[10px] font-bold text-white">
          {message.senderInitials || "AS"}
        </div>
      ) : (
        <div className="h-7 w-7 shrink-0 rounded-full bg-[linear-gradient(135deg,#6B7E96_0%,#3d4d66_100%)]" />
      )}
      <div
        className={cn(
          "min-w-0 rounded-[var(--radius-lg)] px-[18px] py-3.5 text-sm leading-[1.55]",
          isOutgoing
            ? "rounded-br-[4px] bg-[var(--brand-primary)] text-white shadow-[0_4px_16px_rgba(91,111,245,0.30)]"
            : "rounded-bl-[4px] bg-white text-[var(--text-primary)] shadow-[0_2px_12px_rgba(100,130,180,0.10)]",
        )}
      >
        {message.content}
        <span
          className={cn(
            "mt-1.5 block text-right text-[10.5px]",
            isOutgoing ? "text-white/85" : "text-[var(--text-muted)]",
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
    <div className="self-center px-0 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      {date}
    </div>
  )
}
