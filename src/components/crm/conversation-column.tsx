"use client"

import { useState, type ChangeEvent } from "react"
import { cn } from "@/lib/utils"
import { BadgeGlass } from "./badge-glass"
import { InputGlass } from "./input-glass"
import { TabsGlass, type TabItem } from "./tabs-glass"
import { ConversationCard, type Conversation } from "./conversation-card"

interface ConversationColumnProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation?: (id: string) => void
  className?: string
  /**
   * Props CONTROLADOS — quando fornecidos, o componente usa o
   * estado externo no lugar do filtro local. Mantém o comportamento
   * legado (filtro client-side "Todas / Não lidas / Atribuídas")
   * quando nenhuma das props abaixo é passada.
   */
  searchValue?: string
  onSearchChange?: (value: string) => void
  tabsOverride?: ReadonlyArray<TabItem>
  activeTabIndex?: number
  onTabChange?: (index: number) => void
  awaitingLabel?: string
  awaitingCount?: number | null
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
  awaitingLabel = "Aguardando resposta",
  awaitingCount,
}: ConversationColumnProps) {
  // ── Tabs ────────────────────────────────────────────────────────
  // Modo controlled vs uncontrolled. Quando `tabsOverride` é dado,
  // confiamos 100% no caller para filtrar e ordenar (backend tabs).
  const [internalTab, setInternalTab] = useState(0)
  const isControlledTabs = tabsOverride !== undefined
  const tabs: ReadonlyArray<TabItem> = isControlledTabs ? tabsOverride : DEFAULT_TABS
  const activeTab = isControlledTabs ? (activeTabIndex ?? 0) : internalTab
  const handleTabChange = (index: number) => {
    if (isControlledTabs) onTabChange?.(index)
    else setInternalTab(index)
  }

  // ── Search ──────────────────────────────────────────────────────
  const isControlledSearch = onSearchChange !== undefined
  const [internalSearch, setInternalSearch] = useState("")
  const searchVal = isControlledSearch ? (searchValue ?? "") : internalSearch
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isControlledSearch) onSearchChange?.(e.target.value)
    else setInternalSearch(e.target.value)
  }

  // ── Filtro de exibição ─────────────────────────────────────────
  // Quando controlled, NAO filtra (caller ja entregou a lista certa).
  // Quando uncontrolled, aplica filtro local legado.
  const displayed = isControlledTabs
    ? conversations
    : conversations.filter((conv) => {
        if (activeTab === 1) return conv.unread && conv.unread > 0
        if (activeTab === 2) return conv.assignee
        return true
      })

  return (
    <section
      aria-label="Lista de conversas"
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3.5 pb-3.5 pt-[18px] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className
      )}
    >
      <h2 className="mb-3 px-1 font-display text-lg font-bold text-[var(--text-primary)]">
        Conversas
      </h2>

      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {awaitingLabel}
        </span>
        <BadgeGlass variant="enterprise">
          {awaitingCount !== undefined && awaitingCount !== null
            ? awaitingCount
            : conversations.length}
        </BadgeGlass>
      </div>

      <InputGlass
        withSearch
        placeholder="Buscar conversa..."
        className="mb-3"
        value={searchVal}
        onChange={handleSearchChange}
      />

      <TabsGlass
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        className="mb-3.5"
      />

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
