"use client"

import { useMemo, useState } from "react"
import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { ActivityCalendar } from "@/components/crm/activities/activity-calendar"
import { ActivityRow } from "@/components/crm/activities/activity-row"
import { ActivityComposer } from "@/components/crm/activities/activity-composer"
import { ActivitiesUrgentCard } from "@/components/crm/activities/activities-urgent-card"
import { ActivitiesWeeklySummary } from "@/components/crm/activities/activities-weekly-summary"
import {
  OperationsBaseCard,
  ProductivityTipCard,
} from "@/components/crm/activities/activities-static-cards"
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
import { PageHeader } from "@/components/crm/page-header"
import { PageDemoBanner } from "@/components/crm/page-demo-banner"
import {
  PagePrimaryButton,
  PageSegmentedControl,
  PageToolbarRow,
} from "@/components/crm/page-toolbar"
import { cn } from "@/lib/utils"
import { IconCalendarEvent, IconPlus } from "@tabler/icons-react"
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
import { MOCK_ACTIVITIES_PAGE } from "@/features/directory-v2/mock-activities"
import { shouldAutoDemoEmpty } from "@/lib/page-mock-mode"

type StatusFilter = "todas" | "pendentes" | "concluidas" | "atrasadas"

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendentes", label: "Pendentes" },
  { key: "concluidas", label: "Concluídas" },
  { key: "atrasadas", label: "Atrasadas" },
]

const AGENDA_LEGEND: ActivityKind[] = ["tarefa", "reuniao", "ligacao", "evento"]

const PANEL =
  "rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow)] backdrop-blur-md"

const isOverdue = (a: Activity) =>
  a.status === "pendente" && new Date(a.start).getTime() < Date.now()

function RightColumn({
  items,
  onSelectDate,
}: {
  items: Activity[]
  onSelectDate: (d: Date) => void
}) {
  return (
    <>
      <ActivitiesUrgentCard items={items} onSelect={onSelectDate} />
      <ActivitiesWeeklySummary items={items} />
      <OperationsBaseCard />
    </>
  )
}

export default function V2ActivitiesClientPage() {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas")
  const [kindFilter, setKindFilter] = useState<ActivityKind | "all">("all")
  const [composerOpen, setComposerOpen] = useState(false)

  const activitiesQuery = useActivities({ perPage: 200 })
  const createMutation = useCreateActivity()
  const updateMutation = useUpdateActivity()
  const deleteMutation = useDeleteActivity()

  const realDtos = activitiesQuery.data?.items ?? []
  const isDemo = shouldAutoDemoEmpty({
    realCount: realDtos.length,
    hasFilters: false,
    isLoading: activitiesQuery.isLoading,
    isError: activitiesQuery.isError,
  })

  const items: Activity[] = useMemo(
    () => (isDemo ? MOCK_ACTIVITIES_PAGE.items : realDtos).map(dtoToActivity).filter((a) => a.start),
    [isDemo, realDtos],
  )

  const calendarItems = useMemo(
    () => (kindFilter === "all" ? items : items.filter((a) => a.kind === kindFilter)),
    [items, kindFilter],
  )

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

  const monthTotal = useMemo(
    () =>
      items.filter((a) => {
        const d = new Date(a.start)
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()
      }).length,
    [items, viewDate],
  )

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

  const remove = (id: string) => deleteMutation.mutate(id)

  const markAllDone = () => {
    const nowIso = new Date().toISOString()
    for (const a of dayItems) {
      if (a.status === "concluida") continue
      updateMutation.mutate({
        id: a.id,
        payload: { completed: true, completedAt: nowIso },
      })
    }
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

  const selectDate = (d: Date) => {
    setSelectedDate(d)
    setViewDate(d)
  }

  const isToday = isSameDay(selectedDate, new Date())

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconCalendarEvent size={22} stroke={2.2} />}
          title="Atividades"
          description="Agende e acompanhe tarefas, reuniões, ligações e eventos."
          actions={
            <PagePrimaryButton type="button" onClick={() => setComposerOpen(true)}>
              <IconPlus size={15} stroke={2.4} /> Nova atividade
            </PagePrimaryButton>
          }
        />

        <PageToolbarRow>
          <PageSegmentedControl
            aria-label="Filtrar atividades"
            items={STATUS_FILTERS.map((f) => ({
              value: f.key,
              label: f.label,
            }))}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
          />
        </PageToolbarRow>

        {isDemo && (
          <PageDemoBanner>
            Dados de exemplo — atividades ilustrativas para visualizar o calendário e a agenda.
          </PageDemoBanner>
        )}

        {/* Layout 3 colunas */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">
          {/* Coluna esquerda */}
          <div className="flex min-h-0 flex-col gap-4 overflow-auto">
            <section aria-label="Calendário" className={cn(PANEL, "p-4")}>
              <ActivityCalendar
                viewDate={viewDate}
                selectedDate={selectedDate}
                activities={calendarItems}
                onSelectDate={setSelectedDate}
                onChangeMonth={setViewDate}
              />
            </section>

            <section aria-label="Tipos de atividade" className={cn(PANEL, "p-4")}>
              <p className="mb-3 font-display text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-muted)]">
                Este mês
              </p>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setKindFilter("all")}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors",
                    kindFilter === "all"
                      ? "bg-[var(--color-enterprise-bg)]"
                      : "hover:bg-[var(--glass-bg-overlay)]",
                  )}
                >
                  <span
                    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                    style={{
                      backgroundColor: "rgba(91,111,245,0.14)",
                      color: "var(--color-task, var(--brand-primary))",
                    }}
                  >
                    <IconCalendarEvent size={15} stroke={2.2} />
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-left font-display text-[13px] font-bold",
                      kindFilter === "all"
                        ? "text-[var(--brand-primary)]"
                        : "text-[var(--text-secondary)]",
                    )}
                  >
                    Todas
                  </span>
                  <span className="min-w-[24px] rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-[7px] py-px text-center font-mono text-[12.5px] font-semibold text-[var(--text-muted)]">
                    {monthTotal}
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
                        "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors",
                        active
                          ? "bg-[var(--color-enterprise-bg)]"
                          : "hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      <span
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                        style={{ backgroundColor: meta.softBg, color: meta.color }}
                      >
                        <Icon size={15} stroke={2.2} />
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-left font-display text-[13px] font-bold",
                          active
                            ? "text-[var(--brand-primary)]"
                            : "text-[var(--text-secondary)]",
                        )}
                      >
                        {meta.plural}
                      </span>
                      <span className="min-w-[24px] rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-[7px] py-px text-center font-mono text-[12.5px] font-semibold text-[var(--text-muted)]">
                        {monthSummary[kind]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Coluna central */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <section
              aria-label="Agenda do dia"
              className={cn(PANEL, "flex min-h-[520px] flex-1 flex-col overflow-hidden p-0")}
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-[18px] py-4">
                <div className="min-w-0">
                  <h2 className="font-display text-[17px] font-extrabold capitalize tracking-tight text-[var(--text-primary)]">
                    {longDateLabel(selectedDate)}
                  </h2>
                  <p className="mt-px font-body text-[12.5px] text-[var(--text-muted)]">
                    {dayItems.length}{" "}
                    {dayItems.length === 1 ? "atividade" : "atividades"}
                    {isToday ? " para hoje" : ""}
                    {dayItems.some((a) => a.status !== "concluida") && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={markAllDone}
                          className="cursor-pointer font-display font-semibold text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary-dark)]"
                        >
                          Marcar todas como concluídas
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 font-body text-[11px] text-[var(--text-muted)]">
                  {AGENDA_LEGEND.map((kind) => {
                    const meta = ACTIVITY_KINDS[kind]
                    return (
                      <span key={kind} className="inline-flex items-center gap-1">
                        <i
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-4">
                {dayItems.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-10">
                    <div className="max-w-[320px] text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
                        <IconCalendarEvent size={28} />
                      </div>
                      <h3 className="font-display text-[15px] font-extrabold text-[var(--text-primary)]">
                        Nenhuma atividade neste dia
                      </h3>
                      <p className="mt-1 mb-4 font-body text-[13px] text-[var(--text-muted)]">
                        Clique em “Nova atividade” para agendar uma tarefa, reunião,
                        ligação ou evento.
                      </p>
                      <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
                      >
                        <IconPlus size={16} stroke={2.5} /> Nova atividade
                      </button>
                    </div>
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
            </section>

            <ProductivityTipCard />
          </div>

          {/* Coluna direita — sidebar xl+ */}
          <div className="hidden min-h-0 flex-col gap-4 overflow-auto xl:flex">
            <RightColumn items={items} onSelectDate={selectDate} />
          </div>

          {/* Coluna direita — grid horizontal em telas médias */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:hidden lg:col-span-2">
            <RightColumn items={items} onSelectDate={selectDate} />
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
