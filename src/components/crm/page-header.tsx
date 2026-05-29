import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-4 px-1", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="truncate font-body text-[13px] text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
