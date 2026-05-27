import { cn } from "@/lib/utils"

type BadgeVariant = 'enterprise' | 'lead' | 'success'

interface BadgeGlassProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  enterprise: 'bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
  lead: 'bg-[var(--color-lead-bg)] text-[var(--color-warning-text)] border-[var(--color-lead)]/20',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success)]/20',
}

export function BadgeGlass({ variant, children, className }: BadgeGlassProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wide",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
