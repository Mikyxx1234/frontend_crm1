"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  IconChevronRight,
  IconFilter,
  IconBookmark,
  IconLayoutGrid,
  IconLayoutKanban,
  IconList,
  IconUser,
  IconAlertTriangle,
  IconPlus,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconGridDots,
} from "@tabler/icons-react"

type TabId = "abertos" | "ganhos" | "perdidos" | "todos"
type ViewType = "grid" | "kanban" | "list"

interface PipelineHeaderProps {
  activeTab?: TabId
  onTabChange?: (tab: TabId) => void
  activeView?: ViewType
  onViewChange?: (view: ViewType) => void
  /**
   * Slot opcional que substitui o nome "Pipeline Principal" hardcoded
   * — use para plugar um seletor real (ex.: PipelineSwitcher).
   */
  pipelineNameSlot?: React.ReactNode
  /** Counts dinamicos por aba. Quando undefined, mantem o "14" mock do v0. */
  tabCounts?: Partial<Record<TabId, number>>
  /** Ref no botao Filtros para ancorar popovers. */
  filtersButtonRef?: React.Ref<HTMLButtonElement>
  /** Handler do botao Filtros. Quando ausente, botao fica decorativo. */
  onFiltersClick?: () => void
  /** Numero de filtros ativos — exibe badge ao lado do icone. */
  activeFiltersCount?: number
}

export function PipelineHeader({
  activeTab = "abertos",
  onTabChange,
  activeView = "kanban",
  onViewChange,
  pipelineNameSlot,
  tabCounts,
  filtersButtonRef,
  onFiltersClick,
  activeFiltersCount = 0,
}: PipelineHeaderProps) {
  const [tab, setTab] = useState<TabId>(activeTab)
  const [view, setView] = useState<ViewType>(activeView)

  const handleTabChange = (newTab: TabId) => {
    setTab(newTab)
    onTabChange?.(newTab)
  }

  const handleViewChange = (newView: ViewType) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "abertos", label: "Abertos", icon: <IconClock size={14} />, count: tabCounts?.abertos ?? 14 },
    { id: "ganhos", label: "Ganhos", icon: <IconCircleCheck size={14} />, count: tabCounts?.ganhos },
    { id: "perdidos", label: "Perdidos", icon: <IconCircleX size={14} />, count: tabCounts?.perdidos },
    { id: "todos", label: "Todos", icon: <IconGridDots size={14} />, count: tabCounts?.todos },
  ]

  return (
    <div className="flex items-center gap-3.5 px-1">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 pr-2">
        <span className="font-display text-sm font-medium text-[var(--text-muted)]">Funil</span>
        <IconChevronRight size={12} className="text-[var(--text-muted)]" />
        {pipelineNameSlot ?? (
          <span className="font-display text-sm font-bold text-[var(--text-primary)]">
            Pipeline Principal
          </span>
        )}
      </div>

      {/* Tabs underline */}
      <div className="flex items-center gap-0.5 border-l border-black/[0.06] pl-3.5">
        {tabs.map((t) => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={cn(
                "-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-3.5 py-2 font-display text-[12px] font-bold tracking-[0.04em] transition-all",
                isActive
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-display text-[10px] font-bold",
                    isActive
                      ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                      : "bg-black/[0.06] text-[var(--text-muted)]",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          ref={filtersButtonRef}
          type="button"
          onClick={onFiltersClick}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.06] bg-white px-3 py-1.5 font-display text-xs font-bold text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)]",
          )}
          style={
            activeFiltersCount > 0
              ? {
                  borderColor: "var(--brand-primary, #5b6ff5)",
                  color: "var(--brand-primary, #5b6ff5)",
                  background: "rgba(91,111,245,0.10)",
                }
              : undefined
          }
        >
          <IconFilter size={14} /> Filtros
          {activeFiltersCount > 0 && (
            <span
              className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white"
              style={{ background: "var(--brand-primary, #5b6ff5)" }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.06] bg-white px-3 py-1.5 font-display text-xs font-bold text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)]"
        >
          <IconBookmark size={14} /> Salvos
        </button>

        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-black/[0.06] bg-white p-[3px] shadow-[var(--glass-shadow-sm)]">
          {(
            [
              { id: "grid", icon: <IconLayoutGrid size={15} /> },
              { id: "kanban", icon: <IconLayoutKanban size={15} /> },
              { id: "list", icon: <IconList size={15} /> },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleViewChange(v.id as ViewType)}
              title={v.id}
              className={cn(
                "flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] transition-all",
                view === v.id
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.35)]"
                  : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {v.icon}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-transparent px-3 py-1.5 font-display text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)]"
        >
          <IconUser size={14} /> Meus
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-transparent px-3 py-1.5 font-display text-xs font-semibold transition-colors hover:bg-[var(--glass-bg-strong)]"
          style={{ color: "var(--color-warning-text)" }}
        >
          <IconAlertTriangle size={14} /> Urgentes
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-4 py-1.5 font-display text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
        >
          <IconPlus size={14} /> Novo
        </button>
      </div>
    </div>
  )
}
