"use client"

import { useMemo } from "react"
import { IconChartBar } from "@tabler/icons-react"
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
    const completedWeek = Array.from(byDay.values()).reduce((s, b) => s + b.done, 0)

    const todayKey = dateKey(new Date())
    const barsData = days.map((d, i) => {
      const k = dayKeys[i]
      const bucket = byDay.get(k)!
      return {
        key: k,
        weekday: WEEKDAYS_SHORT[d.getDay()],
        count: bucket.total,
        heightPct: Math.max(6, Math.round((bucket.total / max) * 100)),
        isToday: k === todayKey,
      }
    })

    return { bars: barsData, completed: completedWeek, total: totalWeek }
  }, [items])

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <section
      aria-label="Resumo semanal"
      className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md"
    >
      <p className="mb-3 flex items-center gap-2 font-display text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        <IconChartBar size={14} stroke={2.2} className="text-[var(--brand-primary)]" />
        Resumo semanal
      </p>

      <div
        className="mb-1.5 grid h-[74px] grid-cols-7 items-end gap-1.5"
        aria-hidden
      >
        {bars.map((b) => (
          <div
            key={b.key}
            className="rounded-t-[var(--radius-sm)] border border-[var(--glass-border-subtle)] transition-all"
            style={{
              height: `${b.heightPct}%`,
              backgroundColor: b.isToday
                ? "var(--brand-primary)"
                : "var(--glass-bg-overlay)",
              borderColor: b.isToday ? "transparent" : undefined,
            }}
            title={`${b.weekday}: ${b.count}`}
          />
        ))}
      </div>

      <div className="mb-3.5 grid grid-cols-7 gap-1.5">
        {bars.map((b) => (
          <span
            key={b.key}
            className={`text-center text-[10px] font-semibold ${
              b.isToday
                ? "font-extrabold text-[var(--brand-primary)]"
                : "text-[var(--text-faint,var(--text-muted))]"
            }`}
          >
            {b.weekday}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
          <p className="font-display text-[9.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--text-muted)]">
            Completas
          </p>
          <p className="mt-0.5 font-display text-[22px] font-extrabold text-[var(--text-primary)]">
            {completed}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
          <p className="font-display text-[9.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--text-muted)]">
            Taxa de foco
          </p>
          <p className="mt-0.5 font-display text-[22px] font-extrabold text-[var(--brand-primary)]">
            {rate}%
          </p>
        </div>
      </div>
    </section>
  )
}
