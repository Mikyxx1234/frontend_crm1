"use client"

import {
  IconMessageCircle,
  IconChecklist,
  IconNote,
  IconClock,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export type ConversationTabId = "conversa" | "atividades" | "notas" | "timeline"

export interface ConversationTabConfig {
  id: ConversationTabId
  label: string
  icon: React.ComponentType<{ size?: number }>
  count?: number
}

/** Configuração padrão das abas (Conversa / Atividades / Notas / Timeline). */
export const DEFAULT_CONVERSATION_TABS: ConversationTabConfig[] = [
  { id: "conversa", label: "Conversa", icon: IconMessageCircle },
  { id: "atividades", label: "Atividades", icon: IconChecklist },
  { id: "notas", label: "Notas", icon: IconNote },
  { id: "timeline", label: "Timeline", icon: IconClock },
]

/**
 * Barra de abas compartilhada entre o DealDetailPanel e o Inbox.
 * Mantém o mesmo visual glass (pill com botões arredondados) para
 * garantir consistência entre as duas telas.
 */
export function ConversationTabs({
  activeTab,
  onChange,
  tabs = DEFAULT_CONVERSATION_TABS,
  rightSlot,
}: {
  activeTab: ConversationTabId
  onChange: (id: ConversationTabId) => void
  tabs?: ConversationTabConfig[]
  /**
   * Conteúdo opcional alinhado à direita, na MESMA linha das abas
   * (ex.: nome do contato + menu de ações no Inbox). Evita empilhar
   * a barra de abas e o cabeçalho do chat em duas linhas separadas.
   */
  rightSlot?: React.ReactNode
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3">
      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-[12px] font-bold transition-all",
                isActive
                  ? "bg-[var(--brand-primary)] text-white shadow-[var(--glass-shadow-sm)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              <Icon size={14} />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 font-display text-[10px] font-bold",
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {rightSlot && (
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {rightSlot}
        </div>
      )}
    </header>
  )
}
