import { cn } from "@/lib/utils"

type StatusVariant = 'enterprise' | 'lead' | 'success'

interface StatusPillProps {
  variant: StatusVariant
  children: React.ReactNode
  className?: string
  showDot?: boolean
}

const variantClasses: Record<StatusVariant, string> = {
  enterprise: 'bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
  lead: 'bg-[var(--color-lead-bg)] text-[var(--color-warning-text)] border-[var(--color-lead)]/20',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success)]/20',
}

const dotClasses: Record<StatusVariant, string> = {
  enterprise: 'bg-[var(--brand-primary)]',
  lead: 'bg-[var(--color-lead)]',
  success: 'bg-[var(--color-success)]',
}

export function StatusPill({ variant, children, className, showDot = true }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClasses[variant])} />
      )}
      {children}
    </span>
  )
}
