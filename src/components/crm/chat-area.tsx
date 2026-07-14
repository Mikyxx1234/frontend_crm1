"use client"

import { Fragment, useRef, useState, useEffect, type FormEvent } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode"
import { getInitials } from "@/lib/utils"
import { BadgeGlass } from "./badge-glass"
import { avatarGradients, channelBadge } from "./conversation-card"
import { MessageBubble, DaySeparator, ConnectionDivider, type Message } from "./message-bubble"
import { SessionAlert } from "./session-alert"
import {
  formatConnectionLabel,
  type ConnectionRef,
} from "@/lib/connection-label"
import {
  IconPhone,
  IconVideo,
  IconDotsVertical,
  IconPaperclip,
  IconMoodSmile,
  IconSend,
  IconMessageCircle,
  IconChecklist,
  IconNote,
  IconClock,
} from "@tabler/icons-react"

export type ChatTabId = "conversa" | "notas" | "atividades" | "timeline" | "chamadas"

const CHAT_TABS: { id: ChatTabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "conversa", label: "Conversa", icon: IconMessageCircle },
  { id: "atividades", label: "Tarefas", icon: IconChecklist },
  { id: "notas", label: "Notas", icon: IconNote },
  { id: "timeline", label: "Timeline", icon: IconClock },
  // IB8: nova aba "Chamadas" no topo do inbox, espelhando a aba
  // homonima do DealDetailPanel para padronizar acesso aos logs de
  // telefonia entre os dois paineis.
  { id: "chamadas", label: "Chamadas", icon: IconPhone },
]

/**
 * Tipo legado mantido para retro-compatibilidade com `toChatContact`
 * em `features/inbox-v2/adapters.ts`. O novo header usa SOMENTE `name`
 * + `badge` + (opcional) `badgeLabel`; demais campos sao ignorados
 * visualmente mas continuam aceitos sem quebrar o consumidor.
 */
interface ChatContact {
  name: string
  badge?: "enterprise" | "lead" | "success"
  badgeLabel?: string
  initials?: string
  /** Chave do gradiente (sunset/forest/ocean/dusk/blue/teal/orange/purple/pink/coral)
      OU string CSS raw (compat com chamadores legados). Quando bater
      com uma chave do `avatarGradients`, renderiza o mesmo gradiente
      da conversation-card — mantendo identidade visual entre a lista
      de conversas e o header do chat. */
  avatarColor?: string
  status?: string
  phone?: string
  contactId?: string
  /** Canal (whatsapp/instagram/facebook/email/…) — quando presente,
      renderiza o badge do canal no canto inferior direito do avatar,
      idêntico ao card da lista de conversas. */
  channel?: string | null
}

interface ChatAreaProps {
  contact: ChatContact
  messages: Message[]
  /** Mantido por compat — nao mais renderizado entre header e mensagens. */
  stages?: { label: string; status: "done" | "active" | "pending" }[]
  daySeparator?: string
  showSessionAlert?: boolean
  className?: string

  /**
   * Conexão ATUAL da conversa (qual WhatsApp/conta). Exibida como chip no
   * header — indica por qual canal a pessoa está conversando agora.
   */
  connection?: ConnectionRef | null
  /**
   * Mapa id→conexão de todos os canais referenciados nas mensagens. Usado
   * para inserir o marcador de troca de conexão na timeline quando a mesma
   * conversa alterna entre contas distintas do canal.
   */
  connections?: Record<string, ConnectionRef>

  // ── Composer controlado (opcional) ──────────────────────────────
  inputValue?: string
  onInputChange?: (value: string) => void
  onSendMessage?: (value: string) => void
  sending?: boolean
  onAttachClick?: () => void
  onEmojiClick?: () => void
  onRecordClick?: () => void
  onPhoneClick?: () => void
  onVideoClick?: () => void
  onMoreClick?: () => void
  inputPlaceholder?: string
  inputDisabled?: boolean

  /**
   * Slot opcional que substitui INTEIRAMENTE o footer (input bar).
   * Quando provido, ignora todos os outros props do composer.
   */
  composerSlot?: React.ReactNode
  /** Slot opcional que substitui os botoes do canto direito do header. */
  headerActionsSlot?: React.ReactNode
  /** Handler do botao "Usar Template" do SessionAlert. */
  onUseTemplate?: () => void

  /**
   * Conteudo das abas opcionais do card. Quando ao menos um e' provido, o
   * card ganha uma barra de abas (Conversa / Atividades / Notas / Timeline).
   * "Conversa" mostra as mensagens + composer; as demais mostram o slot.
   * Sem nenhum slot, o card mantem o comportamento legado (sem abas).
   */
  notesSlot?: React.ReactNode
  activitiesSlot?: React.ReactNode
  timelineSlot?: React.ReactNode
  /** IB8: conteudo da aba "Chamadas" (logs de telefonia). Quando ausente,
   *  a aba "Chamadas" nao aparece. */
  callsSlot?: React.ReactNode
  /** Contagens opcionais exibidas como badge em cada aba. */
  tabCounts?: Partial<Record<ChatTabId, number>>

  // ── Ações nas mensagens recebidas (menu WhatsApp-like) ───────────
  // Passa através para MessageBubble. Se nenhum handler for provido,
  // o menu ainda aparece com "Copiar" (que é interno).
  onReplyMessage?: (message: Message) => void
  onForwardMessage?: (message: Message) => void
  onReactMessage?: (message: Message, emoji: string | null) => void
  onPinMessage?: (message: Message) => void
  onFavoriteMessage?: (message: Message) => void
}

export function ChatArea({
  contact,
  messages,
  daySeparator,
  showSessionAlert = false,
  className,
  connection,
  connections,
  inputValue,
  onInputChange,
  onSendMessage,
  sending = false,
  onAttachClick,
  onEmojiClick,
  onRecordClick,
  onPhoneClick,
  onVideoClick,
  onMoreClick,
  inputPlaceholder,
  inputDisabled,
  composerSlot,
  headerActionsSlot,
  onUseTemplate,
  notesSlot,
  activitiesSlot,
  timelineSlot,
  callsSlot,
  tabCounts,
  onReplyMessage,
  onForwardMessage,
  onReactMessage,
  onPinMessage,
  onFavoriteMessage,
}: ChatAreaProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const isControlled = onSendMessage !== undefined
  const { data: session } = useSession()

  // Abas opt-in: so aparecem quando ha conteudo para pelo menos uma aba
  // alem de "Conversa".
  const tabsEnabled = Boolean(
    notesSlot || activitiesSlot || timelineSlot || callsSlot,
  )
  const [activeTab, setActiveTab] = useState<ChatTabId>("conversa")

  // Iniciais do agente nas bolhas outgoing. Prioridade: usuário
  // autenticado (NextAuth) > usuário de preview > genérico.
  const [agentInitials, setAgentInitials] = useState("·")
  useEffect(() => {
    const sessionName = session?.user?.name?.trim()
    const name =
      sessionName || (isPreviewMode() ? PREVIEW_USER.name : "Agente")
    setAgentInitials(getInitials(name) || "?")
  }, [session])
  const effectiveDisabled = inputDisabled ?? showSessionAlert
  const value = inputValue ?? ""

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onSendMessage) return
    const trimmed = value.trim()
    if (!trimmed || sending || effectiveDisabled) return
    onSendMessage(trimmed)
  }

  return (
    <main
      aria-label={`Conversa com ${contact.name}`}
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <header className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)]">
        <div className="flex items-center gap-3 px-4 py-2">
          <TooltipGlass label={contact.name} side="bottom">
            {(() => {
              const bg =
                (contact.avatarColor && avatarGradients[contact.avatarColor]) ||
                contact.avatarColor ||
                "var(--brand-primary)"
              const ch =
                (contact.channel ?? connection?.type ?? null) as string | null
              const badge = channelBadge(ch)
              return (
                <span
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(15,20,40,0.18)]"
                  style={{ background: bg }}
                  aria-label={contact.name}
                >
                  {contact.initials || contact.name.slice(0, 2).toUpperCase()}
                  {badge && (
                    <span
                      title={badge.title}
                      aria-label={badge.title}
                      className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full ring-2 ring-[var(--glass-bg-overlay)]"
                      style={{ background: badge.bg, color: badge.fg }}
                    >
                      <badge.Icon size={9} stroke={2.5} />
                    </span>
                  )}
                </span>
              )
            })()}
          </TooltipGlass>

          {contact.badge && (
            <BadgeGlass variant={contact.badge}>
              {contact.badgeLabel ??
                (contact.badge === "enterprise"
                  ? "ENTERPRISE"
                  : contact.badge === "lead"
                    ? "LEAD"
                    : "CLIENTE")}
            </BadgeGlass>
          )}

          {tabsEnabled && (
            <ChatTabsBar
              activeTab={activeTab}
              onChange={setActiveTab}
              hiddenTabs={{
                notas: !notesSlot,
                atividades: !activitiesSlot,
                timeline: !timelineSlot,
                chamadas: !callsSlot,
              }}
            />
          )}

          <div className="ml-auto flex items-center gap-1">
            {headerActionsSlot ?? (
              <>
                {contact.phone && (
                  <IconBtn title={`Ligar para ${contact.phone}`} onClick={onPhoneClick}>
                    <IconPhone size={17} />
                  </IconBtn>
                )}
                <IconBtn title="Vídeo chamada" onClick={onVideoClick}>
                  <IconVideo size={17} />
                </IconBtn>
                <IconBtn title="Mais opções" onClick={onMoreClick}>
                  <IconDotsVertical size={17} />
                </IconBtn>
              </>
            )}
          </div>
        </div>
      </header>

      {tabsEnabled && activeTab !== "conversa" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {activeTab === "notas"
            ? notesSlot
            : activeTab === "atividades"
              ? activitiesSlot
              : activeTab === "chamadas"
                ? callsSlot
                : timelineSlot}
        </div>
      ) : (
        <>
      {/* MESSAGES */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-7 py-6">
        {(() => {
          // Separador de dia ("Hoje" / "Ontem" / "DD/MM/AAAA") inserido
          // automaticamente sempre que a data muda entre mensagens. Usa o
          // `createdAt` (ISO) de cada mensagem; quando ausente, cai no prop
          // `daySeparator` legado exibido uma única vez no topo.
          let lastDayKey: string | null = null
          let usedFallback = false
          // Só marca troca de conexão quando a conversa tem 2+ contas distintas
          // (ex.: dois WhatsApps). Com uma só, o chip do header já basta.
          const distinctChannels = new Set(
            messages.map((m) => m.channelId).filter(Boolean) as string[],
          )
          const showConnSwitches = distinctChannels.size >= 2
          let lastChannelId: string | null = null
          return messages.map((message, index) => {
            if (message.type !== "incoming" && message.type !== "outgoing") {
              return null
            }
            const dayKey = dayKeyFromISO(message.createdAt)
            let separator: string | null = null
            if (dayKey) {
              if (dayKey !== lastDayKey) {
                separator = dayLabelFromISO(message.createdAt)
                lastDayKey = dayKey
              }
            } else if (daySeparator && !usedFallback) {
              separator = daySeparator
              usedFallback = true
            }
            // Marcador de troca de conexão: aparece quando o channelId muda
            // em relação à última mensagem com canal conhecido.
            let connLabel: string | null = null
            if (showConnSwitches && message.channelId) {
              if (message.channelId !== lastChannelId) {
                const ref = connections?.[message.channelId]
                if (ref) connLabel = formatConnectionLabel(ref)
                lastChannelId = message.channelId
              }
            }
            return (
              <Fragment key={message.id || index}>
                {separator && <DaySeparator date={separator} />}
                {connLabel && <ConnectionDivider label={connLabel} />}
                <MessageBubble
                  message={message}
                  agentInitials={agentInitials}
                  onReplyMessage={onReplyMessage}
                  onForwardMessage={onForwardMessage}
                  onReactMessage={onReactMessage}
                  onPinMessage={onPinMessage}
                  onFavoriteMessage={onFavoriteMessage}
                />
              </Fragment>
            )
          })
        })()}
      </div>

      {/* SESSION ALERT */}
      {showSessionAlert && <SessionAlert onUseTemplate={onUseTemplate} />}

      {/* INPUT BAR */}
      {composerSlot ?? (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mx-6 mb-6 flex h-11 items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-3 pr-1.5 shadow-[var(--glass-shadow-sm)]"
        >
          <TooltipGlass label="Anexar" side="top">
            <button
              type="button"
              onClick={onAttachClick}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-subtle)] hover:text-[var(--brand-primary)]"
            >
              <IconPaperclip size={17} />
            </button>
          </TooltipGlass>
          <input
            type="text"
            placeholder={inputPlaceholder ?? "Escreva sua mensagem..."}
            disabled={effectiveDisabled || sending}
            value={isControlled ? value : undefined}
            onChange={isControlled ? (e) => onInputChange?.(e.target.value) : undefined}
            className="min-w-0 flex-1 self-stretch border-none bg-transparent px-1 font-body text-[13.5px] leading-none text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <TooltipGlass label="Emoji" side="top">
            <button
              type="button"
              onClick={onEmojiClick}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-subtle)] hover:text-[var(--brand-primary)]"
            >
              <IconMoodSmile size={17} />
            </button>
          </TooltipGlass>
          {onRecordClick && (
            <TooltipGlass label="Áudio" side="top">
              <button
                type="button"
                onClick={onRecordClick}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-subtle)] hover:text-[var(--brand-primary)]"
              >
                <IconMoodSmile size={17} />
              </button>
            </TooltipGlass>
          )}
          <TooltipGlass label="Enviar mensagem" side="top">
            <button
              type={isControlled ? "submit" : "button"}
              disabled={isControlled && (!value.trim() || sending || effectiveDisabled)}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.35)] transition-all hover:scale-[1.05] hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <IconSend size={15} />
            </button>
          </TooltipGlass>
        </form>
      )}
        </>
      )}
    </main>
  )
}

/**
 * Barra de abas do card de conversa (Conversa / Atividades / Notas / Timeline).
 */
function ChatTabsBar({
  activeTab,
  onChange,
  hiddenTabs,
}: {
  activeTab: ChatTabId
  onChange: (id: ChatTabId) => void
  hiddenTabs?: Partial<Record<ChatTabId, boolean>>
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1">
      {CHAT_TABS.filter((t) => t.id === "conversa" || !hiddenTabs?.[t.id]).map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold transition-all",
              isActive
                ? "bg-[var(--brand-primary)] text-white shadow-[var(--glass-shadow-sm)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            <Icon size={13} strokeWidth={isActive ? 2.4 : 2} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/** Chave de dia estável (toDateString) usada para detectar troca de data. */
function dayKeyFromISO(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toDateString()
}

/** Rótulo do separador: "Hoje", "Ontem" ou "DD/MM/AAAA". */
function dayLabelFromISO(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Hoje"
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Ontem"
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function IconBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title?: string
  onClick?: () => void
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
  if (!title) return btn
  return <TooltipGlass label={title} side="bottom">{btn}</TooltipGlass>
}
