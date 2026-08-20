import { IconMessageCircle } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface UnreadCountPillProps {
  count: number
  className?: string
  /** Defaults to "`{count} mensagens não lidas`". */
  "aria-label"?: string
}

/**
 * Contador de mensagens não lidas — pílula lilás com ícone de balão + número.
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
        "inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_16%,white)] px-2 py-0.5 font-display text-[11px] font-bold leading-none text-[var(--brand-primary)] tabular-nums",
        className,
      )}
      aria-label={ariaLabel ?? `${count} mensagens não lidas`}
    >
      <IconMessageCircle size={12} stroke={2} className="shrink-0" aria-hidden />
      {label}
    </span>
  )
}
