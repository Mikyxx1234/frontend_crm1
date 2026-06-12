"use client"

import { useMemo } from "react"
import { IconAlertTriangle, IconClock } from "@tabler/icons-react"
import { GlassCard } from "@/components/crm/glass-card"
import {
  ACTIVITY_KINDS,
  activityDateKey,
  activityTime,
  dateKey,
  type Activity,
} from "@/lib/activities-data"

interface ActivitiesUrgentCardProps {
  items: Activity[]
  onSelect: (date: Date) => void
}

function diffDaysFromNow(iso: string): number {
  const now = new Date()
  const target = new Date(iso)
  const ms = now.getTime() - target.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function untilLabel(iso: string): string {
  const target = new Date(iso).getTime()
  const now = Date.now()
  const minutes = Math.round((target - now) / 60000)
  if (minutes <= 0) return "agora"
  if (minutes < 60) return `em ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `em ${hours}h`
  const days = Math.round(hours / 24)
  return `em ${days}d`
}

export function ActivitiesUrgentCard({ items, onSelect }: ActivitiesUrgentCardProps) {
  const { overdue, upcoming } = useMemo(() => {
    const now = Date.now()
    const todayKey = dateKey(new Date())
    const pending = items.filter((a) => a.status === "pendente")

    const overdueList = pending
      .filter((a) => new Date(a.start).getTime() < now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 3)

    const upcomingNext = pending
      .filter(
        (a) =>
          activityDateKey(a) === todayKey &&
          new Date(a.start).getTime() >= now,
      )
      .sort((a, b) => a.start.localeCompare(b.start))[0]

    return { overdue: overdueList, upcoming: upcomingNext }
  }, [items])

  const isEmpty = overdue.length === 0 && !upcoming

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-danger) 14%, transparent)",
            color: "var(--color-danger)",
          }}
        >
          <IconAlertTriangle size={15} />
        </span>
        <p className="font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Urgentes
        </p>
      </div>

      {isEmpty ? (
        <p className="font-body text-[12px] text-[var(--text-muted)]">
          Nada urgente por aqui. Bom trabalho!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {overdue.map((a) => {
            const meta = ACTIVITY_KINDS[a.kind]
            const days = diffDaysFromNow(a.start)
            const badge =
              days <= 0
                ? "ATRASADA"
                : `ATRASADA HÁ ${days} ${days === 1 ? "DIA" : "DIAS"}`
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(new Date(a.start))}
                className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-danger)]/25 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]"
              >
                <span className="font-display text-[10px] font-bold tracking-[0.06em] text-[var(--color-danger)]">
                  {badge}
                </span>
                <span className="font-display text-[12px] font-bold leading-tight text-[var(--text-primary)]">
                  {a.title}
                </span>
                <span
                  className="inline-flex items-center gap-1 font-display text-[10px] font-bold"
                  style={{ color: meta.color }}
                >
                  {meta.label} · {activityTime(a)}
                </span>
              </button>
            )
          })}

          {upcoming && (
            <button
              type="button"
              onClick={() => onSelect(new Date(upcoming.start))}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-2.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
            >
              <span className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--brand-primary)]">
                <IconClock size={11} /> Próxima · {untilLabel(upcoming.start)}
              </span>
              <span className="font-display text-[12px] font-bold leading-tight text-[var(--text-primary)]">
                {upcoming.title}
              </span>
              <span
                className="font-display text-[10px] font-bold"
                style={{ color: ACTIVITY_KINDS[upcoming.kind].color }}
              >
                {ACTIVITY_KINDS[upcoming.kind].label} · {activityTime(upcoming)}
              </span>
            </button>
          )}
        </div>
      )}
    </GlassCard>
  )
}
