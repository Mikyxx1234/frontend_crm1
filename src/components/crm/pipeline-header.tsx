"use client"

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
import { useState } from "react"

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
}

export function PipelineHeader({
  activeTab = "abertos",
  onTabChange,
  activeView = "kanban",
  onViewChange,
  pipelineNameSlot,
  tabCounts,
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
    <>
      <header className="bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-xl)] px-5 py-3.5 flex items-center gap-4 shadow-[var(--glass-shadow)]">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[14px] text-[var(--text-muted)] font-medium cursor-pointer">Funil</span>
          <IconChevronRight size={12} className="text-[var(--text-muted)]" />
          {pipelineNameSlot ?? (
            <span className="font-display text-[14px] text-[var(--text-primary)] font-semibold cursor-pointer">
              Pipeline Principal
            </span>
          )}
        </div>

        <div className="flex-1 max-w-[420px] relative">
          <input
            type="text"
            placeholder="Buscar e filtrar..."
            className="w-full font-body text-[13px] text-[var(--text-primary)] bg-[var(--glass-bg-overlay)] backdrop-blur-[8px] border border-[var(--glass-border)] rounded-full py-2 pl-[38px] pr-3.5 outline-none placeholder:text-[var(--text-muted)]"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="font-display text-[12px] font-semibold rounded-full px-3 py-[5px] cursor-pointer bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-overlay)] transition-all inline-flex items-center gap-1.5 whitespace-nowrap">
            <IconFilter size={14} /> Filtros
          </button>
          <button className="font-display text-[12px] font-semibold rounded-full px-3 py-[5px] cursor-pointer bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-overlay)] transition-all inline-flex items-center gap-1.5 whitespace-nowrap">
            <IconBookmark size={14} /> Salvos
          </button>

          <div className="flex items-center gap-1 bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-[3px]">
            <button
              onClick={() => handleViewChange("grid")}
              title="Grid"
              className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer transition-all ${
                view === "grid"
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.35)]"
                  : "bg-transparent text-[var(--text-muted)]"
              }`}
            >
              <IconLayoutGrid size={15} />
            </button>
            <button
              onClick={() => handleViewChange("kanban")}
              title="Kanban"
              className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer transition-all ${
                view === "kanban"
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.35)]"
                  : "bg-transparent text-[var(--text-muted)]"
              }`}
            >
              <IconLayoutKanban size={15} />
            </button>
            <button
              onClick={() => handleViewChange("list")}
              title="Lista"
              className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer transition-all ${
                view === "list"
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.35)]"
                  : "bg-transparent text-[var(--text-muted)]"
              }`}
            >
              <IconList size={15} />
            </button>
          </div>

          <button className="font-display text-[12px] font-semibold rounded-full px-3 py-[5px] cursor-pointer bg-transparent text-[var(--text-secondary)] border border-transparent hover:bg-[var(--glass-bg-strong)] transition-all inline-flex items-center gap-1.5 whitespace-nowrap">
            <IconUser size={14} /> Meus
          </button>
          <button
            className="font-display text-[12px] font-semibold rounded-full px-3 py-[5px] cursor-pointer bg-transparent border border-transparent hover:bg-[var(--glass-bg-strong)] transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
            style={{ color: "var(--color-warning-text)" }}
          >
            <IconAlertTriangle size={14} /> Urgentes
          </button>
          <button className="font-display text-[12px] font-semibold rounded-full px-4 py-[5px] cursor-pointer bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] hover:bg-[var(--brand-primary-dark)] hover:-translate-y-px transition-all inline-flex items-center gap-1.5 whitespace-nowrap">
            <IconPlus size={14} /> Novo
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          {tabs.map((t) => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`font-display text-[13px] font-semibold py-2 px-[18px] rounded-full cursor-pointer transition-all inline-flex items-center gap-2 ${
                  isActive
                    ? "bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]"
                    : "bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]"
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`text-[11px] font-bold px-[7px] py-px rounded-full ${
                      isActive
                        ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                        : "bg-[rgba(163,163,163,0.15)] text-[var(--text-muted)]"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
