"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { BadgeGlass } from "./badge-glass"
import { InputGlass } from "./input-glass"
import { TabsGlass } from "./tabs-glass"
import { ConversationCard, type Conversation } from "./conversation-card"

interface ConversationColumnProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation?: (id: string) => void
  className?: string
}

export function ConversationColumn({
  conversations,
  activeConversationId,
  onSelectConversation,
  className,
}: ConversationColumnProps) {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ["Todas", "Não lidas", "Atribuídas"]

  const filteredConversations = conversations.filter((conv) => {
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
          Aguardando resposta
        </span>
        <BadgeGlass variant="enterprise">47</BadgeGlass>
      </div>

      <InputGlass
        withSearch
        placeholder="Buscar conversa..."
        className="mb-3"
      />

      <TabsGlass
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-3.5"
      />

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {filteredConversations.map((conversation) => (
          <ConversationCard
            key={conversation.id}
            conversation={{
              ...conversation,
              active: conversation.id === activeConversationId,
            }}
            onClick={() => onSelectConversation?.(conversation.id)}
          />
        ))}
      </div>
    </section>
  )
}
