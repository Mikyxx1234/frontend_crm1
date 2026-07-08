"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { IconCalendar, IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

type Preset = { label: string; getRange: () => DateRange };

const PRESETS: Preset[] = [
  {
    label: "Hoje",
    getRange: () => {
      const t = startOfDay(new Date());
      return { from: t, to: t };
    },
  },
  {
    label: "Ontem",
    getRange: () => {
      const y = startOfDay(subDays(new Date(), 1));
      return { from: y, to: y };
    },
  },
  {
    label: "Últimos 7 dias",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: startOfDay(new Date()) }),
  },
  {
    label: "Últimos 30 dias",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: startOfDay(new Date()) }),
  },
  {
    label: "Este mês",
    getRange: () => ({ from: startOfMonth(new Date()), to: startOfDay(new Date()) }),
  },
  {
    label: "Mês passado",
    getRange: () => {
      const ref = subMonths(new Date(), 1);
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    },
  },
];

function formatTrigger(range: DateRange): string | null {
  if (range.from && range.to) {
    if (isSameDay(range.from, range.to)) {
      return format(range.from, "dd MMM yyyy", { locale: ptBR });
    }
    return `${format(range.from, "dd MMM", { locale: ptBR })} — ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`;
  }
  if (range.from) {
    return `${format(range.from, "dd MMM yyyy", { locale: ptBR })} — ...`;
  }
  return null;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Período",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [leftMonth, setLeftMonth] = React.useState<Date>(
    value.from ?? subMonths(new Date(), 1),
  );
  // Estado de seleção em andamento: primeiro clique define o início.
  const [pendingFrom, setPendingFrom] = React.useState<Date | null>(null);
  const [hovered, setHovered] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingFrom(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (open && value.from) setLeftMonth(value.from);
  }, [open, value.from]);

  const triggerLabel = formatTrigger(value);
  const hasValue = Boolean(value.from);

  function handleDayClick(day: Date) {
    if (!pendingFrom) {
      setPendingFrom(day);
      onChange({ from: day, to: null });
      return;
    }
    // Segundo clique: fecha o intervalo (ordena se necessário).
    const from = isBefore(day, pendingFrom) ? day : pendingFrom;
    const to = isBefore(day, pendingFrom) ? pendingFrom : day;
    onChange({ from, to });
    setPendingFrom(null);
    setHovered(null);
    setOpen(false);
  }

  // Intervalo efetivo para destaque (inclui hover durante seleção).
  const activeFrom = pendingFrom ?? value.from;
  const activeTo = pendingFrom ? hovered : value.to;

  function isInRange(day: Date): boolean {
    if (!activeFrom || !activeTo) return false;
    const start = isBefore(activeFrom, activeTo) ? activeFrom : activeTo;
    const end = isBefore(activeFrom, activeTo) ? activeTo : activeFrom;
    return isWithinInterval(day, { start: startOfDay(start), end: startOfDay(end) });
  }

  function renderMonth(monthDate: Date) {
    const monthStart = startOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(endOfMonth(monthDate), { locale: ptBR });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div className="flex-1">
        <div className="mb-2 grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAYS.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
            >
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthDate);
            const isFrom = activeFrom ? isSameDay(day, activeFrom) : false;
            const isTo = activeTo ? isSameDay(day, activeTo) : false;
            const isEndpoint = isFrom || isTo;
            const inRange = isInRange(day) && !isEndpoint;
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => pendingFrom && setHovered(day)}
                className={cn(
                  "relative flex h-8 items-center justify-center font-display text-[12px] font-semibold transition-colors",
                  // Cantos arredondados nas extremidades do intervalo.
                  inRange && "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] rounded-none",
                  isFrom && "rounded-l-[var(--radius-md)]",
                  isTo && "rounded-r-[var(--radius-md)]",
                  isEndpoint &&
                    "z-10 rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]",
                  !isEndpoint && !inRange && inMonth &&
                    "rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--color-enterprise-bg)]",
                  !inMonth && !isEndpoint && !inRange &&
                    "rounded-[var(--radius-md)] text-[var(--text-muted)]/40 hover:bg-[var(--color-enterprise-bg)]",
                )}
              >
                {format(day, "d")}
                {isToday && !isEndpoint && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--brand-primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-[var(--radius-lg)] border px-3 font-display text-[13px] font-semibold backdrop-blur-md transition-colors",
          hasValue
            ? "border-[var(--brand-primary)]/40 bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
      >
        <IconCalendar size={16} className="shrink-0" />
        <span className="truncate">{triggerLabel ?? placeholder}</span>
        {hasValue && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Limpar período"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: null, to: null });
              setPendingFrom(null);
            }}
            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)]/15"
          >
            <IconX size={12} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 flex overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow-lg)] backdrop-blur-xl">
          {/* Presets */}
          <div className="flex w-[150px] flex-col gap-0.5 border-r border-[var(--glass-border-subtle)] p-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const range = preset.getRange();
                  onChange(range);
                  if (range.from) setLeftMonth(range.from);
                  setPendingFrom(null);
                  setOpen(false);
                }}
                className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-left font-display text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendários */}
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() => setLeftMonth((m) => subMonths(m, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]"
              >
                <IconChevronLeft size={18} />
              </button>
              <div className="flex flex-1 items-center justify-around gap-6">
                <span className="font-display text-[13px] font-bold capitalize text-[var(--text-primary)]">
                  {format(leftMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <span className="font-display text-[13px] font-bold capitalize text-[var(--text-primary)]">
                  {format(addMonths(leftMonth, 1), "MMMM yyyy", { locale: ptBR })}
                </span>
              </div>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() => setLeftMonth((m) => addMonths(m, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]"
              >
                <IconChevronRight size={18} />
              </button>
            </div>
            <div className="flex gap-5">
              <div className="w-[224px]">{renderMonth(leftMonth)}</div>
              <div className="w-[224px]">{renderMonth(addMonths(leftMonth, 1))}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
