"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import {
  IconClock,
  IconPlus,
  IconChevronDown,
  IconCheck,
  IconMessages,
  IconInbox,
  IconCornerUpLeft,
  IconCircleCheck,
  type Icon as TablerIcon,
} from "@tabler/icons-react"
import { InputGlass } from "./input-glass"
import { type TabItem } from "./tabs-glass"
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
  /** Badge de urgencia (relogio vermelho) no header. */
  urgencyCount?: number
  /** Acao do botao "+" no header (criar nova conversa). */
  onNewConversation?: () => void
  /**
   * Slot opcional renderizado no canto direito do header (ao lado do
   * título "Conversas"). Usado para o botão de filtros do inbox-v2.
   */
  filterSlot?: React.ReactNode
  /**
   * Slot opcional para um handle de redimensionamento (`ColumnResizer`).
   * O componente é renderizado dentro de um wrapper `position: relative`,
   * então um handle com `position: absolute right: -6px` se ancora bem.
   */
  resizerSlot?: React.ReactNode
  /**
   * Visual do header. Por default (`minimal`) só o título "Conversas".
   * Use `full` para exibir o badge de urgência e o botão "+" (legado v0).
   */
  headerVariant?: "minimal" | "full"
  /**
   * Esconde a linha de busca + filtro do topo da coluna. Usado quando
   * esses controles foram elevados para o header da página (layout
   * `/v2/inbox`), evitando duplicidade. O seletor de status (dropdown)
   * permanece como primeiro elemento.
   */
  hideSearch?: boolean
  /**
   * Renderiza slots específicos por card (tags / assignee popovers).
   * O callback recebe a conversation e devolve os nodes que serão
   * injetados em `tagsSlot` e `assigneeSlot` do `ConversationCard`.
   * Mantido fora dos dados pra evitar incluir JSX no objeto serializável
   * que sai do adapter.
   */
  renderCardSlots?: (conversation: Conversation) => {
    tagsSlot?: React.ReactNode
    assigneeSlot?: React.ReactNode
  }
}

const DEFAULT_TABS: TabItem[] = [
  { label: "Todas" },
  { label: "Não lidas" },
  { label: "Atribuídas" },
]

/**
 * Mapeia o label do status (normalizado) para ícone + cores do
 * "selo" da pílula. Permite que o ícone reflita a escolha atual em
 * vez de um relógio fixo. Cai num default neutro quando não casa.
 */
function statusVisual(label: string | undefined): {
  Icon: TablerIcon
  bg: string
  fg: string
} {
  const l = (label ?? "").toLowerCase()
  if (l.includes("todas") || l.includes("todos"))
    return {
      Icon: IconMessages,
      bg: "var(--color-enterprise-bg)",
      fg: "var(--brand-primary)",
    }
  if (l.includes("aguard") || l.includes("esperando"))
    return { Icon: IconClock, bg: "var(--color-lead-bg)", fg: "var(--color-lead)" }
  if (l.includes("entrada"))
    return {
      Icon: IconInbox,
      bg: "rgba(59,130,246,0.14)",
      fg: "var(--color-info)",
    }
  if (l.includes("respond"))
    return {
      Icon: IconCornerUpLeft,
      bg: "var(--color-enterprise-bg)",
      fg: "var(--brand-primary)",
    }
  if (l.includes("resolv") || l.includes("finaliz"))
    return {
      Icon: IconCircleCheck,
      bg: "var(--color-success-bg)",
      fg: "var(--color-success)",
    }
  return { Icon: IconClock, bg: "var(--color-lead-bg)", fg: "var(--color-lead)" }
}

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
  urgencyCount,
  onNewConversation,
  resizerSlot,
  headerVariant = "minimal",
  renderCardSlots,
  filterSlot,
  hideSearch = false,
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

  const currentTabLabel = tabs[activeTab]?.label ?? "Todas"
  const currentTabCount = tabs[activeTab]?.count ?? conversations.length
  const currentVisual = statusVisual(currentTabLabel)

  // ── Dropdown de status ──────────────────────────────────────────
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
        "relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-4 pb-4 pt-4 backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      {resizerSlot}
      {/* Busca + filtros inline (título "Conversas" removido). A variante
          `full` mantém o badge de urgência e o botão "+" do design v0.
          Quando `hideSearch`, esses controles vivem no header da página. */}
      {!hideSearch && (
        <div className="mb-3 flex items-center gap-2">
          <InputGlass
            withSearch
            placeholder="Buscar conversa..."
            className="flex-1"
            value={searchVal}
            onChange={handleSearchChange}
          />
          {headerVariant === "full" && urgency > 0 && (
            <span className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/12 px-2.5 font-display text-[11px] font-bold text-[var(--color-danger-text)]">
              <IconClock size={12} />
              {urgency}
            </span>
          )}
          {headerVariant === "full" && (
            <TooltipGlass label="Nova conversa" side="top">
              <button
                type="button"
                aria-label="Nova conversa"
                onClick={onNewConversation}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
              >
                <IconPlus size={18} />
              </button>
            </TooltipGlass>
          )}
        </div>
      )}

      {/* Seletor de status + toggle de filtro na mesma linha */}
      <div className="mb-3 flex items-center gap-2">
      <button
        ref={dropdownBtnRef}
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
        className="flex flex-1 items-center gap-2.5 rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2 py-1.5 pr-3 text-left shadow-[0_2px_10px_rgba(100,130,180,0.12)] backdrop-blur-sm transition-shadow hover:shadow-[0_3px_14px_rgba(100,130,180,0.20)]"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: currentVisual.bg, color: currentVisual.fg }}
        >
          <currentVisual.Icon size={15} stroke={2.2} />
        </span>
        <span className="flex-1 truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
          {currentTabLabel}
        </span>
        <span className="rounded-full bg-[var(--brand-primary)] px-2.5 py-0.5 font-display text-[11px] font-bold text-white tabular-nums">
          {currentTabCount}
        </span>
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform",
            dropdownOpen && "rotate-180",
          )}
        />
      </button>
      {filterSlot}
      </div>

      {dropdownOpen &&
        dropdownPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="listbox"
            className="fixed z-[100] flex flex-col gap-0.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl"
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
              const v = statusVisual(tab.label)
              return (
                <button
                  key={`${tab.label}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
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
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: v.bg, color: v.fg }}
                    >
                      <v.Icon size={12} stroke={2.2} />
                    </span>
                    <span>{tab.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {isActive && (
                      <IconCheck size={14} className="text-[var(--brand-primary)]" />
                    )}
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
                  </span>
                </button>
              )
            })}
          </div>,
          document.body,
        )}

      {/* Lista */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {displayed.map((conversation) => {
          const slots = renderCardSlots?.(conversation)
          return (
            <ConversationCard
              key={conversation.id}
              conversation={{
                ...conversation,
                active: conversation.id === activeConversationId,
              }}
              onClick={() => onSelectConversation?.(conversation.id)}
              tagsSlot={slots?.tagsSlot}
              assigneeSlot={slots?.assigneeSlot}
            />
          )
        })}
        {displayed.length === 0 && (
          <div className="px-2 py-6 text-center text-[12px] text-[var(--text-muted)]">
            Nenhuma conversa encontrada.
          </div>
        )}
      </div>
    </section>
  )
}
