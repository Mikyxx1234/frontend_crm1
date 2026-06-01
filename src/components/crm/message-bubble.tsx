import { cn } from "@/lib/utils"
import { IconRobot, IconClipboardList, IconMicrophone } from "@tabler/icons-react"

export interface FormField {
  label: string
  value: string
}

export interface Message {
  id: string
  content: string
  time: string
  type: "incoming" | "outgoing"
  senderInitials?: string
  /** Mensagem enviada por bot/automação — exibe badge "AUTOMAÇÃO" */
  isBot?: boolean
  /** Campos parseados de resposta de formulário Meta Flow */
  formFields?: FormField[]
  /** Título do formulário (ex: "form_estag") */
  formTitle?: string
  /** Tipo de mídia: "audio", "image", "document", "video", "text" etc. */
  messageType?: string
  /** URL da mídia para áudio, imagem, documento */
  mediaUrl?: string | null
}

interface MessageBubbleProps {
  message: Message
  className?: string
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing"
  const isBot = message.isBot ?? false
  const hasForm = !!(message.formFields && message.formFields.length > 0)

  // Bolha de formulário Meta Flow — exibida do lado do contato (inbound)
  if (hasForm) {
    return (
      <div className={cn("flex max-w-[80%] flex-col gap-1", className)}>
        <div className="rounded-[var(--radius-lg)] rounded-bl-[4px] border border-[var(--glass-border)] shadow-[0_2px_12px_rgba(100,130,180,0.10)]" style={{ background: "var(--chat-bubble-received-bg)" }}>
          {/* Header do formulário */}
          <div className="flex items-center gap-2 border-b border-[var(--glass-border)] px-4 py-2.5">
            <IconClipboardList size={14} className="shrink-0 text-[var(--brand-primary)]" />
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              Resposta do formulário
            </span>
            {message.formTitle && (
              <span className="ml-1 rounded-full bg-[var(--color-enterprise-bg)] px-2 py-px font-display text-[10px] font-semibold text-[var(--brand-primary)]">
                {message.formTitle}
              </span>
            )}
          </div>
          {/* Campos */}
          <div className="flex flex-col gap-0 px-4 py-3">
            {message.formFields!.map((f, i) => (
              <div key={i} className="py-1.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[var(--glass-border-subtle)]">
                <p className="font-display text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {f.label}
                </p>
                <p className="mt-0.5 font-body text-[13px] text-[var(--text-primary)]">
                  {f.value}
                </p>
              </div>
            ))}
          </div>
          {/* Timestamp */}
          <div className="px-4 pb-2.5 text-right">
            <span className="font-body text-[10.5px] text-[var(--text-muted)]">{message.time}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex max-w-[75%] items-end gap-2.5",
        isOutgoing && "ml-auto flex-row-reverse",
        className,
      )}
    >
      {/* Avatar: robô para bot, iniciais para agente */}
      {isOutgoing && (
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
          isBot
            ? "bg-[#475569]"
            : "bg-[var(--brand-primary)]",
        )}>
          {isBot ? <IconRobot size={14} /> : (message.senderInitials || "AS")}
        </div>
      )}
      <div
        className={cn(
          "relative min-w-0 rounded-[var(--radius-lg)] px-[14px] py-2 text-sm leading-[1.45]",
          isOutgoing
            ? isBot
              ? "rounded-br-[4px] bg-[#1e293b] text-white shadow-[0_4px_16px_rgba(30,41,59,0.35)]"
              : "rounded-br-[4px] bg-[var(--brand-primary)] text-white shadow-[0_4px_16px_rgba(91,111,245,0.30)]"
            : "rounded-bl-[4px] text-[var(--text-primary)] shadow-[0_2px_12px_rgba(100,130,180,0.10)]",
        )}
        style={!isOutgoing ? { background: "var(--chat-bubble-received-bg)", color: "var(--chat-bubble-received-text)" } : undefined}
      >
        {/* Badge AUTOMAÇÃO */}
        {isBot && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-widest text-white/90">
              <IconRobot size={10} />
              Automação
            </span>
          </div>
        )}
        {/* Player de áudio nativo */}
        {(message.messageType === "audio" || message.messageType === "voice") ? (
          <div className="flex min-w-[200px] flex-col gap-1.5 pb-1">
            <div className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5",
              isOutgoing ? "bg-white/15" : "bg-[var(--glass-bg-strong)]",
            )}>
              <IconMicrophone size={14} className={isOutgoing ? "text-white/80" : "text-[var(--brand-primary)]"} />
              {message.mediaUrl ? (
                <audio
                  controls
                  src={message.mediaUrl}
                  className="h-7 w-full min-w-[140px]"
                  aria-label="Mensagem de áudio"
                />
              ) : (
                <span className={cn(
                  "font-body text-[12px] italic",
                  isOutgoing ? "text-white/70" : "text-[var(--text-muted)]",
                )}>
                  Áudio indisponível
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="break-words">
            {message.content}
            <span
              aria-hidden
              className="ml-1 inline-block w-[36px] align-baseline"
            />
          </span>
        )}
        <span
          className={cn(
            "pointer-events-none absolute bottom-1.5 right-2.5 select-none whitespace-nowrap text-[10.5px] leading-none",
            isOutgoing ? "text-white/80" : "text-[var(--text-muted)]",
          )}
        >
          {message.time}
        </span>
      </div>
    </div>
  )
}

interface DaySeparatorProps {
  date: string
}

export function DaySeparator({ date }: DaySeparatorProps) {
  return (
    <div className="self-center px-0 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      {date}
    </div>
  )
}
