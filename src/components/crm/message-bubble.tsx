import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  IconRobot,
  IconClipboardList,
  IconMicrophone,
  IconChevronDown,
  IconFile,
  IconDownload,
  IconCheck,
  IconChecks,
  IconClock,
  IconAlertCircle,
} from "@tabler/icons-react"

type MediaKind = "image" | "audio" | "video" | "document" | null

/** Domínios da Meta/WhatsApp cujas URLs expiram — passam pelo proxy do backend. */
const META_MEDIA_DOMAINS = [
  "lookaside.fbsbx.com",
  "scontent.whatsapp.net",
  "graph.facebook.com",
]

/**
 * Normaliza a URL de mídia para um path servível pelo frontend.
 * URLs internas (/uploads, /api) passam direto; URLs da CDN da Meta
 * (que expiram) são roteadas pelo proxy autenticado do backend.
 */
function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith("blob:") || url.startsWith("data:")) return url
  if (url.startsWith("/uploads/") || url.startsWith("/api/")) return url
  try {
    const p = new URL(url, window.location.origin)
    if (p.pathname.startsWith("/uploads/")) return `${p.pathname}${p.search}`
    if (p.pathname.startsWith("/api/")) return `${p.pathname}${p.search}`
    if (META_MEDIA_DOMAINS.some((d) => p.hostname.endsWith(d))) {
      return `/api/media/proxy?url=${encodeURIComponent(url)}`
    }
  } catch {
    /* URL relativa malformada — cai no fallback abaixo */
  }
  if (url.includes("/uploads/")) return url.slice(url.indexOf("/uploads/"))
  return url
}

/** Deriva o tipo de mídia a partir do messageType e, como fallback, da extensão da URL. */
function detectMediaKind(messageType: string | undefined, mediaUrl: string | null | undefined): MediaKind {
  const mt = String(messageType ?? "").toLowerCase()
  if (mt === "whatsapp_call_recording" && mediaUrl) return "audio"
  if (mt === "image" || mt === "sticker") return "image"
  if (mt === "audio" || mt === "ptt" || mt === "voice") return "audio"
  if (mt === "video") return "video"
  if (mt === "document") return "document"
  const u = mediaUrl ?? ""
  if (/\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(u)) return "image"
  if (/\.(webm|ogg|mp3|wav|m4a|aac|amr|opus)($|\?)/i.test(u)) return "audio"
  if (/\.(mp4|mov|avi|3gp)($|\?)/i.test(u)) return "video"
  if (mediaUrl) return "document"
  return null
}

/**
 * Renderiza a formatação inline do WhatsApp em nós React:
 *   *negrito*  _itálico_  ~tachado~  `monoespaçado`
 * Usado para que a assinatura do agente (`*Nome*:`) e qualquer mensagem
 * formatada apareçam como o cliente vê no WhatsApp — sem asteriscos crus.
 */
function formatWhatsapp(text: string): ReactNode {
  if (!text) return text
  const tokenRe = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g
  const parts: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    const inner = tok.slice(1, -1)
    switch (tok[0]) {
      case "*":
        parts.push(<strong key={key++} className="font-semibold">{inner}</strong>)
        break
      case "_":
        parts.push(<em key={key++}>{inner}</em>)
        break
      case "~":
        parts.push(<s key={key++}>{inner}</s>)
        break
      default:
        parts.push(
          <code key={key++} className="rounded bg-black/10 px-1 font-mono text-[0.92em]">
            {inner}
          </code>,
        )
    }
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

/** Texto-placeholder do backend (ex.: "[video]", "[image] 👁") não deve virar legenda. */
function isPlaceholderContent(content: string): boolean {
  const c = content.trim()
  if (!c) return true
  return /^\[[^\]]+\]\s*(👁)?$/.test(c)
}

/** Nome do arquivo para documentos: tira o prefixo "📎" e o sufixo view-once. */
function documentLabel(content: string): string {
  const c = content
    .replace(/^📎\s*/, "")
    .replace(/\s*👁\s*$/, "")
    .trim()
  return c || "Documento"
}

export interface FormField {
  label: string
  value: string
}

export interface Message {
  id: string
  content: string
  time: string
  /** ISO da data de criação — usado para agrupar mensagens por dia. */
  createdAt?: string
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
  /**
   * Status de entrega (apenas mensagens outgoing) — exibe ticks estilo
   * WhatsApp: enviando (relógio), enviada (✓), entregue (✓✓ cinza),
   * lida (✓✓ azul), falha (alerta vermelho).
   */
  status?: "pending" | "sent" | "delivered" | "read" | "failed"
}

/** Ticks de status estilo WhatsApp, exibidos ao lado do horário (outgoing). */
function StatusTicks({ status }: { status: NonNullable<Message["status"]> }) {
  if (status === "pending") {
    return <IconClock size={12} className="shrink-0 text-white/70" aria-label="Enviando" />
  }
  if (status === "failed") {
    return <IconAlertCircle size={13} className="shrink-0 text-[#fca5a5]" aria-label="Falha no envio" />
  }
  if (status === "sent") {
    return <IconCheck size={14} className="shrink-0 text-white/75" aria-label="Enviada" />
  }
  // delivered | read — duplo tick; azul quando lida.
  return (
    <IconChecks
      size={15}
      className={cn("shrink-0", status === "read" ? "text-[#7fd4ff]" : "text-white/75")}
      aria-label={status === "read" ? "Lida" : "Entregue"}
    />
  )
}

interface MessageBubbleProps {
  message: Message
  /** Iniciais do agente logado — exibidas no avatar das mensagens outgoing. */
  agentInitials?: string
  className?: string
}

function FormBubble({ message, className }: { message: Message; className?: string }) {
  const [open, setOpen] = useState(false)
  const fields = message.formFields!
  const count = fields.length

  return (
    <div className={cn("flex max-w-[72%] flex-col gap-1", className)}>
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] rounded-bl-[4px] border border-[var(--glass-border)] shadow-[0_2px_8px_rgba(100,130,180,0.08)]"
        style={{ background: "var(--chat-bubble-received-bg)" }}
      >
        {/* Cabeçalho clicável — sempre visível */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--brand-primary)]/[0.04]"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)]/10">
            <IconClipboardList size={13} className="text-[var(--brand-primary)]" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-primary)]/70 leading-none mb-0.5">
              Formulário
            </p>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <p className="truncate font-display text-[12px] font-bold leading-tight text-[var(--text-primary)]">
                {message.formTitle || "Resposta"}
                <span className="ml-1.5 font-normal text-[var(--text-muted)]">
                  · {count} {count === 1 ? "campo" : "campos"}
                </span>
              </p>
              {/* Timestamp inline no estado recolhido — padrão WhatsApp */}
              {!open && (
                <span className="shrink-0 font-body text-[10px] leading-none text-[var(--text-muted)]">
                  {message.time}
                </span>
              )}
            </div>
          </div>
          <IconChevronDown
            size={14}
            className={cn(
              "shrink-0 text-[var(--text-muted)] transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {/* Campos — só visíveis quando aberto */}
        {open && (
          <div className="border-t border-[var(--glass-border)]/60">
            {fields.map((f, i) => {
              const isLast = i === fields.length - 1
              return (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-1.5",
                    !isLast && "border-b border-[var(--glass-border)]/40",
                    isLast && "pb-2",
                  )}
                >
                  <p className="font-display text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)] leading-none mb-0.5">
                    {f.label}
                  </p>
                  {/* No último campo, o timestamp flutua no canto inferior direito — padrão WhatsApp */}
                  <div className="relative">
                    <p className="font-body text-[12.5px] leading-snug text-[var(--text-primary)] pr-[42px]">
                      {f.value}
                    </p>
                    {isLast && (
                      <span className="pointer-events-none absolute bottom-0 right-0 select-none font-body text-[10px] leading-none text-[var(--text-muted)]">
                        {message.time}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/** Renderiza o corpo da bolha: player de mídia quando houver, senão texto. */
function MessageContent({ message, isOutgoing }: { message: Message; isOutgoing: boolean }) {
  const kind = detectMediaKind(message.messageType, message.mediaUrl)
  const url = resolveMediaUrl(message.mediaUrl)
  const content = message.content ?? ""
  // Legenda só aparece se for texto real (não o placeholder "[video]" etc.).
  const caption = isPlaceholderContent(content) ? "" : content

  // ── Áudio / voz / PTT ──────────────────────────────────────────
  if (kind === "audio") {
    return (
      <div className="flex min-w-[200px] flex-col gap-1.5 pb-1">
        <div className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5",
          isOutgoing ? "bg-white/15" : "bg-[var(--glass-bg-strong)]",
        )}>
          <IconMicrophone size={14} className={isOutgoing ? "text-white/80" : "text-[var(--brand-primary)]"} />
          {url ? (
            <audio
              controls
              src={url}
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
    )
  }

  // ── Imagem / sticker ───────────────────────────────────────────
  if (kind === "image" && url) {
    return (
      <div className="flex flex-col gap-1.5">
        <a href={url} target="_blank" rel="noopener noreferrer" className="group block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={caption || "Imagem recebida"}
            className="max-h-[320px] w-auto max-w-full rounded-[var(--radius-md)] object-cover transition-opacity group-hover:opacity-[0.97]"
            loading="lazy"
          />
        </a>
        {caption && <CaptionText caption={caption} isOutgoing={isOutgoing} />}
      </div>
    )
  }

  // ── Vídeo ──────────────────────────────────────────────────────
  if (kind === "video" && url) {
    return (
      <div className="flex flex-col gap-1.5">
        <video
          controls
          preload="metadata"
          src={url}
          className="max-h-[320px] w-full min-w-[220px] rounded-[var(--radius-md)] bg-black"
        />
        {caption && <CaptionText caption={caption} isOutgoing={isOutgoing} />}
      </div>
    )
  }

  // ── Documento ──────────────────────────────────────────────────
  if (kind === "document" && url) {
    const label = documentLabel(content)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className={cn(
          "flex min-w-[200px] max-w-[280px] items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 transition-colors",
          isOutgoing ? "bg-white/15 hover:bg-white/25" : "bg-[var(--glass-bg-strong)] hover:bg-[var(--glass-bg-overlay)]",
        )}
      >
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
          isOutgoing ? "bg-white/20" : "bg-[var(--brand-primary)]/10",
        )}>
          <IconFile size={18} className={isOutgoing ? "text-white" : "text-[var(--brand-primary)]"} />
        </div>
        <span className={cn(
          "min-w-0 flex-1 truncate font-body text-[12.5px] font-medium",
          isOutgoing ? "text-white" : "text-[var(--text-primary)]",
        )}>
          {label}
        </span>
        <IconDownload size={15} className={cn("shrink-0", isOutgoing ? "text-white/70" : "text-[var(--text-muted)]")} />
      </a>
    )
  }

  // ── Mídia sem URL (download falhou) — placeholder amigável ──────
  if (kind && !url) {
    const labels: Record<string, string> = {
      image: "Imagem indisponível",
      video: "Vídeo indisponível",
      document: "Documento indisponível",
    }
    return (
      <span className={cn(
        "font-body text-[12px] italic",
        isOutgoing ? "text-white/70" : "text-[var(--text-muted)]",
      )}>
        {labels[kind] ?? "Mídia indisponível"}
      </span>
    )
  }

  // ── Texto ──────────────────────────────────────────────────────
  return (
    <span className="break-words">
      {formatWhatsapp(content)}
      {/* Espaço reservado p/ horário (+ ticks quando outgoing). */}
      <span
        aria-hidden
        className={cn("ml-1 inline-block align-baseline", isOutgoing ? "w-[54px]" : "w-[36px]")}
      />
    </span>
  )
}

/** Legenda exibida abaixo de imagem/vídeo, com espaço reservado pro timestamp. */
function CaptionText({ caption, isOutgoing }: { caption: string; isOutgoing: boolean }) {
  return (
    <span className={cn("break-words text-[13px]", !isOutgoing && "text-[var(--chat-bubble-received-text)]")}>
      {formatWhatsapp(caption)}
      <span
        aria-hidden
        className={cn("ml-1 inline-block align-baseline", isOutgoing ? "w-[54px]" : "w-[36px]")}
      />
    </span>
  )
}

export function MessageBubble({ message, agentInitials, className }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing"
  const isBot = message.isBot ?? false
  const hasForm = !!(message.formFields && message.formFields.length > 0)

  if (hasForm) {
    return <FormBubble message={message} className={className} />
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
            : "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]",
        )}>
          {isBot ? <IconRobot size={14} /> : (message.senderInitials || agentInitials || "?")}
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
        {/* Conteúdo: mídia (áudio/imagem/vídeo/documento) ou texto */}
        <MessageContent message={message} isOutgoing={isOutgoing} />
        <span
          className={cn(
            "pointer-events-none absolute bottom-1.5 right-2.5 inline-flex select-none items-center gap-0.5 whitespace-nowrap text-[10.5px] leading-none",
            isOutgoing ? "text-white/80" : "text-[var(--text-muted)]",
          )}
        >
          {message.time}
          {isOutgoing && message.status && <StatusTicks status={message.status} />}
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
