"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import {
  buildMonthGrid,
  dateKey,
  isSameDay,
  monthLabel,
  WEEKDAYS_SHORT,
  type Activity,
} from "@/lib/activities-data"

interface ActivityCalendarProps {
  viewDate: Date
  selectedDate: Date
  activities: Activity[]
  onSelectDate: (d: Date) => void
  onChangeMonth: (d: Date) => void
  className?: string
}

export function ActivityCalendar({
  viewDate,
  selectedDate,
  activities,
  onSelectDate,
  onChangeMonth,
  className,
}: ActivityCalendarProps) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = new Date()

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  const daysWithActivities = useMemo(() => {
    const set = new Set<string>()
    for (const a of activities) set.add(a.start.slice(0, 10))
    return set
  }, [activities])

  const goMonth = (delta: number) => onChangeMonth(new Date(year, month + delta, 1))

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-[14px] font-extrabold capitalize text-[var(--text-primary)]">
          {monthLabel(year, month)}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => goMonth(-1)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
          >
            <IconChevronLeft size={15} stroke={2.4} />
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              onSelectDate(today)
            }}
            className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1 font-display text-[12px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
          >
            Hoje
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => goMonth(1)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
          >
            <IconChevronRight size={15} stroke={2.4} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((w) => (
          <div
            key={w}
            className="py-1 text-center font-display text-[9.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--text-faint,var(--text-muted))]"
          >
            {w}
          </div>
        ))}
        {grid.map((d) => {
          const key = dateKey(d)
          const inMonth = d.getMonth() === month
          const isToday = isSameDay(d, today)
          const isSelected = isSameDay(d, selectedDate)
          const hasDot = daysWithActivities.has(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(d)}
              aria-label={`Dia ${d.getDate()}`}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "relative flex aspect-square cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[12.5px] font-semibold transition-colors",
                isSelected
                  ? "bg-[var(--brand-primary)] font-extrabold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                !inMonth && !isSelected && "text-[var(--text-faint,var(--text-muted))] opacity-55",
              )}
            >
              {d.getDate()}
              {hasDot && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-white" : "bg-[var(--brand-primary)]",
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
