"use client"

import { useMemo } from "react"
import { IconAlertTriangle } from "@tabler/icons-react"
import {
  ACTIVITY_KINDS,
  activityTime,
  type Activity,
} from "@/lib/activities-data"

interface ActivitiesUrgentCardProps {
  items: Activity[]
  onSelect: (date: Date) => void
}

function overdueLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "Atrasada"
  if (days === 1) return "Atrasada há 1 dia"
  return `Atrasada há ${days} dias`
}

export function ActivitiesUrgentCard({ items, onSelect }: ActivitiesUrgentCardProps) {
  const overdue = useMemo(() => {
    const now = Date.now()
    return items
      .filter((a) => a.status === "pendente" && new Date(a.start).getTime() < now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 3)
  }, [items])

  return (
    <section
      aria-label="Urgentes"
      className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md"
    >
      <p className="mb-3 flex items-center gap-2 font-display text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        <IconAlertTriangle size={14} stroke={2.2} className="text-[var(--color-danger)]" />
        Urgentes
      </p>

      {overdue.length === 0 ? (
        <p className="font-body text-[12px] text-[var(--text-muted)]">
          Nada urgente por aqui. Bom trabalho!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {overdue.map((a) => {
            const meta = ACTIVITY_KINDS[a.kind]
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(new Date(a.start))}
                className="cursor-pointer rounded-[var(--radius-lg)] border border-[rgba(239,68,68,0.22)] bg-[var(--color-danger-bg)] p-[11px_13px] text-left transition-opacity hover:opacity-90"
              >
                <p className="font-display text-[10px] font-extrabold uppercase tracking-[0.04em] text-[var(--color-danger-dark,var(--color-danger-text))]">
                  {overdueLabel(a.start)}
                </p>
                <p className="mt-0.5 font-display text-[14px] font-extrabold text-[var(--text-primary)]">
                  {a.title}
                </p>
                <p className="mt-0.5 font-display text-[12px] font-semibold text-[var(--brand-primary)]">
                  {meta.label} · {activityTime(a)}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
