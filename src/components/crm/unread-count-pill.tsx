import { cn } from "@/lib/utils"

interface UnreadCountPillProps {
  count: number
  className?: string
  /** Defaults to "`{count} mensagens não lidas`". */
  "aria-label"?: string
}

/**
 * Contador de mensagens não lidas — círculo vermelho sólido + número branco.
 * Esconde quando `count` é 0 / inválido.
 */
export function UnreadCountPill({
  count,
  className,
  "aria-label": ariaLabel,
}: UnreadCountPillProps) {
  if (!count || count <= 0) return null

  const label = count > 99 ? "99+" : String(count)

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 font-display text-[11px] font-bold leading-none text-white tabular-nums",
        className,
      )}
      aria-label={ariaLabel ?? `${count} mensagens não lidas`}
    >
      {label}
    </span>
  )
}
