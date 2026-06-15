"use client"

import { useMemo } from "react"
import { IconChartBar } from "@tabler/icons-react"
import { GlassCard } from "@/components/crm/glass-card"
import { WEEKDAYS_SHORT, dateKey, type Activity } from "@/lib/activities-data"

interface ActivitiesWeeklySummaryProps {
  items: Activity[]
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - out.getDay())
  return out
}

export function ActivitiesWeeklySummary({ items }: ActivitiesWeeklySummaryProps) {
  const { bars, completed, total } = useMemo(() => {
    const start = startOfWeek(new Date())
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })

    const dayKeys = days.map(dateKey)
    const byDay = new Map<string, { total: number; done: number }>()
    for (const k of dayKeys) byDay.set(k, { total: 0, done: 0 })

    for (const a of items) {
      const k = a.start.slice(0, 10)
      const bucket = byDay.get(k)
      if (!bucket) continue
      bucket.total += 1
      if (a.status === "concluida") bucket.done += 1
    }

    const totals = Array.from(byDay.values()).map((b) => b.total)
    const max = Math.max(1, ...totals)
    const totalWeek = totals.reduce((s, n) => s + n, 0)
    const completedWeek = Array.from(byDay.values()).reduce(
      (s, b) => s + b.done,
      0,
    )

    const todayKey = dateKey(new Date())
    const barsData = days.map((d, i) => {
      const k = dayKeys[i]
      const bucket = byDay.get(k)!
      return {
        key: k,
        weekday: WEEKDAYS_SHORT[d.getDay()],
        count: bucket.total,
        height: Math.round((bucket.total / max) * 100),
        isToday: k === todayKey,
      }
    })

    return { bars: barsData, completed: completedWeek, total: totalWeek }
  }, [items])

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-primary) 14%, transparent)",
            color: "var(--brand-primary)",
          }}
        >
          <IconChartBar size={15} />
        </span>
        <p className="font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Resumo Semanal
        </p>
      </div>

      <div className="flex h-24 items-end justify-between gap-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)] p-2">
        {bars.map((b) => (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full items-end">
              <div
                className="w-full rounded-t-[var(--radius-sm)] transition-all"
                style={{
                  height: `${Math.max(b.height, b.count > 0 ? 8 : 4)}%`,
                  backgroundColor: b.isToday
                    ? "var(--brand-primary)"
                    : "color-mix(in srgb, var(--brand-primary) 35%, transparent)",
                }}
                title={`${b.weekday}: ${b.count}`}
              />
            </div>
            <span
              className={`font-display text-[10px] font-bold ${
                b.isToday ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              {b.weekday}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-2.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Completas
          </p>
          <p className="mt-0.5 font-display text-[18px] font-bold text-[var(--text-primary)]">
            {completed}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-2.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Taxa de Foco
          </p>
          <p className="mt-0.5 font-display text-[18px] font-bold text-[var(--brand-primary)]">
            {rate}%
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
