"use client"

import { useRef, useState, useEffect, type FormEvent } from "react"
import { cn } from "@/lib/utils"
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
  onUseTemplate,
}: ChatAreaProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const isControlled = onSendMessage !== undefined

  const [agentInitials, setAgentInitials] = useState("·")
  useEffect(() => {
    const name = isPreviewMode() ? PREVIEW_USER.name : "Agente"
    setAgentInitials(getInitials(name) || "?")
  }, [])
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

      {/* MESSAGES */}
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-6">
        {daySeparator && <DaySeparator date={daySeparator} />}
        {messages.map((message, index) => {
          if (message.type === "incoming" || message.type === "outgoing") {
            return <MessageBubble key={message.id || index} message={message} agentInitials={agentInitials} />
          }
          return null
        })}
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
          <button
            type="button"
            title="Anexar"
            onClick={onAttachClick}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
          >
            <IconPaperclip size={18} />
          </button>
          <input
            type="text"
            placeholder={inputPlaceholder ?? "Escreva sua mensagem..."}
            disabled={effectiveDisabled || sending}
            value={isControlled ? value : undefined}
            onChange={isControlled ? (e) => onInputChange?.(e.target.value) : undefined}
            className="flex-1 border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            title="Emoji"
            onClick={onEmojiClick}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
          >
            <IconMoodSmile size={18} />
          </button>
          {onRecordClick && (
            <button
              type="button"
              title="Áudio"
              onClick={onRecordClick}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
            >
              <IconMoodSmile size={18} />
            </button>
          )}
          <button
            type={isControlled ? "submit" : "button"}
            title="Enviar"
            disabled={isControlled && (!value.trim() || sending || effectiveDisabled)}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-all hover:scale-105 hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <IconSend size={16} />
          </button>
        </form>
      )}
    </main>
  )
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
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
}
