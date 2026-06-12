import { cn } from "@/lib/utils"

interface ChartLegendItem {
  label: string
  color: string
}

interface ChartCardProps {
  title: string
  subtitle?: string
  /** Ação no canto superior direito (ex: DropdownGlass, botão). */
  action?: React.ReactNode
  /** Legenda simples renderizada abaixo do cabeçalho. */
  legend?: ChartLegendItem[]
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

export function ChartCard({ title, subtitle, action, legend, children, className, bodyClassName }: ChartCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="truncate font-body text-[11px] text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      {legend && legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pt-3">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 font-body text-[11px] font-medium text-[var(--text-secondary)]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
