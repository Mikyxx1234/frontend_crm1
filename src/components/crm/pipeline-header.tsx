"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/crm/page-header"
import { SearchInput } from "@/components/crm/search-input"
import {
  IconFilter,
  IconBookmark,
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
type ViewType = "kanban" | "list"

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
  /** Valor da busca. Quando `onSearchChange` existe, exibe a barra padrao. */
  search?: string
  /** Handler da busca. Sem ele, a barra de busca nao e renderizada. */
  onSearchChange?: (value: string) => void
  /** Placeholder da busca. */
  searchPlaceholder?: string
  /** Handler do botao "Novo". Sem ele o botao fica desabilitado. */
  onNewDeal?: () => void
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
  search,
  onSearchChange,
  searchPlaceholder = "Buscar por título, contato...",
  onNewDeal,
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
    <div className="flex flex-col gap-3">
      <PageHeader
        icon={<IconLayoutKanban size={22} />}
        title="Pipeline"
        description="Acompanhe e mova seus negócios pelas etapas do funil."
        center={
          onSearchChange ? (
            <SearchInput
              value={search ?? ""}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              ref={filtersButtonRef}
              type="button"
              onClick={onFiltersClick}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 font-display text-[13px] font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-white"
              style={
                activeFiltersCount > 0
                  ? {
                      borderColor: "var(--brand-primary, #5b6ff5)",
                      background: "rgba(91,111,245,0.12)",
                    }
                  : undefined
              }
            >
              <IconFilter size={15} /> Filtros
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
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 font-display text-[13px] font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-white"
            >
              <IconBookmark size={15} /> Salvos
            </button>

            <div className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1 shadow-[var(--glass-shadow-sm)]">
              {(
                [
                  { id: "kanban", icon: <IconLayoutKanban size={15} />, title: "Pipeline" },
                  { id: "list", icon: <IconList size={15} />, title: "Lista" },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleViewChange(v.id as ViewType)}
                  title={v.title}
                  className={cn(
                    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all",
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
              onClick={onNewDeal}
              disabled={!onNewDeal}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <IconPlus size={16} /> Novo
            </button>
          </div>
        }
      />

      {/* Abas de status + seletor de pipeline + filtros rápidos */}
      <div className="flex items-center gap-2 px-1">
        {pipelineNameSlot && (
          <div className="mr-1.5 border-r border-black/[0.06] pr-2.5">
            {pipelineNameSlot}
          </div>
        )}

        <div className="flex items-center gap-0.5">
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
        </div>
      </div>
    </div>
  )
}
