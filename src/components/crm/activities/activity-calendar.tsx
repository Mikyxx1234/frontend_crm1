"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { ButtonGlass } from "@/components/crm/button-glass"
import {
  ACTIVITY_KINDS,
  buildMonthGrid,
  dateKey,
  isSameDay,
  monthLabel,
  WEEKDAYS_SHORT,
  type Activity,
} from "@/lib/activities-data"

interface ActivityCalendarProps {
  /** Mês exibido (qualquer dia dentro do mês). */
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

  // Mapa: chave de dia -> lista de tipos presentes (para os pontos)
  const dayKinds = useMemo(() => {
    const map = new Map<string, Set<Activity["kind"]>>()
    for (const a of activities) {
      const key = a.start.slice(0, 10)
      if (!map.has(key)) map.set(key, new Set())
      map.get(key)!.add(a.kind)
    }
    return map
  }, [activities])

  const goMonth = (delta: number) => onChangeMonth(new Date(year, month + delta, 1))

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {/* Cabeçalho do mês */}
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-[15px] font-bold capitalize text-[var(--text-primary)]">
          {monthLabel(year, month)}
        </p>
        <div className="flex items-center gap-1.5">
          <ButtonGlass
            variant="icon"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => goMonth(-1)}
            className="h-8 w-8 text-[15px]"
          >
            <IconChevronLeft size={18} />
          </ButtonGlass>
          <button
            type="button"
            onClick={() => {
              onChangeMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              onSelectDate(today)
            }}
            className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1 font-display text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--brand-primary)]"
          >
            Hoje
          </button>
          <ButtonGlass
            variant="icon"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => goMonth(1)}
            className="h-8 w-8 text-[15px]"
          >
            <IconChevronRight size={18} />
          </ButtonGlass>
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((w) => (
          <div
            key={w}
            className="py-1 text-center font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const key = dateKey(d)
          const inMonth = d.getMonth() === month
          const isToday = isSameDay(d, today)
          const isSelected = isSameDay(d, selectedDate)
          const kinds = dayKinds.get(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(d)}
              aria-label={`Dia ${d.getDate()}`}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border text-[13px] transition-all duration-150",
                isSelected
                  ? "border-[var(--brand-primary-dark)] bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                  : "border-transparent hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-subtle)]",
                !inMonth && !isSelected && "text-[var(--text-muted)]/45",
                inMonth && !isSelected && "text-[var(--text-secondary)]",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-display font-semibold leading-none",
                  isToday && !isSelected && "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
                )}
              >
                {d.getDate()}
              </span>

              {/* Pontos por tipo de atividade */}
              <span className="flex h-1.5 items-center justify-center gap-0.5">
                {kinds &&
                  [...kinds].slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected ? "rgba(255,255,255,0.9)" : ACTIVITY_KINDS[k].color,
                      }}
                    />
                  ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
