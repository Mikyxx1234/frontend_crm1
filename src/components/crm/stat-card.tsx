import { cn } from "@/lib/utils"
import { DeltaPill } from "./delta-pill"

type Accent = "brand" | "success" | "warning" | "danger" | "purple" | "teal"

const accentClasses: Record<Accent, string> = {
  brand: "border-[var(--brand-primary)]/20 bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  success: "border-[var(--color-success)]/20 bg-[var(--color-success-bg)] text-[var(--color-success)]",
  warning: "border-[var(--color-lead)]/20 bg-[var(--color-lead-bg)] text-[var(--color-warning)]",
  danger: "border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]",
  purple: "border-[var(--brand-secondary)]/25 bg-[color-mix(in_srgb,var(--brand-secondary)_15%,transparent)] text-[var(--brand-secondary)]",
  teal: "border-[var(--color-teal,#10D8D8)]/25 bg-[color-mix(in_srgb,#10D8D8_14%,transparent)] text-[#0e9aa0]",
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  /** Variação percentual no período. */
  delta?: number
  /** Inverte a semântica de cor do delta (queda = boa). */
  invertDelta?: boolean
  /** Texto auxiliar abaixo do valor (ex: "vs. período anterior"). */
  caption?: string
  accent?: Accent
  /** Conteúdo extra à direita (ex: sparkline). */
  chart?: React.ReactNode
  className?: string
}

export function StatCard({
  icon,
  label,
  value,
  delta,
  invertDelta,
  caption,
  accent = "brand",
  chart,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border", accentClasses[accent])}>
          {icon}
        </span>
        {delta !== undefined && <DeltaPill value={delta} invert={invertDelta} />}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {label}
          </span>
          <span className="font-display text-[26px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
            {value}
          </span>
          {caption && <span className="font-body text-[11px] text-[var(--text-muted)]">{caption}</span>}
        </div>
        {chart && <div className="h-10 w-20 shrink-0">{chart}</div>}
      </div>
    </div>
  )
}
