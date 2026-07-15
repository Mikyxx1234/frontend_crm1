"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PageHeader, type PageHeaderBack } from "@/components/crm/page-header"
import { SearchInput } from "@/components/crm/search-input"
import {
  PageGhostButton,
  PagePrimaryButton,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar"
import {
  IconFilter,
  IconBookmark,
  IconLayoutKanban,
  IconList,
  IconPlus,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconGridDots,
} from "@tabler/icons-react"

type TabId = "abertos" | "ganhos" | "perdidos" | "todos"
type ViewType = "kanban" | "list"

/**
 * Itens do seletor de visão — mesmo padrão do /contacts
 * (`PageSegmentedControl size="compact"` com ícone + rótulo).
 */
const VIEW_ITEMS = [
  {
    value: "kanban",
    label: (
      <span className="flex items-center gap-1.5">
        <IconLayoutKanban size={14} />
        Kanban
      </span>
    ),
  },
  {
    value: "list",
    label: (
      <span className="flex items-center gap-1.5">
        <IconList size={14} />
        Lista
      </span>
    ),
  },
] as const

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
  /**
   * Substitui toda a faixa de abas de status (Abertos/Ganhos/Perdidos/Todos)
   * por um nó arbitrário. Útil para reutilizar o shell do PipelineHeader em
   * telas que não usam o conceito de status (ex.: /settings/pipeline).
   */
  tabsOverride?: React.ReactNode
  /**
   * Slot para ícone/botão de configurações — renderizado inline na barra
   * secundária, logo após o separador do pipelineNameSlot. Posição correta
   * conforme protótipo v0: colado ao PipelineSwitcher, antes das tabs.
   */
  settingsSlot?: React.ReactNode
  /**
   * Quando true, suprime os botões de ação do header (Filtros, Salvos,
   * toggle kanban/lista e +Novo). Útil em telas de configuração onde
   * esses controles não fazem sentido.
   */
  hideActions?: boolean
  /**
   * Voltar ao hub/pai — chevron à esquerda do título (mesmo padrão de
   * SettingsV2Shell / SETTINGS_HUB_BACK). Usado em /settings/pipeline.
   */
  back?: PageHeaderBack
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
  tabsOverride,
  settingsSlot,
  hideActions = false,
  back,
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

  const actionButtons = !hideActions ? (
    <>
      <PageGhostButton
        ref={filtersButtonRef}
        type="button"
        onClick={onFiltersClick}
        active={activeFiltersCount > 0}
        className={cn("shrink-0", activeFiltersCount > 0 ? "px-3.5" : undefined)}
      >
        <IconFilter size={15} /> Filtros
        {activeFiltersCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold tabular-nums text-white">
            {activeFiltersCount}
          </span>
        )}
      </PageGhostButton>
      <PageGhostButton type="button" className="shrink-0 px-3.5">
        <IconBookmark size={15} /> Salvos
      </PageGhostButton>
      <PageSegmentedControl
        items={VIEW_ITEMS}
        value={view}
        onChange={(v) => handleViewChange(v as ViewType)}
        aria-label="Modo de visualização"
        size="compact"
        className="shrink-0"
      />
      <PagePrimaryButton type="button" onClick={onNewDeal} disabled={!onNewDeal} className="shrink-0">
        <IconPlus size={15} stroke={2.4} /> Novo
      </PagePrimaryButton>
    </>
  ) : null

  return (
    <div className="flex flex-col gap-2">
      {/* Desktop (lg+): título | busca | ações na mesma linha (PageHeader).
          Mobile: título + faixa rolável — mantido pelo próprio PageHeader. */}
      <PageHeader
        back={back}
        icon={<IconLayoutKanban size={22} stroke={2.2} />}
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
        actions={actionButtons ? <div className="flex items-center gap-2">{actionButtons}</div> : undefined}
      />

      {/* Secondary row: pipeline switcher + status tabs */}
      <div className="toolbar-hscroll flex flex-nowrap items-center gap-2 px-1">
        {pipelineNameSlot && (
          <div className="mr-1.5 flex shrink-0 items-center gap-1.5 border-r border-black/[0.06] pr-2.5">
            {pipelineNameSlot}
            {settingsSlot}
          </div>
        )}

        {tabsOverride ?? (
          <div className="flex shrink-0 items-center gap-0.5">
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
        )}
      </div>
    </div>
  )
}
