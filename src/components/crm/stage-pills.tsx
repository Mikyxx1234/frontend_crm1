"use client"

import { cn } from "@/lib/utils"

interface Stage {
  label: string
  status: 'done' | 'active' | 'pending'
}

interface StagePillsProps {
  stages: Stage[]
  onStageClick?: (index: number) => void
  className?: string
}

export function StagePills({ stages, onStageClick, className }: StagePillsProps) {
  return (
    <nav
      aria-label="Etapa atual do negócio"
      className={cn(
        "flex gap-1.5 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-5.5 py-3.5",
        className
      )}
    >
      {stages.map((stage, index) => (
        <button
          key={stage.label}
          onClick={() => onStageClick?.(index)}
          className={cn(
            "flex-1 rounded-full border px-2.5 py-1.5 text-center font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-150",
            stage.status === 'done' && "border-[var(--color-success)]/25 bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
            stage.status === 'active' && "border-[var(--brand-primary-dark)] bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]",
            stage.status === 'pending' && "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          {stage.label}
        </button>
      ))}
    </nav>
  )
}
