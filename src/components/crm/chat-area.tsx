"use client"

import { useRef, type FormEvent } from "react"
import { cn } from "@/lib/utils"
import { AvatarGlass } from "./avatar-glass"
import { BadgeGlass } from "./badge-glass"
import { StatusPill } from "./status-pill"
import { ButtonGlass } from "./button-glass"
import { StagePills } from "./stage-pills"
import { MessageBubble, type Message } from "./message-bubble"
import { SessionAlert } from "./session-alert"
import { 
  IconBrandWhatsapp, 
  IconPhone, 
  IconDotsVertical,
  IconPaperclip,
  IconMoodSmile,
  IconMicrophone,
  IconSend
} from "@tabler/icons-react"

interface ChatContact {
  name: string
  initials: string
  avatarColor: 'blue' | 'teal' | 'orange' | 'purple' | 'pink' | 'coral'
  status: 'online' | 'offline' | 'none'
  badge?: 'enterprise' | 'lead' | 'success'
  phone: string
  contactId: string
}

interface ChatAreaProps {
  contact: ChatContact
  messages: Message[]
  stages: { label: string; status: 'done' | 'active' | 'pending' }[]
  showSessionAlert?: boolean
  className?: string
  /**
   * Handlers e estado opcionais — quando providos, transformam o
   * footer estático do v0 num composer funcional. Sem providers, o
   * componente continua se comportando como uma mock UI.
   */
  inputValue?: string
  onInputChange?: (value: string) => void
  onSendMessage?: (value: string) => void
  sending?: boolean
  onAttachClick?: () => void
  onEmojiClick?: () => void
  onRecordClick?: () => void
  onPhoneClick?: () => void
  onMoreClick?: () => void
  inputPlaceholder?: string
  inputDisabled?: boolean
  /**
   * Slot opcional que substitui INTEIRAMENTE o footer (input bar).
   * Quando provido, ignora todos os outros props do composer
   * (inputValue, sending, onSendMessage, etc.). Use para plugar a
   * camada de `features/inbox-v2/extras` com attach menu + audio.
   */
  composerSlot?: React.ReactNode
  /**
   * Slot opcional que substitui os botões fixos (Phone + Mais) do
   * canto superior direito do header. Use para plugar o menu de
   * ações da conversa (Resolver/Reabrir/etc.) com handlers reais.
   */
  headerActionsSlot?: React.ReactNode
  /**
   * Handler do botao "Usar Template" do SessionAlert. Quando
   * provido, repassa direto pro `SessionAlert.onUseTemplate`.
   */
  onUseTemplate?: () => void
}

export function ChatArea({
  contact,
  messages,
  stages,
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
  onMoreClick,
  inputPlaceholder,
  inputDisabled,
  composerSlot,
  headerActionsSlot,
  onUseTemplate,
}: ChatAreaProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const isControlled = onSendMessage !== undefined
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
        "flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3.5 border-b border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-[22px] py-3.5 backdrop-blur-md">
        <AvatarGlass
          initials={contact.initials}
          size="lg"
          color={contact.avatarColor}
          status={contact.status}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 font-display text-base font-bold text-[var(--text-primary)]">
            {contact.name}
            {contact.badge && (
              <BadgeGlass variant={contact.badge}>
                {contact.badge === 'enterprise' ? 'ENTERPRISE' : contact.badge === 'lead' ? 'LEAD' : 'CLIENTE'}
              </BadgeGlass>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <IconBrandWhatsapp size={14} className="text-[var(--color-success)]" />
              {contact.phone}
            </span>
            <span>·</span>
            <span>#{contact.contactId}</span>
            <span>·</span>
            <StatusPill variant="success" className="px-2 py-0.5 text-[10px]">
              Online
            </StatusPill>
          </div>
        </div>
        <div className="flex gap-1.5">
          {headerActionsSlot ?? (
            <>
              <ButtonGlass variant="glass" size="icon" title="Chamada" onClick={onPhoneClick}>
                <IconPhone size={18} />
              </ButtonGlass>
              <ButtonGlass variant="glass" size="icon" title="Mais" onClick={onMoreClick}>
                <IconDotsVertical size={18} />
              </ButtonGlass>
            </>
          )}
        </div>
      </header>

      {/* Stage Pills */}
      <StagePills stages={stages} />

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-[22px]">
        {messages.map((message, index) => {
          if (message.type === 'incoming' || message.type === 'outgoing') {
            return <MessageBubble key={message.id || index} message={message} />
          }
          return null
        })}
        {showSessionAlert && <SessionAlert onUseTemplate={onUseTemplate} />}
      </div>

      {composerSlot ?? (
      /* Input Bar (fallback estático ou controlado via props) */
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-[22px] mb-[22px] flex items-center gap-2 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-[18px] py-2 backdrop-blur-md shadow-[var(--glass-shadow-sm)]"
      >
        <ButtonGlass type="button" variant="icon" size="icon" title="Anexar" className="h-9 w-9" onClick={onAttachClick}>
          <IconPaperclip size={20} />
        </ButtonGlass>
        <ButtonGlass type="button" variant="icon" size="icon" title="Emoji" className="h-9 w-9" onClick={onEmojiClick}>
          <IconMoodSmile size={20} />
        </ButtonGlass>
        <input
          type="text"
          placeholder={inputPlaceholder ?? "Escreva sua mensagem..."}
          disabled={effectiveDisabled || sending}
          value={isControlled ? value : undefined}
          onChange={isControlled ? (e) => onInputChange?.(e.target.value) : undefined}
          className="flex-1 border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ButtonGlass type="button" variant="icon" size="icon" title="Áudio" className="h-9 w-9" onClick={onRecordClick}>
          <IconMicrophone size={20} />
        </ButtonGlass>
        <ButtonGlass
          type={isControlled ? "submit" : "button"}
          variant="primary"
          size="icon"
          title="Enviar"
          className="h-9 w-9"
          disabled={isControlled && (!value.trim() || sending || effectiveDisabled)}
        >
          <IconSend size={18} />
        </ButtonGlass>
      </form>
      )}
    </main>
  )
}
