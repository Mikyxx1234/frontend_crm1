"use client"

import { Fragment, useRef, useState, useEffect, type FormEvent } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode"
import { getInitials } from "@/lib/utils"
import { BadgeGlass } from "./badge-glass"
import { MessageBubble, DaySeparator, type Message } from "./message-bubble"
import { SessionAlert } from "./session-alert"
import {
  IconPhone,
  IconVideo,
  IconDotsVertical,
  IconPaperclip,
  IconMoodSmile,
  IconSend,
} from "@tabler/icons-react"

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
  avatarColor?: string
  status?: string
  phone?: string
  contactId?: string
}

interface ChatAreaProps {
  contact: ChatContact
  messages: Message[]
  /** Mantido por compat — nao mais renderizado entre header e mensagens. */
  stages?: { label: string; status: "done" | "active" | "pending" }[]
  daySeparator?: string
  showSessionAlert?: boolean
  className?: string

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
  /**
   * Oculta o header interno (nome do contato + ações). Usado quando o
   * pai já exibe esse cabeçalho em outro lugar (ex.: Inbox, onde o nome
   * e o menu vivem na MESMA linha da barra de abas).
   */
  hideHeader?: boolean
  /** Handler do botao "Usar Template" do SessionAlert. */
  onUseTemplate?: () => void
}

export function ChatArea({
  contact,
  messages,
  daySeparator,
  showSessionAlert = false,
  className,
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
  hideHeader = false,
  onUseTemplate,
}: ChatAreaProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const isControlled = onSendMessage !== undefined
  const { data: session } = useSession()

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
      {/* HEADER — minimalista */}
      {!hideHeader && (
        <header className="flex items-center gap-3.5 border-b border-[var(--glass-border-subtle)] px-6 py-[18px]">
          <div className="flex flex-1 items-center gap-2.5">
            <h2 className="font-display text-[18px] font-bold text-[var(--text-primary)]">
              {contact.name}
            </h2>
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
          </div>
          <div className="flex gap-1">
            {headerActionsSlot ?? (
              <>
                <IconBtn title="Ligar" onClick={onPhoneClick}>
                  <IconPhone size={18} />
                </IconBtn>
                <IconBtn title="Vídeo chamada" onClick={onVideoClick}>
                  <IconVideo size={18} />
                </IconBtn>
                <IconBtn title="Mais opções" onClick={onMoreClick}>
                  <IconDotsVertical size={18} />
                </IconBtn>
              </>
            )}
          </div>
        </header>
      )}

      {/* MESSAGES */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-7 py-6">
        {(() => {
          // Separador de dia ("Hoje" / "Ontem" / "DD/MM/AAAA") inserido
          // automaticamente sempre que a data muda entre mensagens. Usa o
          // `createdAt` (ISO) de cada mensagem; quando ausente, cai no prop
          // `daySeparator` legado exibido uma única vez no topo.
          let lastDayKey: string | null = null
          let usedFallback = false
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
            return (
              <Fragment key={message.id || index}>
                {separator && <DaySeparator date={separator} />}
                <MessageBubble message={message} agentInitials={agentInitials} />
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
          className="mx-6 mb-6 flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-[18px] pr-2 shadow-[var(--glass-shadow-sm)]"
        >
          <TooltipGlass label="Anexar" side="top">
            <button
              type="button"
              onClick={onAttachClick}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
            >
              <IconPaperclip size={18} />
            </button>
          </TooltipGlass>
          <input
            type="text"
            placeholder={inputPlaceholder ?? "Escreva sua mensagem..."}
            disabled={effectiveDisabled || sending}
            value={isControlled ? value : undefined}
            onChange={isControlled ? (e) => onInputChange?.(e.target.value) : undefined}
            className="flex-1 border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <TooltipGlass label="Emoji" side="top">
            <button
              type="button"
              onClick={onEmojiClick}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
            >
              <IconMoodSmile size={18} />
            </button>
          </TooltipGlass>
          {onRecordClick && (
            <TooltipGlass label="Áudio" side="top">
              <button
                type="button"
                onClick={onRecordClick}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
              >
                <IconMoodSmile size={18} />
              </button>
            </TooltipGlass>
          )}
          <TooltipGlass label="Enviar mensagem" side="top">
            <button
              type={isControlled ? "submit" : "button"}
              disabled={isControlled && (!value.trim() || sending || effectiveDisabled)}
              className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-all hover:scale-105 hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <IconSend size={16} />
            </button>
          </TooltipGlass>
        </form>
      )}
    </main>
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
