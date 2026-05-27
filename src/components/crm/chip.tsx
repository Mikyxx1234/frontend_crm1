import { cn } from "@/lib/utils"

type ChipVariant = 'brand' | 'ghost'

interface ChipProps {
  variant?: ChipVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<ChipVariant, string> = {
  brand: 'bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]/25',
  ghost: 'bg-[rgba(163,163,163,0.10)] text-[var(--text-muted)] border-[rgba(163,163,163,0.20)]',
}

export function Chip({ variant = 'brand', children, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-0.5 font-display text-[10px] font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
