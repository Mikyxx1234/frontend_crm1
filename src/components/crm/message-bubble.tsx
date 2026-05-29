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
      {isOutgoing && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] font-display text-[10px] font-bold text-white">
          {message.senderInitials || "AS"}
        </div>
      )}
      <div
        className={cn(
          // Estilo WhatsApp: bolha `relative`, horário `absolute`
          // ancorado no canto inferior-direito. Um "ghost spacer"
          // inline no final do texto reserva exatamente a largura do
          // horário, garantindo que o texto não fique escondido atrás
          // do timestamp na última linha. py-2 deixa a bolha baixa.
          "relative min-w-0 rounded-[var(--radius-lg)] px-[14px] py-2 text-sm leading-[1.45]",
          isOutgoing
            ? "rounded-br-[4px] bg-[var(--brand-primary)] text-white shadow-[0_4px_16px_rgba(91,111,245,0.30)]"
            : "rounded-bl-[4px] bg-white text-[var(--text-primary)] shadow-[0_2px_12px_rgba(100,130,180,0.10)]",
        )}
      >
        <span className="break-words">
          {message.content}
          {/* Ghost spacer — invisível, mesma largura do timestamp.
              Permite que o texto da última linha pare antes do horário
              sem sobreposição, e empurra a quebra de linha quando o
              texto preencheria justamente a área do tempo. */}
          <span
            aria-hidden
            className="ml-1 inline-block w-[36px] align-baseline"
          />
        </span>
        <span
          className={cn(
            "pointer-events-none absolute bottom-1.5 right-2.5 select-none whitespace-nowrap text-[10.5px] leading-none",
            isOutgoing ? "text-white/80" : "text-[var(--text-muted)]",
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
