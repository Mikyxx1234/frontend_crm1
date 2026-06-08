import { useState, useRef, useEffect, useCallback, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
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
  IconPlayerPlay,
  IconPlayerPause,
  IconLock,
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
  /** Nome completo do remetente — usado no tooltip do avatar. */
  senderName?: string
  /** Mensagem enviada por bot/automação — exibe badge "AUTOMAÇÃO" */
  isBot?: boolean
  /** Campos parseados de resposta de formulário Meta Flow */
  formFields?: FormField[]
  /** Título do formulário (ex: "form_estag") */
  formTitle?: string
  /** Tipo de mídia: "audio", "image", "document", "video", "text" etc. */
  messageType?: string
  /**
   * Nota interna — não enviada ao cliente. Quando true, a bolha é
   * renderizada com estilo diferenciado (fundo amarelo, borda lateral,
   * badge "Nota"). Independe de `type` (sempre tratada como outgoing).
   */
  isNote?: boolean
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
  /** Nome completo do agente logado — exibido no tooltip do avatar. */
  agentName?: string
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

/** Formata segundos em mm:ss */
function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

/**
 * Player de áudio minimalista — sem controles nativos do browser.
 * Botão play/pause + barra de progresso clicável + timer.
 */
function AudioPlayer({ url, isOutgoing }: { url: string | null; isOutgoing: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
    } else {
      el.play().catch(() => {})
    }
  }, [playing])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setCurrent(0) }
    const onTimeUpdate = () => setCurrent(el.currentTime)
    const onLoaded = () => setDuration(el.duration)
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    el.addEventListener("ended", onEnded)
    el.addEventListener("timeupdate", onTimeUpdate)
    el.addEventListener("loadedmetadata", onLoaded)
    return () => {
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("ended", onEnded)
      el.removeEventListener("timeupdate", onTimeUpdate)
      el.removeEventListener("loadedmetadata", onLoaded)
    }
  }, [])

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const timeLabel = playing || current > 0 ? fmtTime(current) : fmtTime(duration)

  // Cores derivadas de isOutgoing
  const trackBg   = isOutgoing ? "rgba(255,255,255,0.25)" : "rgba(91,111,245,0.15)"
  const fillBg    = isOutgoing ? "rgba(255,255,255,0.85)" : "var(--brand-primary)"
  const iconColor = isOutgoing ? "text-white"             : "text-[var(--brand-primary)]"
  const timeColor = isOutgoing ? "text-white/70"          : "text-[var(--text-muted)]"
  const micColor  = isOutgoing ? "text-white/50"          : "text-[var(--text-muted)]"

  return (
    <div className="flex w-[220px] items-center gap-2.5 py-0.5">
      {/* Elemento audio oculto */}
      {url && (
        <audio ref={audioRef} src={url} preload="metadata" aria-hidden="true" />
      )}

      {/* Ícone mic (decorativo) */}
      <IconMicrophone size={13} className={cn("shrink-0", micColor)} />

      {/* Botão play/pause */}
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-opacity",
          isOutgoing ? "bg-white/20 hover:bg-white/30" : "bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20",
          !url && "opacity-40 cursor-not-allowed",
        )}
      >
        {playing
          ? <IconPlayerPause size={13} className={iconColor} />
          : <IconPlayerPlay  size={13} className={iconColor} />
        }
      </button>

      {/* Barra de progresso */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-[3px] w-full cursor-pointer overflow-hidden rounded-full"
          style={{ background: trackBg }}
          onClick={(e) => {
            const el = audioRef.current
            if (!el || !duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            el.currentTime = ratio * duration
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
            style={{ width: `${pct}%`, background: fillBg }}
          />
        </div>
        <span className={cn("font-body text-[10px] leading-none tabular-nums", timeColor)}>
          {timeLabel}
        </span>
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
    return <AudioPlayer url={url} isOutgoing={isOutgoing} />
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

export function MessageBubble({ message, agentInitials, agentName, className }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing"
  const isBot = message.isBot ?? false
  const isNote = message.isNote === true
  const hasForm = !!(message.formFields && message.formFields.length > 0)

  if (hasForm) {
    return <FormBubble message={message} className={className} />
  }

  // Nota interna: layout dedicado — full-width amarelo claro com borda
  // lateral âmbar + badge "Nota". Não usa o esquema azul (que indicaria
  // mensagem enviada ao cliente). Mantém `senderInitials`/avatar do
  // agente, mas em circle neutro pra não competir com a cor da nota.
  if (isNote) {
    const noteAvatarLabel = message.senderName || agentName || "Agente"
    return (
      <div className={cn("flex w-full items-start gap-2.5", className)}>
        <TooltipGlass label={noteAvatarLabel} side="left">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-display text-[10px] font-bold text-amber-700">
            {message.senderInitials || agentInitials || "·"}
          </div>
        </TooltipGlass>
        <div
          className="relative min-w-0 flex-1 rounded-[var(--radius-md)] border-l-[3px] border-amber-400 bg-amber-50/80 px-3.5 py-2 text-sm leading-[1.45] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(180,150,80,0.10)]"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <IconLock size={10} className="text-amber-600" />
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-widest text-amber-700">
              Nota interna
            </span>
          </div>
          <MessageContent message={message} isOutgoing={true} />
          <span className="pointer-events-none mt-1 block select-none text-right text-[10.5px] leading-none text-amber-700/70">
            {message.time}
          </span>
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
        <TooltipGlass
          label={isBot ? "Automação" : (message.senderName || agentName || "Agente")}
          side="left"
        >
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
            isBot
              ? "bg-[#475569]"
              : "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]",
          )}>
            {isBot ? <IconRobot size={14} /> : (message.senderInitials || agentInitials || "?")}
          </div>
        </TooltipGlass>
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
