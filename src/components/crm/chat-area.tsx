"use client"

import { Fragment, useRef, useState, useEffect, useCallback, type FormEvent } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode"
import { getInitials } from "@/lib/utils"
import { ChatAvatar } from "@/components/inbox/chat-avatar"
import { AVATAR_SIZE } from "@/lib/avatar"
import { MessageBubble, DaySeparator, ConnectionDivider, ConversationClosedMarker, TicketDivider, type Message } from "./message-bubble"
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
  IconPinFilled,
  IconX,
  IconLock,
  IconChevronDown,
} from "@tabler/icons-react"

export type ChatTabId = "conversa" | "notas" | "atividades" | "timeline" | "chamadas"

const CHAT_TABS: { id: ChatTabId; label: string; icon: React.ComponentType<{ size?: number; stroke?: number }> }[] = [
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
  /** @deprecated — ChatAvatar usa sólido determinístico; mantido por compat. */
  avatarColor?: string
  status?: string
  phone?: string
  contactId?: string
  /** Canal — badge no canto inferior direito (padrão Inbox / ChatAvatar). */
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

  /**
   * Mensagens fixadas no topo da conversa (banner estilo WhatsApp). Podem
   * ser várias (máx. 3). O banner exibe uma por vez; clicar cicla para a
   * próxima e ROLA a lista até ela (com highlight). `onUnpinMessage(id)`
   * desafixa a mensagem exibida no momento.
   */
  pinnedMessages?: Array<{ id: string; content: string; senderName?: string | null }>
  onUnpinMessage?: (id: string) => void

  /**
   * ID amigavel sequencial da conversa (Contact/Deal-like #N por
   * organizacao). Quando presente, renderiza um chip mono minimalista
   * no header (ao lado do nome), sem alterar o layout — o operador
   * consegue referenciar o "ticket" em conversa/log sem sair do chat.
   * Numero e' opcional pra manter compat com callers antigos.
   */
  conversationNumber?: number | null

  /**
   * Sinaliza que a conversa foi encerrada (`status = RESOLVED`). Quando
   * true, renderiza um `ConversationClosedMarker` no fim da lista de
   * mensagens — mesmo padrao visual do DaySeparator/ConnectionDivider,
   * bem discreto. `conversationClosedAt` complementa com data/hora.
   */
  conversationResolved?: boolean
  conversationClosedAt?: string | null

  /**
   * Slot flutuante (canto inferior direito, ao lado da composer) — usado
   * para o botão "Robôs ativos". Renderizado como overlay absoluto dentro
   * do `<main>` (que agora é `relative`); o próprio slot cuida da posição.
   */
  activeBotsSlot?: React.ReactNode
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
  pinnedMessages,
  onUnpinMessage,
  conversationResolved,
  conversationClosedAt,
  activeBotsSlot,
}: ChatAreaProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  // Botão flutuante "descer" (estilo WhatsApp): aparece quando chega mensagem
  // do cliente enquanto o operador está lendo histórico mais acima. O badge
  // conta as novas mensagens não vistas; clicar rola suave até o fim.
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  // Índice da fixada exibida no banner e id destacado após o scroll.
  const [activePinIndex, setActivePinIndex] = useState(0)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const pins = pinnedMessages ?? []

  // Mantém o índice válido quando a lista de fixadas muda (desafixar etc.).
  useEffect(() => {
    if (activePinIndex >= pins.length && pins.length > 0) {
      setActivePinIndex(0)
    }
  }, [pins.length, activePinIndex])

  // Rola até a mensagem fixada e a destaca por ~1.6s (estilo WhatsApp).
  const scrollToMessage = useCallback((messageId: string) => {
    const container = messagesRef.current
    if (!container) return
    const el = container.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(messageId)}"]`,
    )
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlightId(messageId)
    window.setTimeout(() => setHighlightId((cur) => (cur === messageId ? null : cur)), 1600)
  }, [])

  // Clique no banner: rola até a fixada atual e avança pra próxima (ciclo).
  const handleBannerClick = useCallback(() => {
    if (pins.length === 0) return
    const current = pins[Math.min(activePinIndex, pins.length - 1)]
    if (current) scrollToMessage(current.id)
    if (pins.length > 1) {
      setActivePinIndex((i) => (i + 1) % pins.length)
    }
  }, [pins, activePinIndex, scrollToMessage])
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
  // Rola suave (ou instantâneo) até a última mensagem e zera o estado do
  // botão "descer".
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior })
    })
    setShowScrollDown(false)
    setUnreadCount(0)
  }, [])

  // Esconde o botão assim que o operador chega perto do fim manualmente.
  useEffect(() => {
    const container = messagesRef.current
    if (!container) return
    const onScroll = () => {
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200
      if (nearBottom) {
        setShowScrollDown(false)
        setUnreadCount(0)
      }
    }
    container.addEventListener("scroll", onScroll, { passive: true })
    return () => container.removeEventListener("scroll", onScroll)
  }, [])

  // Rola a lista até o fim quando: (1) a conversa muda / carrega (instantâneo),
  // ou (2) chega/enviamos uma nova mensagem no fim. Ao enviar (mensagem própria)
  // ou quando o operador já está perto do fim, rola suave; se ele estiver lendo
  // histórico mais acima e o cliente enviar, NÃO puxamos a tela — mostramos o
  // botão "descer" com o contador. Detecta troca de conversa vs. append
  // comparando o 1º/último id (evita depender de `conversationNumber`, nulável).
  const prevFirstIdRef = useRef<string | null>(null)
  const prevLastIdRef = useRef<string | null>(null)
  useEffect(() => {
    const container = messagesRef.current
    if (!container) return
    const firstId = messages[0]?.id ?? null
    const last = messages[messages.length - 1]
    const lastId = last?.id ?? null
    const prevFirst = prevFirstIdRef.current
    const prevLast = prevLastIdRef.current
    prevFirstIdRef.current = firstId
    prevLastIdRef.current = lastId

    // Nada novo no fim (ex.: prepend de histórico mais antigo) → não mexe.
    if (lastId === prevLast) return

    const isSwitchOrInitial = prevLast === null || firstId !== prevFirst
    if (isSwitchOrInitial) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight
      })
      setShowScrollDown(false)
      setUnreadCount(0)
      return
    }

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200
    const ownMessage = last?.type === "outgoing"
    if (ownMessage || nearBottom) {
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      })
      setShowScrollDown(false)
      setUnreadCount(0)
    } else {
      // Mensagem do cliente chegou enquanto o operador lê histórico acima.
      setShowScrollDown(true)
      setUnreadCount((n) => n + 1)
    }
  }, [messages])

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
        "relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <header className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)]">
        <div className="flex items-center gap-3 px-4 py-2">
          <TooltipGlass label={contact.name} side="bottom">
            <ChatAvatar
              user={{
                id: contact.contactId ?? contact.name,
                name: contact.name,
              }}
              phone={contact.phone}
              channel={contact.channel ?? connection?.type ?? null}
              size={AVATAR_SIZE.md}
            />
          </TooltipGlass>

          {/* Header enxuto (pedido 16/jul/26): sem badge de tipo (CLIENTE/
              LEAD), sem #N e sem chip "Encerrada". O status resolvido passou
              a ser sinalizado pela faixa verde sutil abaixo do header — o
              #N continua acessivel no separador de ticket da timeline. */}

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

      {/* Botão flutuante "Robôs ativos" — overlay no canto inf. direito,
          ao lado da composer. O slot cuida do próprio posicionamento. */}
      {activeBotsSlot}

      {/* Faixa sutil de conversa resolvida — substitui o chip "ENCERRADA"
          do header. Verde suave, discreta, colada abaixo do header. */}
      {conversationResolved && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-center gap-1.5 border-b border-emerald-500/15 bg-emerald-500/10 px-4 py-1 text-[11px] font-medium text-emerald-700 v2-dark:text-emerald-400"
        >
          <IconLock size={11} className="shrink-0" />
          Conversa resolvida
          {conversationClosedAt && (() => {
            const d = new Date(conversationClosedAt)
            if (Number.isNaN(d.getTime())) return null
            const dd = String(d.getDate()).padStart(2, "0")
            const mm = String(d.getMonth() + 1).padStart(2, "0")
            const hh = String(d.getHours()).padStart(2, "0")
            const mi = String(d.getMinutes()).padStart(2, "0")
            return <span className="text-emerald-700/70 v2-dark:text-emerald-400/70">· {dd}/{mm} às {hh}:{mi}</span>
          })()}
        </div>
      )}

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
      {/* PINNED MESSAGES BANNER — estilo WhatsApp: várias fixadas, clicar
          cicla e rola até a mensagem. Mostra 1 por vez + contador. */}
      {pins.length > 0 && (() => {
        const idx = Math.min(activePinIndex, pins.length - 1)
        const current = pins[idx]
        return (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/[0.06] px-3 py-2">
            <IconPinFilled size={14} className="shrink-0 text-[var(--brand-primary)]" />
            <button
              type="button"
              onClick={handleBannerClick}
              className="min-w-0 flex-1 cursor-pointer text-left"
              aria-label="Ir para a mensagem fixada"
            >
              <p className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                Mensagem fixada
                {pins.length > 1 && (
                  <span className="rounded-full bg-[var(--brand-primary)]/15 px-1.5 py-px text-[9px] tabular-nums">
                    {idx + 1}/{pins.length}
                  </span>
                )}
              </p>
              <p className="truncate text-[12.5px] text-[var(--text-secondary)]">
                {current.senderName ? `${current.senderName}: ` : ""}
                {current.content}
              </p>
            </button>
            {onUnpinMessage && (
              <button
                type="button"
                onClick={() => onUnpinMessage(current.id)}
                aria-label="Desafixar mensagem"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        )
      })()}
      {/* MESSAGES */}
      <div ref={messagesRef} className="flex flex-1 flex-col gap-1 overflow-y-auto px-7 py-6">
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
            // Separador de ticket — item sintético injetado pelo backend
            // quando `?history=1`. Não é uma bolha; renderiza diretamente.
            if (message.messageType === "ticket-separator" && message.ticketInfo) {
              return (
                <TicketDivider
                  key={message.id || `sep-${index}`}
                  number={message.ticketInfo.number}
                  closedAt={message.ticketInfo.closedAt}
                  isCurrent={message.ticketInfo.isCurrent}
                />
              )
            }
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
                <div
                  data-message-id={message.id}
                  className={cn(
                    "flex flex-col scroll-mt-24 rounded-[var(--radius-lg)] transition-[background-color,box-shadow] duration-500",
                    highlightId === message.id &&
                      "bg-[var(--brand-primary)]/10 shadow-[0_0_0_2px_var(--brand-primary)]",
                  )}
                >
                  <MessageBubble
                    message={message}
                    agentInitials={agentInitials}
                    onReplyMessage={onReplyMessage}
                    onForwardMessage={onForwardMessage}
                    onReactMessage={onReactMessage}
                    onPinMessage={onPinMessage}
                    onFavoriteMessage={onFavoriteMessage}
                  />
                </div>
              </Fragment>
            )
          })
        })()}

        {/* Marcador de encerramento — ultimo item da lista, alinhado com
            o padrao visual do DaySeparator/ConnectionDivider. Fica visivel
            de dentro do proprio chat, sem card lateral, atendendo ao
            pedido "simples/minimalista dentro do chat". */}
        {conversationResolved && (
          <ConversationClosedMarker closedAt={conversationClosedAt ?? null} />
        )}
      </div>

      {/* Botão flutuante "descer" (estilo WhatsApp) — só aparece quando o
          operador está lendo histórico e chega mensagem nova. Segue os tokens
          de vidro da página; badge reusa o estilo de não-lidas da lista. */}
      {showScrollDown && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} mensagens não lidas — ir para o fim`
              : "Ir para a última mensagem"
          }
          className="absolute bottom-24 right-6 z-20 flex size-10 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-px hover:text-[var(--brand-primary)] active:scale-95"
        >
          <IconChevronDown size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground shadow-[var(--shadow-sm)] tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

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
            <Icon size={13} stroke={isActive ? 2.4 : 2} />
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
