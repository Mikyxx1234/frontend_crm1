import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon: React.ReactNode
  title: string
  description?: string
  /**
   * Filtros e operações do header. Renderizados na ZONA CENTRAL (entre
   * o título e as `actions`). Padrão dos headers /v2: busca à direita,
   * filtros/ações ao centro.
   */
  center?: React.ReactNode
  /** Slot da direita — tipicamente a busca padronizada (`SearchInput`). */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, center, actions, className }: PageHeaderProps) {
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
      {center && (
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2">{center}</div>
      )}
      {actions && (
        <div className={cn("flex items-center gap-2", !center && "ml-auto")}>{actions}</div>
      )}
    </div>
  )
}
