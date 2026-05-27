"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { IconClock, IconPlus, IconChevronDown, IconCheck } from "@tabler/icons-react"
import { InputGlass } from "./input-glass"
import { TabsGlass, type TabItem } from "./tabs-glass"
import { ConversationCard, type Conversation } from "./conversation-card"

interface ConversationColumnProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation?: (id: string) => void
  className?: string
  // ── Props CONTROLADOS ───────────────────────────────────────────
  searchValue?: string
  onSearchChange?: (value: string) => void
  /**
   * Tabs do backend. Quando fornecido, controla a UI por completo
   * (sem filtro local). Quando ausente, usamos as 3 tabs do v0
   * (Todas/Não lidas/Atribuídas).
   */
  tabsOverride?: ReadonlyArray<TabItem>
  activeTabIndex?: number
  onTabChange?: (index: number) => void
  /**
   * Quando true, esconde a faixa de `<TabsGlass>` e usa SOMENTE o
   * dropdown do banner "Aguardando resposta" como seletor de status.
   * Util quando a UX prefere uma unica entrada de selecao.
   */
  hideTabs?: boolean
  /** Label exibido no banner do dropdown (default "Aguardando resposta"). */
  awaitingLabel?: string
  /** Numero exibido no badge do banner. Quando undefined, usa `conversations.length`. */
  awaitingCount?: number | null
  /** Badge de urgencia (relogio vermelho) no header. */
  urgencyCount?: number
  /** Acao do botao "+" no header (criar nova conversa). */
  onNewConversation?: () => void
}

const DEFAULT_TABS: TabItem[] = [
  { label: "Todas" },
  { label: "Não lidas" },
  { label: "Atribuídas" },
]

export function ConversationColumn({
  conversations,
  activeConversationId,
  onSelectConversation,
  className,
  searchValue,
  onSearchChange,
  tabsOverride,
  activeTabIndex,
  onTabChange,
  hideTabs,
  awaitingLabel,
  awaitingCount,
  urgencyCount,
  onNewConversation,
}: ConversationColumnProps) {
  const [internalTab, setInternalTab] = useState(0)
  const isControlledTabs = tabsOverride !== undefined
  const tabs: ReadonlyArray<TabItem> = isControlledTabs ? tabsOverride : DEFAULT_TABS
  const activeTab = isControlledTabs ? (activeTabIndex ?? 0) : internalTab
  const handleTabChange = (index: number) => {
    if (isControlledTabs) onTabChange?.(index)
    else setInternalTab(index)
  }

  const isControlledSearch = onSearchChange !== undefined
  const [internalSearch, setInternalSearch] = useState("")
  const searchVal = isControlledSearch ? (searchValue ?? "") : internalSearch
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isControlledSearch) onSearchChange?.(e.target.value)
    else setInternalSearch(e.target.value)
  }

  const displayed = isControlledTabs
    ? conversations
    : conversations.filter((conv) => {
        if (activeTab === 1) return conv.urgent
        if (activeTab === 2) return conv.assignee
        return true
      })

  const urgency = urgencyCount ?? conversations.filter((c) => c.urgent).length

  const currentTabLabel =
    awaitingLabel ?? (tabs[activeTab]?.label || "Aguardando resposta")
  const currentTabCount =
    awaitingCount !== undefined && awaitingCount !== null
      ? awaitingCount
      : (tabs[activeTab]?.count ?? conversations.length)

  // ── Dropdown do banner ─────────────────────────────────────────
  const dropdownBtnRef = useRef<HTMLButtonElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const el = dropdownBtnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width })
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (el && el.contains(target)) return
      setDropdownOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [dropdownOpen])

  return (
    <section
      aria-label="Lista de conversas"
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 pb-4 pt-[22px] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            Conversas
          </h2>
          {urgency > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/12 px-2.5 py-0.5 font-display text-[11px] font-bold text-[var(--color-danger-text)]">
              <IconClock size={12} />
              {urgency}
            </span>
          )}
        </div>
        <button
          type="button"
          title="Nova conversa"
          onClick={onNewConversation}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
        >
          <IconPlus size={18} />
        </button>
      </div>

      {/* Search */}
      <InputGlass
        withSearch
        placeholder="Buscar conversa..."
        className="mb-3"
        value={searchVal}
        onChange={handleSearchChange}
      />

      {/* Tabs — opcionais */}
      {!hideTabs && (
        <TabsGlass
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="mb-3"
        />
      )}

      {/* Banner / Dropdown de status */}
      <button
        ref={dropdownBtnRef}
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="mb-3 flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 text-left backdrop-blur-sm shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-lead)]/25 bg-[var(--color-lead-bg)] text-[var(--color-lead)]">
          <IconClock size={15} />
        </span>
        <span className="flex-1 truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
          {currentTabLabel}
        </span>
        <span className="rounded-full bg-[var(--brand-primary)] px-2.5 py-0.5 font-display text-[11px] font-bold text-white">
          {currentTabCount}
        </span>
        <IconChevronDown
          size={16}
          className={cn(
            "text-[var(--text-muted)] transition-transform",
            dropdownOpen && "rotate-180",
          )}
        />
      </button>

      {dropdownOpen &&
        dropdownPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="menu"
            className="fixed z-[100] flex flex-col gap-0.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              isolation: "isolate",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {tabs.map((tab, idx) => {
              const isActive = activeTab === idx
              return (
                <button
                  key={`${tab.label}-${idx}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    handleTabChange(idx)
                    setDropdownOpen(false)
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-left font-display text-[13px] font-semibold transition-colors",
                    isActive
                      ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]",
                  )}
                >
                  <span className="flex flex-1 items-center gap-2">
                    {isActive && <IconCheck size={14} />}
                    <span className={cn(!isActive && "pl-[18px]")}>{tab.label}</span>
                  </span>
                  {tab.count !== undefined && tab.count !== null && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10.5px] font-bold tabular-nums",
                        isActive
                          ? "bg-[var(--brand-primary)] text-white"
                          : "bg-black/[0.06] text-[var(--text-muted)]",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>,
          document.body,
        )}

      {/* Lista */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {displayed.map((conversation) => (
          <ConversationCard
            key={conversation.id}
            conversation={{
              ...conversation,
              active: conversation.id === activeConversationId,
            }}
            onClick={() => onSelectConversation?.(conversation.id)}
          />
        ))}
        {displayed.length === 0 && (
          <div className="px-2 py-6 text-center text-[12px] text-[var(--text-muted)]">
            Nenhuma conversa encontrada.
          </div>
        )}
      </div>
    </section>
  )
}
