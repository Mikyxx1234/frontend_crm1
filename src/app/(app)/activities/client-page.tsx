"use client"

import { useMemo, useState } from "react"
import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { PageHeader } from "@/components/crm/page-header"
import { GlassCard } from "@/components/crm/glass-card"
import { ButtonGlass } from "@/components/crm/button-glass"
import { EmptyState } from "@/components/crm/empty-state"
import { ActivityCalendar } from "@/components/crm/activities/activity-calendar"
import { ActivityRow } from "@/components/crm/activities/activity-row"
import { ActivityComposer } from "@/components/crm/activities/activity-composer"
import {
  ACTIVITY_KINDS,
  ACTIVITY_KIND_ORDER,
  activityDateKey,
  dateKey,
  isSameDay,
  longDateLabel,
  type Activity,
  type ActivityKind,
} from "@/lib/activities-data"
import { cn } from "@/lib/utils"
import { IconChecklist, IconPlus, IconCalendarEvent } from "@tabler/icons-react"
import {
  useActivities,
  useCreateActivity,
  useDeleteActivity,
  useUpdateActivity,
} from "@/features/directory-v2/hooks"
import {
  activityKindToType,
  dtoToActivity,
  localDateTimeToIso,
} from "@/features/directory-v2/activity-adapter"

type StatusFilter = "todas" | "pendentes" | "concluidas" | "atrasadas"

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendentes", label: "Pendentes" },
  { key: "concluidas", label: "Concluídas" },
  { key: "atrasadas", label: "Atrasadas" },
]

const isOverdue = (a: Activity) => a.status === "pendente" && new Date(a.start).getTime() < Date.now()

export default function V2ActivitiesClientPage() {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas")
  const [kindFilter, setKindFilter] = useState<ActivityKind | "all">("all")
  const [composerOpen, setComposerOpen] = useState(false)

  // Backend wiring (substitui o seed local). Pegamos um lote grande
  // pra evitar paginação no calendário; pode evoluir pra range-query.
  const activitiesQuery = useActivities({ perPage: 200 })
  const createMutation = useCreateActivity()
  const updateMutation = useUpdateActivity()
  const deleteMutation = useDeleteActivity()

  const items: Activity[] = useMemo(
    () => (activitiesQuery.data?.items ?? []).map(dtoToActivity).filter((a) => a.start),
    [activitiesQuery.data?.items],
  )

  // Atividades visíveis no calendário (após filtro de tipo)
  const calendarItems = useMemo(
    () => (kindFilter === "all" ? items : items.filter((a) => a.kind === kindFilter)),
    [items, kindFilter],
  )

  // Atividades do dia selecionado, aplicando status + tipo
  const dayItems = useMemo(() => {
    const key = dateKey(selectedDate)
    return calendarItems
      .filter((a) => activityDateKey(a) === key)
      .filter((a) => {
        if (statusFilter === "pendentes") return a.status === "pendente"
        if (statusFilter === "concluidas") return a.status === "concluida"
        if (statusFilter === "atrasadas") return isOverdue(a)
        return true
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [calendarItems, selectedDate, statusFilter])

  // Resumo por tipo no mês exibido
  const monthSummary = useMemo(() => {
    const m = viewDate.getMonth()
    const y = viewDate.getFullYear()
    const counts = {} as Record<ActivityKind, number>
    for (const k of ACTIVITY_KIND_ORDER) counts[k] = 0
    for (const a of items) {
      const d = new Date(a.start)
      if (d.getMonth() === m && d.getFullYear() === y) counts[a.kind]++
    }
    return counts
  }, [items, viewDate])

  const toggle = (id: string) => {
    const current = items.find((a) => a.id === id)
    if (!current) return
    const nextCompleted = current.status !== "concluida"
    updateMutation.mutate({
      id,
      payload: {
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : null,
      },
    })
  }

  const remove = (id: string) => {
    deleteMutation.mutate(id)
  }

  const create = (a: Activity) => {
    createMutation.mutate(
      {
        type: activityKindToType(a.kind),
        title: a.title,
        description: a.notes ?? null,
        scheduledAt: localDateTimeToIso(a.start),
        completed: a.status === "concluida",
      },
      {
        onSuccess: () => {
          setSelectedDate(new Date(a.start))
          setViewDate(new Date(a.start))
        },
      },
    )
  }

  const isToday = isSameDay(selectedDate, new Date())

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        <PageHeader
          icon={<IconChecklist size={22} />}
          title="Atividades"
          description="Agende e acompanhe tarefas, reuniões, ligações e eventos."
          actions={
            <ButtonGlass variant="primary" onClick={() => setComposerOpen(true)}>
              <IconPlus size={16} /> Nova atividade
            </ButtonGlass>
          }
        />

        {/* Layout de 2 colunas: calendário + lista */}
        <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] gap-3.5 overflow-hidden">
          {/* Coluna esquerda: calendário + resumo por tipo */}
          <div className="flex min-h-0 flex-col gap-3.5 overflow-auto">
            <GlassCard className="p-4">
              <ActivityCalendar
                viewDate={viewDate}
                selectedDate={selectedDate}
                activities={calendarItems}
                onSelectDate={setSelectedDate}
                onChangeMonth={setViewDate}
              />
            </GlassCard>

            {/* Resumo por tipo no mês */}
            <GlassCard className="p-4">
              <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Este mês
              </p>
              <div className="flex flex-col gap-2">
                {/* Botão "Todos" */}
                <button
                  type="button"
                  onClick={() => setKindFilter("all")}
                  className={cn(
                    "flex items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 transition-colors",
                    kindFilter === "all"
                      ? "bg-[var(--glass-bg-overlay)]"
                      : "hover:bg-[var(--glass-bg-subtle)]",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)]"
                      style={{
                        backgroundColor: "rgba(91,111,245,0.12)",
                        color: "var(--brand-primary)",
                      }}
                    >
                      <IconCalendarEvent size={13} />
                    </span>
                    <span className="font-display text-[12px] font-semibold text-[var(--text-secondary)]">
                      Todas
                    </span>
                  </span>
                  <span className="font-display text-[12px] font-bold text-[var(--text-primary)]">
                    {items.filter((a) => {
                      const d = new Date(a.start)
                      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()
                    }).length}
                  </span>
                </button>

                {ACTIVITY_KIND_ORDER.map((kind) => {
                  const meta = ACTIVITY_KINDS[kind]
                  const Icon = meta.icon
                  const active = kindFilter === kind
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setKindFilter(active ? "all" : kind)}
                      className={cn(
                        "flex items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 transition-colors",
                        active
                          ? "bg-[var(--glass-bg-overlay)]"
                          : "hover:bg-[var(--glass-bg-subtle)]",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)]"
                          style={{ backgroundColor: meta.softBg, color: meta.color }}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="font-display text-[12px] font-semibold text-[var(--text-secondary)]">
                          {meta.plural}
                        </span>
                      </span>
                      <span className="font-display text-[12px] font-bold text-[var(--text-primary)]">
                        {monthSummary[kind]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </GlassCard>
          </div>

          {/* Coluna direita: lista de atividades do dia */}
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            {/* Cabeçalho do dia + filtros de status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-[15px] font-bold capitalize text-[var(--text-primary)]">
                  {longDateLabel(selectedDate)}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-[var(--brand-primary)] px-2 py-0.5 font-display text-[10px] font-bold text-white">
                      Hoje
                    </span>
                  )}
                </p>
                <p className="font-body text-[12px] text-[var(--text-muted)]">
                  {dayItems.length} {dayItems.length === 1 ? "atividade" : "atividades"}
                </p>
              </div>

              {/* Status filter pills */}
              <div className="inline-flex rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5 shadow-[var(--glass-shadow-sm)]">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1 font-display text-[11px] font-bold transition-colors",
                      statusFilter === f.key
                        ? "bg-[var(--brand-primary)] text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de atividades */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pb-2">
              {dayItems.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md">
                  <EmptyState
                    icon={<IconCalendarEvent size={28} />}
                    title="Nenhuma atividade neste dia"
                    description="Clique em + Nova atividade para agendar algo."
                  />
                </div>
              ) : (
                dayItems.map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    overdue={isOverdue(a)}
                    onToggle={toggle}
                    onDelete={remove}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <ActivityComposer
        open={composerOpen}
        defaultDate={selectedDate}
        onOpenChange={setComposerOpen}
        onCreate={create}
      />
    </div>
  )
}
