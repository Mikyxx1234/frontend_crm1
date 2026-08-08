"use client"

import { IconMail } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export function awaitingReplyLabel(unreadCount: number): string {
  const n = Number(unreadCount)
  if (!Number.isFinite(n) || n <= 0) return "Mensagem aguardando resposta"
  if (n === 1) return "1 mensagem aguardando resposta"
  return `${n > 99 ? "99+" : n} mensagens aguardando resposta`
}

interface AwaitingReplyFooterProps {
  unreadCount?: number
  className?: string
}

/**
 * Barra inferior lilás — sinaliza conversa/deal com última msg inbound
 * ainda sem resposta do agente (envelope + "N mensagens aguardando resposta").
 */
export function AwaitingReplyFooter({
  unreadCount = 0,
  className,
}: AwaitingReplyFooterProps) {
  const label = awaitingReplyLabel(unreadCount)

  return (
    <div
      className={cn(
        // leading-snug + py-2: evita clipar descendentes (g/p/ç) no overflow-hidden do card.
        "flex min-h-[2rem] items-center gap-1.5 overflow-visible border-t border-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_10%,white)] px-3 py-2 text-[11px] font-medium leading-snug text-[var(--brand-primary)]",
        className,
      )}
      aria-label={label}
    >
      <IconMail size={13} stroke={1.75} className="shrink-0" aria-hidden />
      <span className="min-w-0 truncate leading-snug">{label}</span>
    </div>
  )
}
