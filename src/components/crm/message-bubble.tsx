import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type MessageType =
  | "text"
  | "note"
  | "image"
  | "audio"
  | "video"
  | "file"
  | "template"
  | "system"

export interface Message {
  id: string
  content: string
  time: string
  type: "incoming" | "outgoing"
  messageType?: MessageType
  senderInitials?: string
  senderName?: string
  /** Nota interna — renderiza no estilo âmbar */
  isNote?: boolean
  /** Mensagem de sistema — renderiza como label central */
  isSystem?: boolean
  mediaUrl?: string
  mediaFileName?: string
  mediaMimeType?: string
  mediaDuration?: number
}

interface MessageBubbleProps {
  message: Message
  className?: string
}

// ─────────────────────────────────────────────────────────────────
// Icons inline — evita dep de lib só pra ícones simples
// ─────────────────────────────────────────────────────────────────

function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconMic({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function IconImage({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconVideo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IconTemplate({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// Media attachment preview
// ─────────────────────────────────────────────────────────────────

function MediaAttachment({
  type,
  url,
  fileName,
  mimeType,
  duration,
  isOutgoing,
}: {
  type: MessageType
  url?: string
  fileName?: string
  mimeType?: string
  duration?: number
  isOutgoing: boolean
}) {
  const iconColor = isOutgoing ? "text-white/80" : "text-[var(--chat-media-icon-color)]"
  const iconBg = isOutgoing ? "bg-white/15" : "bg-[var(--chat-media-icon-bg)]"

  if (type === "image" && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fileName ?? "Imagem"}
        className="mb-1.5 max-h-[200px] w-full max-w-[260px] rounded-[10px] object-cover"
        loading="lazy"
      />
    )
  }

  if (type === "audio") {
    const mins = duration ? String(Math.floor(duration / 60)).padStart(2, "0") : null
    const secs = duration ? String(duration % 60).padStart(2, "0") : null
    return (
      <div className={cn("mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-w-[160px]", iconBg)}>
        <span className={cn("shrink-0", iconColor)}>
          <IconMic size={18} />
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className={cn("text-[12px] font-medium", isOutgoing ? "text-white" : "text-[var(--text-primary)]")}>
            Áudio
          </span>
          {mins && secs ? (
            <span className={cn("font-mono text-[10.5px] tabular-nums", isOutgoing ? "text-white/70" : "text-[var(--text-muted)]")}>
              {mins}:{secs}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  if (type === "video") {
    return (
      <div className={cn("mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-w-[160px]", iconBg)}>
        <span className={cn("shrink-0", iconColor)}>
          <IconVideo size={18} />
        </span>
        <span className={cn("text-[12px] font-medium", isOutgoing ? "text-white" : "text-[var(--text-primary)]")}>
          {fileName ?? "Vídeo"}
        </span>
      </div>
    )
  }

  if (type === "file") {
    const ext = fileName?.split(".").pop()?.toUpperCase() ?? "ARQ"
    return (
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-w-[160px] transition-opacity hover:opacity-80", iconBg)}
        onClick={(e) => !url && e.preventDefault()}
      >
        <span className={cn("shrink-0", iconColor)}>
          <IconFile size={18} />
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className={cn("truncate text-[12px] font-medium", isOutgoing ? "text-white" : "text-[var(--text-primary)]")}>
            {fileName ?? "Documento"}
          </span>
          <span className={cn("text-[10px] font-mono", isOutgoing ? "text-white/60" : "text-[var(--text-muted)]")}>
            {ext}
          </span>
        </div>
      </a>
    )
  }

  if (type === "template") {
    return (
      <div className={cn("mb-1.5 flex items-center gap-2 rounded-xl px-3 py-2", iconBg)}>
        <span className={cn("shrink-0", iconColor)}>
          <IconTemplate size={16} />
        </span>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wide", isOutgoing ? "text-white/80" : "text-[var(--text-muted)]")}>
          Template WhatsApp
        </span>
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────
// System message (evento central)
// ─────────────────────────────────────────────────────────────────

function SystemMessage({ content, time }: { content: string; time: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-0.5">
      <div
        className="max-w-[85%] rounded-full border px-3.5 py-1 text-center text-[11px] leading-snug"
        style={{
          backgroundColor: "var(--chat-system-bg)",
          borderColor: "var(--chat-system-border)",
          color: "var(--chat-system-text)",
        }}
      >
        {content}
        {time ? (
          <span className="ml-2 opacity-60">· {time}</span>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Internal note bubble
// ─────────────────────────────────────────────────────────────────

function NoteBubble({ message }: { message: Message }) {
  return (
    <div
      className={cn(
        "flex max-w-[80%] flex-col gap-0.5",
        "ml-auto", // notas são sempre à direita (enviadas pelo agente)
      )}
    >
      {/* Label */}
      <div className="flex items-center justify-end gap-1.5 pr-1">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--chat-note-icon)", backgroundColor: "var(--chat-note-bg)", border: "1px solid var(--chat-note-border)" }}
        >
          <IconLock size={10} />
          Nota interna
        </span>
        {message.senderName ? (
          <span className="text-[10px]" style={{ color: "var(--chat-note-time)" }}>
            {message.senderName}
          </span>
        ) : null}
      </div>

      {/* Bolha */}
      <div
        className="relative rounded-[var(--radius-lg)] rounded-br-[4px] px-[14px] py-2 text-sm leading-[1.45]"
        style={{
          backgroundColor: "var(--chat-note-bg)",
          border: "1px solid var(--chat-note-border)",
          color: "var(--chat-note-text)",
        }}
      >
        <span className="break-words">
          {message.content}
          <span aria-hidden className="ml-1 inline-block w-[36px] align-baseline" />
        </span>
        <span
          className="pointer-events-none absolute bottom-1.5 right-2.5 select-none whitespace-nowrap text-[10.5px] leading-none"
          style={{ color: "var(--chat-note-time)" }}
        >
          {message.time}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Standard message bubble (incoming / outgoing)
// ─────────────────────────────────────────────────────────────────

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const effectiveType = message.messageType ?? "text"

  // System messages
  if (effectiveType === "system" || message.isSystem) {
    return <SystemMessage content={message.content} time={message.time} />
  }

  // Internal notes
  if (effectiveType === "note" || message.isNote) {
    return <NoteBubble message={message} />
  }

  const isOutgoing = message.type === "outgoing"
  const hasMedia = ["audio", "image", "video", "file", "template"].includes(effectiveType)

  return (
    <div
      className={cn(
        "flex max-w-[75%] items-end gap-2.5",
        isOutgoing && "ml-auto flex-row-reverse",
        className,
      )}
    >
      {/* Avatar */}
      {isOutgoing ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] font-display text-[10px] font-bold text-white">
          {message.senderInitials || "AS"}
        </div>
      ) : null}

      {/* Bubble */}
      <div
        className={cn(
          "relative min-w-0 rounded-[var(--radius-lg)] px-[14px] py-2 text-sm leading-[1.45]",
          isOutgoing
            ? "rounded-br-[4px] text-[var(--chat-bubble-sent-text)] shadow-[0_4px_16px_rgba(91,111,245,0.25)]"
            : "rounded-bl-[4px] bg-white text-[var(--chat-bubble-received-text)] shadow-[0_2px_12px_rgba(100,130,180,0.10)]",
        )}
        style={
          isOutgoing
            ? { background: "var(--chat-bubble-sent-bg)" }
            : undefined
        }
      >
        {/* Media attachment above text */}
        {hasMedia && (
          <MediaAttachment
            type={effectiveType}
            url={message.mediaUrl}
            fileName={message.mediaFileName}
            mimeType={message.mediaMimeType}
            duration={message.mediaDuration}
            isOutgoing={isOutgoing}
          />
        )}

        {/* Text content (may be empty for pure-media messages) */}
        {message.content ? (
          <span className="break-words">
            {message.content}
            {/* Ghost spacer — mesma largura do timestamp */}
            <span aria-hidden className="ml-1 inline-block w-[36px] align-baseline" />
          </span>
        ) : (
          /* Keep spacer even when no text so time doesn't overlap media */
          hasMedia ? null : (
            <span aria-hidden className="ml-1 inline-block w-[36px] align-baseline" />
          )
        )}

        {/* Timestamp */}
        <span
          className={cn(
            "pointer-events-none absolute bottom-1.5 right-2.5 select-none whitespace-nowrap text-[10.5px] leading-none",
            isOutgoing ? "text-[var(--chat-bubble-sent-time)]" : "text-[var(--chat-bubble-received-time)]",
          )}
        >
          {message.time}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Day separator
// ─────────────────────────────────────────────────────────────────

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
