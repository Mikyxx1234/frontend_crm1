import { cn } from "@/lib/utils"
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react"

interface DeltaPillProps {
  /** Valor da variação. Positivo = alta, negativo = queda. */
  value: number
  /** Sufixo exibido após o número (ex: "%"). */
  suffix?: string
  /** Quando true, queda é "boa" (verde) e alta é "ruim" (vermelho). Útil para perdas/custos. */
  invert?: boolean
  /** Esconde o ícone de tendência. */
  hideIcon?: boolean
  size?: "sm" | "md"
  className?: string
}

export function DeltaPill({ value, suffix = "%", invert = false, hideIcon = false, size = "md", className }: DeltaPillProps) {
  const isUp = value > 0
  const isZero = value === 0
  // "good" determina a cor: alta é boa por padrão; com invert, queda é boa.
  const good = isZero ? null : invert ? !isUp : isUp

  const tone =
    good === null
      ? "bg-[var(--glass-bg-subtle)] text-[var(--text-muted)] border-[var(--glass-border-subtle)]"
      : good
        ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success)]/20"
        : "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-text)] border-[var(--color-danger)]/20"

  const Icon = isZero ? IconMinus : isUp ? IconTrendingUp : IconTrendingDown
  const iconSize = size === "sm" ? 12 : 14
  const formatted = `${isUp ? "+" : ""}${value.toLocaleString("pt-BR")}${suffix}`

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-display font-bold tracking-tight",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        tone,
        className,
      )}
    >
      {!hideIcon && <Icon size={iconSize} strokeWidth={2.5} />}
      {formatted}
    </span>
  )
}
