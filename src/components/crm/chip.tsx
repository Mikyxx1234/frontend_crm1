import { cn } from "@/lib/utils"

type ChipVariant = 'brand' | 'ghost'

interface ChipProps {
  variant?: ChipVariant
  children: React.ReactNode
  className?: string
  /**
   * Cor dinâmica (ex.: tags do CRM com `tag.color`).
   * Quando informada, sobrescreve as cores da variante.
   */
  color?: string
}

const variantClasses: Record<ChipVariant, string> = {
  brand: 'bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]/25',
  ghost: 'bg-[rgba(163,163,163,0.10)] text-[var(--text-muted)] border-[rgba(163,163,163,0.20)]',
}

/**
 * Tag/filtro do DS v2 — **sempre `rounded-[var(--radius-sm)]`** (não pill).
 *
 * Quando usar:
 * - Tags de contato/negócio, chips de filtro, categorias, skills, CLT/Estágio.
 * - Labels repetíveis em tabelas e cards (use `color` para tags com cor do usuário).
 *
 * Quando **não** usar (prefira `BadgeGlass` ou `StatusPill`):
 * - Selos semânticos fixos (enterprise/lead/success) → `BadgeGlass` (`rounded-full`).
 * - Presença online/offline ou status operacional → `StatusPill`.
 *
 * @see BadgeGlass — selos semânticos com `rounded-full`
 */
export function Chip({ variant = 'brand', children, className, color }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-0.5 font-display text-[10px] font-semibold",
        !color && variantClasses[variant],
        className
      )}
      style={
        color
          ? {
              color,
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
            }
          : undefined
      }
    >
      {children}
    </span>
  )
}
