import { IconMail } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export function awaitingReplyLabel(unreadCount: number): string {
  if (unreadCount <= 0) return "Mensagem aguardando resposta"
  if (unreadCount === 1) return "1 mensagem aguardando resposta"
  return `${unreadCount > 99 ? "99+" : unreadCount} mensagens aguardando resposta`
}

interface AwaitingReplyFooterProps {
  unreadCount?: number
  className?: string
}

/**
 * Barra inferior lilás — sinaliza conversa/deal com última msg inbound
 * ainda sem resposta do agente (mock: envelope + "N mensagens aguardando resposta").
 */
export function AwaitingReplyFooter({
  unreadCount = 0,
  className,
}: AwaitingReplyFooterProps) {
  const label = awaitingReplyLabel(unreadCount)

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-t border-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_10%,white)] px-3 py-1.5 text-[11px] font-medium leading-none text-[var(--brand-primary)]",
        className,
      )}
      aria-label={label}
    >
      <IconMail size={13} stroke={1.75} className="shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </div>
  )
}
