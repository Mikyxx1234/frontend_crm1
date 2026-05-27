"use client"

import { useState, type ChangeEvent } from "react"
import { cn } from "@/lib/utils"
import { IconClock, IconPlus, IconChevronDown } from "@tabler/icons-react"
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
  awaitingLabel = "Aguardando resposta",
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

  const urgency =
    urgencyCount ?? conversations.filter((c) => c.urgent).length

  const awaiting =
    awaitingCount !== undefined && awaitingCount !== null
      ? awaitingCount
      : conversations.length

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

      {/* Tabs */}
      <TabsGlass
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        className="mb-3"
      />

      {/* Aguardando resposta — banner colapsavel */}
      <button
        type="button"
        className="mb-3 flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 text-left backdrop-blur-sm shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-lead)]/25 bg-[var(--color-lead-bg)] text-[var(--color-lead)]">
          <IconClock size={15} />
        </span>
        <span className="flex-1 font-display text-[13px] font-semibold text-[var(--text-primary)]">
          {awaitingLabel}
        </span>
        <span className="rounded-full bg-[var(--brand-primary)] px-2.5 py-0.5 font-display text-[11px] font-bold text-white">
          {awaiting}
        </span>
        <IconChevronDown size={16} className="text-[var(--text-muted)]" />
      </button>

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
