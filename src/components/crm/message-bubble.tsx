import { useState, useRef, useEffect, useCallback, useLayoutEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { summarizeSendError, translateSendError } from "@/lib/meta-error-catalog"
import { ImageLightbox } from "@/components/crm/image-lightbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  IconCopy,
  IconAlertCircle,
  IconPlayerPlay,
  IconPlayerPause,
  IconLock,
  IconLoader2,
  IconTextCaption,
  IconPin,
  IconPinFilled,
  IconListCheck,
  IconArrowsExchange,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconPhoneOff,
  IconArrowBackUp,
  IconShare2,
  IconMoodPlus,
  IconStar,
  IconStarFilled,
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
  /** Nome completo do agente ou automação que enviou a mensagem. */
  senderName?: string
  /** Mensagem enviada por bot/automação — exibe badge "AUTOMAÇÃO" */
  isBot?: boolean
  /**
   * Confirmação de automação disparada MANUALMENTE pela conversa. Renderiza
   * o cartão de automação com badge "Manual" e o avatar (iniciais) do agente
   * que acionou sobreposto ao robô — estilo colaboração.
   */
  isAutomationRun?: boolean
  /** Nome do agente que disparou a automação manual (tooltip do avatar colab). */
  automationAgentName?: string
  /** Iniciais do agente que disparou — chip sobre o robô. */
  automationAgentInitials?: string
  /** Campos parseados de resposta de formulário Meta Flow */
  formFields?: FormField[]
  /** Título do formulário (ex: "form_estag") */
  formTitle?: string
  /**
   * Botões de resposta rápida enviados numa mensagem interativa/template
   * (WhatsApp). Renderizados como cards empilhados abaixo do corpo —
   * separados do texto pelo adapter (marcador `[Botões: ...]` do backend).
   */
  buttons?: string[]
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
  /**
   * Texto do erro de envio (traduzido do Meta quando disponível). Exibido
   * em tooltip ao passar o mouse sobre o ícone de falha (status `failed`).
   */
  sendError?: string
  /**
   * Conexão (Channel) por onde esta mensagem trafegou. Usado para inserir um
   * marcador na timeline quando a conversa alterna de conexão (ex.: dois
   * WhatsApps). `null`/undefined = herda a conexão anterior (sem marcador).
   */
  channelId?: string | null
  /**
   * Citação (reply): quando o cliente responde uma mensagem específica,
   * mostramos o snippet da mensagem citada no topo da bolha. `snippet` é
   * um preview curto (~120 chars); `direction` orienta a cor da barra
   * lateral (verde p/ nossa mensagem, cinza p/ mensagem do cliente).
   */
  replyTo?: {
    snippet: string
    direction?: "in" | "out"
    senderName?: string | null
  } | null
  /**
   * Reações do cliente nesta mensagem (WhatsApp permite uma reação por
   * pessoa, mas persistimos como array para suportar múltiplos reatores
   * em grupos futuramente). Renderiza como badge flutuante na base.
   */
  reactions?: Array<{ emoji: string; from: string; at?: string }>
  /**
   * Favoritada pelo agente LOGADO (marcador pessoal — outros agentes não
   * veem essa marcação). Alimenta a estrela preenchida no menu e o label
   * dinâmico "Favoritar"/"Desfavoritar".
   */
  isFavorited?: boolean
  /**
   * Mensagem atualmente fixada no topo da conversa (banner estilo
   * WhatsApp). Vem de `Conversation.pinnedMessageId` — diferente de
   * `isPinned` (usado só para notas na aba "Notas").
   */
  isPinnedMessage?: boolean
  /**
   * Metadados de separador de ticket (messageType === "ticket-separator").
   * Presente apenas nos itens sintéticos injetados pelo backend quando
   * `?history=1` para marcar o início de cada ticket na linha do tempo.
   */
  ticketInfo?: {
    number: number
    closedAt: string | null
    isCurrent?: boolean
  }
}


/** Ticks de status estilo WhatsApp, exibidos ao lado do horário (outgoing).
 *  `onLightBg` = true quando a bolha tem fundo claro (ex.: bolha de
 *  automação com tint indigo sobre branco). Sem isso os ticks brancos
 *  ficam invisíveis. */
function StatusTicks({
  status,
  onLightBg,
}: {
  status: NonNullable<Message["status"]>
  onLightBg?: boolean
}) {
  const dim = onLightBg ? "text-[var(--text-muted)]" : "text-white/70"
  const solid = onLightBg ? "text-[var(--text-secondary)]" : "text-white/75"
  if (status === "pending") {
    return <IconClock size={12} className={cn("shrink-0", dim)} aria-label="Enviando" />
  }
  if (status === "failed") {
    return <IconAlertCircle size={13} className="shrink-0 text-[var(--wa-tick-fail)]" aria-label="Falha no envio" />
  }
  if (status === "sent") {
    return <IconCheck size={14} className={cn("shrink-0", solid)} aria-label="Enviada" />
  }
  return (
    <IconChecks
      size={15}
      className={cn("shrink-0", status === "read" ? "text-[var(--wa-tick-read)]" : solid)}
      aria-label={status === "read" ? "Lida" : "Entregue"}
    />
  )
}

/**
 * Indicador de status com tooltip de erro. Para `failed`, envolve o ícone
 * num tooltip que mostra o texto do erro de envio (traduzido do Meta).
 * Demais status delegam ao `StatusTicks`.
 */
function StatusIndicator({
  status,
  sendError,
  onLightBg,
}: {
  status: NonNullable<Message["status"]>
  sendError?: string
  onLightBg?: boolean
}) {
  if (status !== "failed") {
    return <StatusTicks status={status} onLightBg={onLightBg} />
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="pointer-events-auto inline-flex cursor-help items-center">
          <IconAlertCircle size={13} className="shrink-0 text-[var(--wa-tick-fail)]" aria-label="Falha no envio" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        className="w-max max-w-[300px] whitespace-normal [overflow-wrap:anywhere] border border-[color:var(--color-danger)]/30 bg-white px-3 py-2 text-left text-[11px] font-medium normal-case leading-snug text-[var(--color-danger-text)] v2-dark:bg-[var(--glass-bg-modal)]"
      >
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide">
          Erro no envio (Meta)
        </span>
        <span className="block">
          {summarizeSendError(sendError)}
        </span>
        <CopyErrorButton text={translateSendError(sendError)} />
      </TooltipContent>
    </Tooltip>
  )
}

/** Botão "Copiar" o texto COMPLETO do erro (com a mensagem original da Meta). */
function CopyErrorButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="pointer-events-auto mt-1.5 inline-flex items-center gap-1 rounded-md border border-[color:var(--color-danger)]/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-[color:var(--color-danger)]/10"
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
      {copied ? "Copiado" : "Copiar erro"}
    </button>
  )
}

export interface MessageBubbleProps {
  message: Message
  /** Iniciais do agente logado — exibidas no avatar das mensagens outgoing. */
  agentInitials?: string
  className?: string
  /** Esta nota está fixada na conversa? Exibe indicador âmbar. */
  isPinned?: boolean
  /** Callback para fixar (messageId) ou desafixar (null). */
  onPinNote?: (messageId: string | null) => void
  /** Callback para adicionar conteúdo da nota ao log/timeline do deal. */
  onAddToLog?: (content: string) => void

  // ── Ações de mensagem recebida (menu estilo WhatsApp) ────────────
  // Todos opcionais: se não passados, o item some do menu. "Copiar" é
  // interno (usa navigator.clipboard) e sempre aparece p/ mensagens
  // com conteúdo textual — não depende de callback.
  /** Ao clicar em "Responder": abre citação da mensagem no composer. */
  onReplyMessage?: (message: Message) => void
  /** Ao clicar em "Encaminhar": abre modal de seleção de conversa. */
  onForwardMessage?: (message: Message) => void
  /** Ao clicar em uma reação rápida (👍/❤️/…) ou "Reagir". */
  onReactMessage?: (message: Message, emoji: string | null) => void
  /** Ao clicar em "Fixar": fixa a mensagem no topo da conversa. */
  onPinMessage?: (message: Message) => void
  /** Ao clicar em "Favoritar": adiciona à lista de favoritas do agente. */
  onFavoriteMessage?: (message: Message) => void
}

/** Emojis exibidos na barra rápida de reações — padrão WhatsApp. */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const

/**
 * Paleta da bolha de AUTOMAÇÃO: cinza escuro com texto claro. Hardcoded —
 * invariante ao data-chat-theme e ao modo dark/light, garantindo contraste
 * do texto, dos badges e dos ticks (inclusive o azul de "lida") em qualquer
 * tema. `ACCENT` (violeta) segue como cor do avatar do robô.
 */
const AUTOMATION_BG = "#374151"
const AUTOMATION_TEXT = "#f3f4f6"
const AUTOMATION_ACCENT = "#6c5ce7"

/**
 * Botões de resposta rápida (interactive/template) — replicam o visual do
 * WhatsApp: cada opção é um card full-width com ícone de "responder" e o
 * rótulo centralizado, empilhados abaixo do corpo e separados por uma
 * divisória fina. Preview não-clicável no CRM (só reproduz o que o cliente
 * vê no WhatsApp), mas com feedback de hover para parecer interativo.
 * `onLightBg` = bolha clara (automação): botão branco com acento violeta;
 * caso contrário (bolha azul do agente): translúcido sobre o fundo.
 */
function MessageButtons({ buttons, onLightBg }: { buttons: string[]; onLightBg: boolean }) {
  const accent = onLightBg ? AUTOMATION_ACCENT : "#ffffff"
  const dividerStyle = onLightBg
    ? { background: `${AUTOMATION_ACCENT}24` }
    : { background: "rgba(255,255,255,0.22)" }
  const btnStyle = onLightBg
    ? {
        borderColor: `${AUTOMATION_ACCENT}2e`,
        background: "#ffffff",
        color: AUTOMATION_ACCENT,
      }
    : {
        borderColor: "rgba(255,255,255,0.32)",
        background: "rgba(255,255,255,0.14)",
        color: "#ffffff",
      }
  return (
    <div className="mt-2 -mx-1 flex flex-col gap-1">
      {/* Divisória fina separando o corpo da mensagem dos botões (ref. WhatsApp) */}
      <span className="mx-1 mb-1 h-px w-[calc(100%-0.5rem)]" style={dividerStyle} />
      {buttons.map((b, i) => (
        <span
          key={`${b}-${i}`}
          className={cn(
            "flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-center font-display text-[13px] font-semibold leading-snug shadow-[0_1px_2px_rgba(15,20,40,0.06)] transition-colors",
            onLightBg ? "hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)]" : "hover:bg-white/20",
          )}
          style={btnStyle}
          title={b}
        >
          <IconArrowBackUp size={14} stroke={2.1} className="shrink-0" style={{ color: accent, opacity: 0.85 }} />
          <span className="line-clamp-2 [overflow-wrap:anywhere]">{b}</span>
        </span>
      ))}
    </div>
  )
}

function FormBubble({ message, className }: { message: Message; className?: string }) {
  const [open, setOpen] = useState(false)
  const fields = message.formFields!
  const count = fields.length

  return (
    <div className={cn("flex max-w-[72%] flex-col gap-1", className)}>
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] rounded-bl border border-[var(--glass-border)] shadow-[0_2px_8px_rgba(100,130,180,0.08)]"
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
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="truncate font-display text-[13px] font-bold leading-tight text-[var(--text-primary)]">
                {message.formTitle || "Resposta"}
              </p>
              {/* Contador de campos como pill preenchida (ref. V0) */}
              <span className="shrink-0 rounded-md bg-[var(--brand-primary)]/12 px-2 py-0.5 font-display text-[10.5px] font-semibold text-[var(--brand-primary)]">
                {count} {count === 1 ? "campo" : "campos"}
              </span>
              {/* Timestamp inline no estado recolhido — padrão WhatsApp */}
              {!open && (
                <span className="ml-auto shrink-0 font-body text-[10px] leading-none text-[var(--text-muted)]">
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
                    <p className="font-body text-[12.5px] leading-snug text-[var(--text-primary)] pr-11">
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
/** Estados possíveis da transcrição. */
type TranscriptState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; message: string }

function AudioPlayer({ url, isOutgoing }: { url: string | null; isOutgoing: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptState>({ status: "idle" })
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)

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

  const handleTranscribe = useCallback(async () => {
    if (!url || transcript.status === "loading") return
    setTranscript({ status: "loading" })
    let res: Response
    try {
      res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
    } catch {
      setTranscript({ status: "error", message: "Servidor indisponível." })
      return
    }
    let data: { transcript?: string; error?: string } = {}
    try {
      data = (await res.json()) as { transcript?: string; error?: string }
    } catch {
      setTranscript({ status: "error", message: `Erro HTTP ${res.status}.` })
      return
    }
    if (!res.ok || data.error) {
      setTranscript({ status: "error", message: data.error ?? `Erro ${res.status}.` })
    } else {
      setTranscript({ status: "done", text: data.transcript ?? "" })
    }
  }, [url, transcript.status])

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const timeLabel = playing || current > 0 ? fmtTime(current) : fmtTime(duration)

  // Cores derivadas de isOutgoing
  const trackBg      = isOutgoing ? "rgba(255,255,255,0.25)" : "rgba(91,111,245,0.15)"
  const fillBg       = isOutgoing ? "rgba(255,255,255,0.85)" : "var(--brand-primary)"
  const iconColor    = isOutgoing ? "text-white"             : "text-[var(--brand-primary)]"
  const timeColor    = isOutgoing ? "text-white/70"          : "text-[var(--text-muted)]"
  const micColor     = isOutgoing ? "text-white/50"          : "text-[var(--text-muted)]"
  const transcriptBg = isOutgoing
    ? "bg-[var(--glass-bg-subtle)] text-white/90 border-[var(--glass-border-subtle)]"
    : "bg-[var(--brand-primary)]/5 text-[var(--text-secondary)] border-[var(--glass-border-subtle)]"
  // Botão "Transcrever": pill com fundo sólido para garantir contraste em qualquer cor de bolha.
  const btnBase = isOutgoing
    ? "bg-[var(--glass-bg-subtle)] text-white hover:bg-[var(--glass-bg-panel)]"
    : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20"

  return (
    <div
      className={cn(
        "flex w-[220px] flex-col gap-1 py-0.5",
        // Folga inferior só quando há transcrição (evita o horário sobrepor o
        // texto). No estado padrão, o horário divide a linha com "Transcrever".
        transcript.status === "done" ? "pb-4" : "pb-1.5",
      )}
    >
      {/* Linha do player */}
      <div className="flex items-center gap-2.5">
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
            isOutgoing ? "bg-[var(--glass-bg-subtle)] hover:bg-[var(--glass-bg-panel)]" : "bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20",
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

      {/* Botão Transcrever — pill compacta com fundo próprio para contraste */}
      {url && transcript.status !== "done" && (
        <button
          type="button"
          disabled={transcript.status === "loading"}
          onClick={handleTranscribe}
          className={cn(
            "ml-6 flex items-center gap-1 self-start rounded-full px-2 py-0.5 transition-colors",
            btnBase,
            transcript.status === "loading" && "cursor-wait",
          )}
        >
          {transcript.status === "loading"
            ? <IconLoader2 size={10} className="animate-spin" />
            : <IconTextCaption size={10} />
          }
          <span className="font-display text-[10px] font-semibold">
            {transcript.status === "loading" ? "Transcrevendo…" : "Transcrever"}
          </span>
        </button>
      )}

      {/* Resultado da transcrição — colapsável */}
      {transcript.status === "done" && transcript.text && (
        <div className={cn("rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed", transcriptBg)}>
          <p className={cn(
            "transition-all",
            transcriptExpanded ? "" : "line-clamp-2",
          )}>
            {transcript.text}
          </p>
          {transcript.text.length > 80 && (
            <button
              type="button"
              onClick={() => setTranscriptExpanded((v) => !v)}
              className={cn(
                "mt-0.5 font-display text-[9px] font-semibold opacity-60 hover:opacity-100",
                isOutgoing ? "text-white" : "text-[var(--brand-primary)]",
              )}
            >
              {transcriptExpanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </div>
      )}
      {transcript.status === "done" && !transcript.text && (
        <p className={cn("text-[10px] italic", timeColor)}>
          Áudio sem fala detectada.
        </p>
      )}
      {transcript.status === "error" && (
        <p className={cn("text-[10px]", isOutgoing ? "text-white/60" : "text-[var(--color-danger)]")}>
          {transcript.message}
        </p>
      )}
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
    return <ImageMedia url={url} caption={caption} isOutgoing={isOutgoing} />
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
          isOutgoing ? "bg-[var(--glass-bg-subtle)] hover:bg-[var(--glass-bg)]" : "bg-[var(--glass-bg-strong)] hover:bg-[var(--glass-bg-overlay)]",
        )}
      >
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
          isOutgoing ? "bg-[var(--glass-bg-subtle)]" : "bg-[var(--brand-primary)]/10",
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

/**
 * Renderiza imagem do chat com clique-para-abrir-lightbox (em vez de abrir
 * em nova aba do navegador — tira o operador do CRM).
 */
function ImageMedia({
  url,
  caption,
  isOutgoing,
}: {
  url: string
  caption: string
  isOutgoing: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group block cursor-zoom-in overflow-hidden rounded-[var(--radius-md)] text-left"
          aria-label="Ampliar imagem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={caption || "Imagem recebida"}
            className="max-h-[320px] w-auto max-w-full rounded-[var(--radius-md)] object-cover transition-opacity group-hover:opacity-[0.97]"
            loading="lazy"
          />
        </button>
        {caption && <CaptionText caption={caption} isOutgoing={isOutgoing} />}
      </div>
      <ImageLightbox src={url} alt={caption} open={open} onOpenChange={setOpen} />
    </>
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

/**
 * Menu de contexto estilo WhatsApp para mensagens RECEBIDAS.
 *
 * Layout: barra horizontal de reações rápidas (6 emojis) + lista vertical
 * de ações (Responder / Reagir / Encaminhar / Fixar / Favoritar / Copiar).
 * Aparece via chevron no canto sup. direito da bolha (hover).
 *
 * Renderização: `createPortal` no <body> com `position: fixed`, para
 * escapar de qualquer ancestral com `overflow: hidden` (o chat-area e a
 * lista de mensagens são scrollables e clipam popovers absolutamente
 * posicionados). O `useLayoutEffect` computa o rect do chevron e aplica
 * auto-flip vertical (abre pra cima quando não cabe abaixo) e horizontal
 * (clampa à borda da viewport pra nunca cortar).
 *
 * Callbacks são opcionais. Sem handler, o item ainda aparece na UI para
 * manter o layout consistente entre todas as bolhas — só que fica como
 * stub "em breve". Copiar é sempre funcional (`navigator.clipboard`).
 */
function ReceivedMessageMenu({
  message,
  onReply,
  onForward,
  onReact,
  onPin,
  onFavorite,
}: {
  message: Message
  onReply?: (message: Message) => void
  onForward?: (message: Message) => void
  onReact?: (message: Message, emoji: string | null) => void
  onPin?: (message: Message) => void
  onFavorite?: (message: Message) => void
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Posicionamento responsivo: calcula o rect do chevron e escolhe se
  // abre pra baixo/cima + clampa horizontalmente pra não vazar viewport.
  // Duas passadas — a 1ª antes do content medir, a 2ª (rAF) já com a
  // dimensão real. Reposiciona em resize/scroll pra acompanhar o layout.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    const trigger = triggerRef.current
    if (!trigger) return

    const update = () => {
      const r = trigger.getBoundingClientRect()
      const content = contentRef.current
      const ch = content?.offsetHeight ?? 280
      const cw = content?.offsetWidth ?? 240
      const margin = 6

      const spaceBelow = window.innerHeight - r.bottom
      const spaceAbove = r.top
      const openUp = spaceBelow < ch + margin && spaceAbove > spaceBelow
      const top = openUp
        ? Math.max(8, r.top - ch - margin)
        : r.bottom + margin

      // Ancora à direita do chevron por padrão, mas clampa se estourar.
      const desiredLeft = r.right - cw
      const maxLeft = window.innerWidth - cw - 8
      const left = Math.min(Math.max(8, desiredLeft), Math.max(8, maxLeft))

      setCoords({ top, left })
    }
    update()
    const raf = requestAnimationFrame(update)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open])

  // Click fora / Esc fecham. O contentRef está no portal (fora do DOM
  // do trigger), então checamos os dois.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (contentRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const canCopy = !!(message.content && message.content.trim())

  const handleCopy = useCallback(async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* navegador antigo / sem HTTPS: silencioso */
    }
    setOpen(false)
  }, [canCopy, message.content])

  const handleReact = useCallback(
    (emoji: string) => {
      onReact?.(message, emoji)
      setOpen(false)
    },
    [message, onReact],
  )

  // Fallback comum para itens ainda não plugados. Sinaliza ao usuário
  // que o botão foi reconhecido mas a ação ainda não está disponível,
  // em vez de parecer bugado. Toast substituí quando o container
  // implementar o handler correspondente.
  const stub = useCallback((label: string) => {
    toast.info(`${label} — em breve`, {
      description: "Essa ação ainda não foi ativada nesta versão.",
      duration: 2200,
    })
    setOpen(false)
  }, [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Ações da mensagem"
        aria-expanded={open}
        className={cn(
          "absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-black/5 shadow-[0_2px_6px_rgba(15,20,40,0.22)] transition-opacity",
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        style={{ background: "#ffffff", color: "#334155" }}
      >
        <IconChevronDown size={14} stroke={2.2} />
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              role="menu"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                background: "#ffffff",
                color: "#0f172a",
              }}
              className="z-[100] w-[224px] max-w-[calc(100vw-16px)] overflow-hidden rounded-[var(--radius-lg)] border border-black/5 shadow-[0_12px_32px_rgba(15,20,40,0.22)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Barra de reações rápidas — sempre visível. Se onReact
                  não estiver plugado, ainda mostramos, mas emoji clica
                  no stub (fecha menu) até o container implementar. */}
              <div
                className="flex items-center gap-0.5 border-b px-1.5 py-1"
                style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-white"
                    aria-label={`Reagir com ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <ul className="py-1">
                <MenuItem
                  icon={<IconArrowBackUp size={15} />}
                  label="Responder"
                  onClick={() => {
                    if (onReply) {
                      onReply(message)
                      setOpen(false)
                    } else {
                      stub("Responder")
                    }
                  }}
                />
                <MenuItem
                  icon={<IconMoodPlus size={15} />}
                  label="Reagir"
                  onClick={() => {
                    if (onReact) {
                      onReact(message, null)
                      setOpen(false)
                    } else {
                      stub("Reagir")
                    }
                  }}
                />
                {/* "Encaminhar" removido do menu — o fluxo ainda nao tem
                    modal de selecao de conversa alvo (feature pendente
                    da lista original). Voltar aqui quando `onForward`
                    tiver UI real; a prop e o handler seguem intactos
                    no componente pra minimizar o diff quando reativar. */}
                <MenuItem
                  icon={
                    message.isPinnedMessage ? (
                      <IconPinFilled size={15} className="text-[var(--brand-primary)]" />
                    ) : (
                      <IconPin size={15} />
                    )
                  }
                  label={message.isPinnedMessage ? "Desafixar" : "Fixar"}
                  onClick={() => {
                    if (onPin) {
                      onPin(message)
                      setOpen(false)
                    } else {
                      stub("Fixar")
                    }
                  }}
                />
                <MenuItem
                  icon={
                    message.isFavorited ? (
                      <IconStarFilled size={15} className="text-amber-500" />
                    ) : (
                      <IconStar size={15} />
                    )
                  }
                  label={message.isFavorited ? "Desfavoritar" : "Favoritar"}
                  onClick={() => {
                    if (onFavorite) {
                      onFavorite(message)
                      setOpen(false)
                    } else {
                      stub("Favoritar")
                    }
                  }}
                />
                {canCopy && (
                  <MenuItem
                    icon={<IconCopy size={15} />}
                    label={copied ? "Copiado!" : "Copiar"}
                    onClick={handleCopy}
                  />
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        role="menuitem"
        // Cores hardcoded: em v2-dark, --text-primary flipa pra claro
        // e o item fica branco-sobre-branco (invisivel). Popover sempre
        // fundo branco + texto slate-900 pra manter contraste.
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-body text-[13px] transition-colors hover:bg-slate-50"
        style={{ color: "#0f172a" }}
      >
        <span
          className="flex h-5 w-5 items-center justify-center"
          style={{ color: "#475569" }}
        >
          {icon}
        </span>
        {label}
      </button>
    </li>
  )
}

export function MessageBubble({
  message,
  agentInitials,
  className,
  isPinned,
  onPinNote,
  onAddToLog,
  onReplyMessage,
  onForwardMessage,
  onReactMessage,
  onPinMessage,
  onFavoriteMessage,
}: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing"
  const isBot = message.isBot ?? false
  const isNote = message.isNote === true
  const hasForm = !!(message.formFields && message.formFields.length > 0)
  const hasButtons = !!(message.buttons && message.buttons.length > 0)
  const senderName = message.senderName

  // Menu WhatsApp-like só entra nas RECEBIDAS. Nas outgoing/notas/forms
  // o layout já é usado por outras ações (avatar, badges, ações de nota).
  const hasReceivedMenu =
    !isOutgoing &&
    !isNote &&
    !hasForm &&
    message.messageType !== "sip_call" &&
    // Sempre monta em mensagens recebidas de texto/mídia. Mesmo sem
    // callbacks plugados, o menu ainda oferece "Copiar" e mostra os
    // demais itens como stubs — melhor UX que sumir o chevron todo.
    !!(message.content && message.content.trim() || message.mediaUrl)

  if (hasForm) {
    return <FormBubble message={message} className={className} />
  }

  // Aviso de ligação (SIP/Api4com): linha centralizada com ícone — distingue
  // recebida/realizada/não-atendida. Renderizado igual no inbox e no pipeline
  // (ambos usam MessageBubble).
  if (message.messageType === "sip_call") {
    const inbound = message.type === "incoming"
    const missed = /n[ãa]o atendida/i.test(message.content)
    return (
      <div className={cn("flex w-full items-center justify-center py-1", className)}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[11px] font-semibold",
            missed
              ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 text-[var(--color-danger)]"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
          )}
        >
          {missed ? (
            <IconPhoneOff size={12} />
          ) : inbound ? (
            <IconPhoneIncoming size={12} />
          ) : (
            <IconPhoneOutgoing size={12} />
          )}
          <span>{message.content}</span>
          <span className="text-[var(--text-muted)]">· {message.time}</span>
        </span>
      </div>
    )
  }

  // Nota interna: card neutro (cinza claro) com acento indigo no rótulo
  // "NOTA" — modelo alinhado ao screenshot (antes era gradiente âmbar).
  // Layout: [🔒 NOTA] [texto flex-1] [ações hover] [agente] [hora]
  if (isNote) {
    const hasNoteActions = !!(onPinNote || onAddToLog)
    return (
      <div
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] border px-3.5 py-2 text-sm leading-[1.45] transition-colors",
          isPinned
            ? "border-[color-mix(in_srgb,var(--brand-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)]"
            : "border-[color-mix(in_srgb,var(--text-muted)_18%,transparent)] bg-[color-mix(in_srgb,var(--text-muted)_7%,white)]",
          className,
        )}
      >
        {/* Indicador de nota fixada */}
        {isPinned && (
          <span className="absolute -top-1.5 right-8 flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_15%,white)] px-1.5 py-0.5">
            <IconPinFilled size={9} className="text-[var(--brand-primary)]" />
            <span className="font-display text-[8px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              fixada
            </span>
          </span>
        )}

        {/* Ícone + badge "NOTA" */}
        <span className="flex shrink-0 items-center gap-1.5">
          <IconLock size={13} className="text-[var(--brand-primary)]" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)]">
            Nota
          </span>
        </span>

        {/* Separador */}
        <span className="h-3.5 w-px shrink-0 bg-[color-mix(in_srgb,var(--text-muted)_25%,transparent)]" />

        {/* Conteúdo da mensagem */}
        <span className="min-w-0 flex-1 text-[var(--text-primary)]">
          <MessageContent message={message} isOutgoing={false} />
        </span>

        {/* Ações hover (fixar + log) */}
        {hasNoteActions && (
          <span className="ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onPinNote && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      isPinned ? onPinNote(null) : onPinNote(message.id)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] hover:text-[var(--brand-primary)]"
                    aria-label={isPinned ? "Desafixar nota" : "Fixar nota"}
                  >
                    {isPinned ? (
                      <IconPinFilled size={13} />
                    ) : (
                      <IconPin size={13} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  {isPinned ? "Desafixar nota" : "Fixar nota"}
                </TooltipContent>
              </Tooltip>
            )}
            {onAddToLog && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onAddToLog(message.content)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] hover:text-[var(--brand-primary)]"
                    aria-label="Adicionar ao log do negócio"
                  >
                    <IconListCheck size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  Adicionar ao log do negócio
                </TooltipContent>
              </Tooltip>
            )}
          </span>
        )}

        {/* Agente + hora */}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {senderName && (
            <span className="font-display text-[11px] font-semibold text-[var(--text-secondary)]">
              {senderName}
            </span>
          )}
          <span className="font-body text-[10.5px] text-[var(--text-muted)]">
            {message.time}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex max-w-[75%] flex-col gap-0.5",
        isOutgoing ? "ml-auto items-end" : "items-start",
        className,
      )}
    >
      <div className={cn("group flex items-end gap-2.5", isOutgoing && "flex-row-reverse")}>
        {/* Avatar: robô para bot, iniciais para agente — com tooltip do nome.
            Automação manual (colab): robô + chip de iniciais do agente que
            acionou, sobreposto no canto inferior direito. */}
        {isOutgoing && (
          message.isAutomationRun && message.automationAgentInitials ? (
            <div className="relative flex shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex h-8 w-8 cursor-default items-center justify-center rounded-full font-display text-[10px] font-bold text-white"
                    style={{ background: AUTOMATION_ACCENT }}
                  >
                    <IconRobot size={16} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="font-medium text-[11px]">
                  Automação
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute -bottom-1 -right-1 flex h-[18px] min-w-[18px] cursor-default items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] px-0.5 font-display text-[9px] font-bold leading-none text-white shadow-[0_1px_3px_rgba(15,20,40,0.28)]">
                    {message.automationAgentInitials}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="font-medium text-[11px]">
                  Disparada por {message.automationAgentName || "agente"}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 cursor-default items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
                    !isBot && "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]",
                  )}
                  style={isBot ? { background: AUTOMATION_ACCENT } : undefined}
                >
                  {isBot ? <IconRobot size={14} /> : (message.senderInitials || agentInitials || "?")}
                </div>
              </TooltipTrigger>
              {senderName && (
                <TooltipContent side="left" className="font-medium text-[11px]">
                  {senderName}
                </TooltipContent>
              )}
            </Tooltip>
          )
        )}
        <div
          className={cn(
            "relative min-w-0 rounded-[var(--radius-lg)] px-3.5 py-2 text-sm leading-[1.45]",
            isOutgoing
              ? isBot
                // Bolha de AUTOMAÇÃO: cinza escuro com texto claro.
                // Cores hardcoded (não usar --text-primary) porque em v2-dark
                // o token flipa e some contra o fundo fixo desta bolha.
                ? "rounded-br border border-white/10 shadow-[0_3px_12px_rgba(15,20,40,0.28)]"
                : "rounded-br shadow-[0_4px_16px_rgba(91,111,245,0.30)]"
              : "rounded-bl text-[var(--text-primary)] shadow-[0_2px_12px_rgba(100,130,180,0.10)]",
          )}
          style={
            isOutgoing
              ? isBot
                ? {
                    // Lavanda com texto violeta-escuro fixo — invariante ao
                    // data-chat-theme e ao modo dark/light (ref. V0).
                    background: AUTOMATION_BG,
                    color: AUTOMATION_TEXT,
                  }
                : {
                    background: "var(--chat-bubble-sent-bg)",
                    color: "var(--chat-bubble-sent-text)",
                  }
              : { background: "var(--chat-bubble-received-bg)", color: "var(--chat-bubble-received-text)" }
          }
        >
          {/* Indicador de mensagem fixada — banner no topo da conversa
              (Conversation.pinnedMessageId). Canto oposto ao chevron do
              menu (que fica em -right-2 nas recebidas) pra não colidir. */}
          {message.isPinnedMessage && (
            <span
              className="absolute -left-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-black/5 shadow-[0_2px_6px_rgba(15,20,40,0.18)]"
              style={{ background: "#ffffff" }}
              title="Mensagem fixada"
            >
              <IconPinFilled size={10} className="text-[var(--brand-primary)]" />
            </span>
          )}
          {/* Badge AUTOMAÇÃO — pill escuro em cima do card claro tintado.
              Exibe o nome da automação (senderName) quando o backend envia;
              caso contrário cai no rótulo genérico "Automação". */}
          {isBot && (
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-widest"
                style={{ background: "rgba(199,210,254,0.18)", color: "#e0e7ff" }}
                title={
                  message.isAutomationRun
                    ? "Automação disparada manualmente"
                    : senderName || "Automação"
                }
              >
                <IconRobot size={10} />
                {message.isAutomationRun ? "Manual" : senderName || "Automação"}
              </span>
            </div>
          )}
          {/* Badge TEMPLATE — identifica visualmente quando a mensagem
              foi enviada usando um template pré-aprovado da Meta. Pode
              coexistir com o badge AUTOMAÇÃO (automação disparando um
              template) ou aparecer sozinho (agente enviando template
              manualmente). Usa cor accent que contrasta com ambos os
              fundos (bolha azul regular e bolha automação tintada). */}
          {message.messageType === "template" && (
            <div className={cn("mb-1.5 flex items-center gap-1.5", isBot && "-mt-0.5")}>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-widest",
                  isOutgoing && !isBot
                    ? "bg-white/22 text-white ring-1 ring-inset ring-white/25"
                    : "bg-[color-mix(in_srgb,#0ea5e9_14%,white)] text-[#0369a1] ring-1 ring-inset ring-[color-mix(in_srgb,#0ea5e9_35%,transparent)]",
                )}
                title="Mensagem enviada usando um template aprovado da Meta"
              >
                <IconFile size={10} />
                Template
              </span>
            </div>
          )}
          {/* Menu WhatsApp-like nas mensagens recebidas: chevron que
              expande com reações rápidas + Responder/Encaminhar/Copiar/Reagir.
              Só monta quando há pelo menos uma ação (senão o hover fica vazio). */}
          {hasReceivedMenu && (
            <ReceivedMessageMenu
              message={message}
              onReply={onReplyMessage}
              onForward={onForwardMessage}
              onReact={onReactMessage}
              onPin={onPinMessage}
              onFavorite={onFavoriteMessage}
            />
          )}
          {/* Citação: cliente respondeu uma mensagem específica.
              Barra vertical + trecho curto, estilo WhatsApp. */}
          {message.replyTo?.snippet && (
            <QuotedPreview
              snippet={message.replyTo.snippet}
              direction={message.replyTo.direction ?? "out"}
              senderName={message.replyTo.senderName ?? null}
              onLightBg={!isOutgoing}
            />
          )}
          {/* Conteúdo: mídia (áudio/imagem/vídeo/documento) ou texto */}
          <MessageContent message={message} isOutgoing={isOutgoing} />
          {/* Botões de resposta rápida (interactive/template) — cards
              empilhados abaixo do corpo, estilo WhatsApp/V0. */}
          {message.buttons && message.buttons.length > 0 && (
            <MessageButtons buttons={message.buttons} onLightBg={!isOutgoing} />
          )}
          {/* Horário + ticks. Sem botões, flutua no canto inferior direito
              (padrão WhatsApp). COM botões, entra em fluxo abaixo deles,
              alinhado à direita — senão o horário/ticks ficam cortados por
              cima do último botão. */}
          <span
            className={cn(
              "pointer-events-none select-none items-center gap-0.5 whitespace-nowrap text-[10.5px] leading-none",
              hasButtons
                ? "mt-1.5 flex w-full justify-end"
                : "absolute bottom-1.5 right-2.5 inline-flex",
              isOutgoing && isBot && "text-white/70",
              !isOutgoing && "text-[var(--text-muted)]",
            )}
            style={
              isOutgoing && !isBot
                ? { color: "var(--chat-bubble-sent-time)" }
                : undefined
            }
          >
            {message.isFavorited && (
              <IconStarFilled size={10} className="text-amber-400" aria-label="Favoritada" />
            )}
            {message.time}
            {isOutgoing && message.status && (
              <StatusIndicator
                status={message.status}
                sendError={message.sendError}
                onLightBg={false}
              />
            )}
          </span>
          {/* Badge de reação flutuante: emoji do cliente sobre o canto
              inferior da bolha (padrão WhatsApp Web). Quando há múltiplas
              reações distintas, exibe as duas primeiras + contador. */}
          {message.reactions && message.reactions.length > 0 && (
            <ReactionBadge
              reactions={message.reactions}
              anchor={isOutgoing ? "left" : "right"}
            />
          )}
        </div>
      </div>

      {/* Nome do remetente apenas no tooltip do avatar (acima) */}
    </div>
  )
}

/**
 * Cabeçalho de citação (reply) — aparece dentro da bolha, acima do
 * conteúdo. Renderiza barra vertical colorida à esquerda + trecho curto.
 * A cor da barra e do texto dependem do fundo da bolha para garantir
 * contraste em qualquer variação (azul, indigo, cinza claro).
 */
function QuotedPreview({
  snippet,
  direction,
  senderName,
  onLightBg,
}: {
  snippet: string
  direction: "in" | "out"
  senderName: string | null
  onLightBg: boolean
}) {
  const label = senderName || (direction === "out" ? "Você" : "Cliente")
  // Cores hardcoded p/ atravessar dark/light sem depender de --text-*.
  const bg = onLightBg ? "#f1f5f9" : "rgba(255,255,255,0.14)"
  const border = onLightBg ? "#5b6ff5" : "#ffffff"
  const labelColor = onLightBg ? "#4338ca" : "#e0e7ff"
  const textColor = onLightBg ? "#334155" : "rgba(255,255,255,0.88)"
  return (
    <div
      className="mb-1.5 overflow-hidden rounded-md pl-2"
      style={{ background: bg, borderLeft: `3px solid ${border}` }}
    >
      <div className="px-2 py-1">
        <div
          className="font-display text-[10.5px] font-bold leading-none"
          style={{ color: labelColor }}
        >
          {label}
        </div>
        <div
          className="mt-0.5 line-clamp-2 font-body text-[11.5px] leading-snug"
          style={{ color: textColor }}
        >
          {snippet}
        </div>
      </div>
    </div>
  )
}

/**
 * Badge circular com o(s) emoji(s) de reação, ancorado no canto inferior
 * da bolha. WhatsApp Web mostra até 2 emojis distintos + "+N" se houver
 * mais tipos. Sempre fundo branco com sombra para destacar sobre a bolha.
 */
function ReactionBadge({
  reactions,
  anchor,
}: {
  reactions: NonNullable<Message["reactions"]>
  anchor: "left" | "right"
}) {
  // Agrupa por emoji (contagem). WhatsApp 1:1 quase sempre entrega
  // apenas uma reação por bolha; a agregação é defensiva para grupos
  // futuros ou histórico duplicado.
  const groups = new Map<string, number>()
  for (const r of reactions) {
    groups.set(r.emoji, (groups.get(r.emoji) ?? 0) + 1)
  }
  const entries = Array.from(groups.entries())
  const total = reactions.length
  return (
    <div
      className={cn(
        "pointer-events-none absolute -bottom-2 flex items-center gap-0.5 rounded-full border border-black/5 bg-white px-1.5 py-0.5 shadow-[0_2px_6px_rgba(15,20,40,0.18)]",
        anchor === "left" ? "left-1" : "right-1",
      )}
      title={reactions.map((r) => r.emoji).join(" ")}
    >
      {entries.slice(0, 2).map(([emoji]) => (
        <span key={emoji} className="text-[13px] leading-none">
          {emoji}
        </span>
      ))}
      {total > 1 && (
        <span className="ml-0.5 font-display text-[10px] font-semibold text-slate-600">
          {total}
        </span>
      )}
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

interface ConnectionDividerProps {
  /** Rótulo completo da conexão (ex.: "WhatsApp · Vendas SP · +55 (11) 9..."). */
  label: string
}

/**
 * Marcador na timeline indicando que, a partir daqui, a conversa passou a
 * trafegar por OUTRA conexão (ex.: o contato escreveu para outro número de
 * WhatsApp da empresa). Inserido pelo chat quando o `channelId` da mensagem
 * muda em relação à anterior.
 */
export function ConnectionDivider({ label }: ConnectionDividerProps) {
  return (
    <div className="my-1 flex items-center justify-center gap-2 self-center">
      <span className="h-px w-6 bg-[var(--glass-border)]" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[10.5px] font-semibold text-[var(--text-secondary)]">
        <IconArrowsExchange size={12} className="text-[var(--brand-primary)]" />
        via {label}
      </span>
      <span className="h-px w-6 bg-[var(--glass-border)]" />
    </div>
  )
}

interface TicketDividerProps {
  /** Número sequencial do ticket (#N). */
  number: number
  /** ISO do encerramento — null para o ticket atual (em andamento). */
  closedAt: string | null
  /** Ticket em andamento (mais recente) — estilo ligeiramente diferente. */
  isCurrent?: boolean
}

/**
 * Separador de ticket na linha do tempo contínua do contato.
 * Aparece no início de cada ticket quando `history=1` está ativo,
 * distinguindo ciclos de atendimento distintos sem esconder o histórico.
 */
export function TicketDivider({ number, closedAt, isCurrent }: TicketDividerProps) {
  let dateLabel = ""
  if (closedAt) {
    const d = new Date(closedAt)
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0")
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const yyyy = d.getFullYear()
      dateLabel = ` · encerrado ${dd}/${mm}/${yyyy}`
    }
  }
  return (
    <div className="my-3 flex items-center gap-2 self-stretch">
      <span className="h-px flex-1 bg-[var(--glass-border)]" />
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[10.5px] font-semibold",
          isCurrent
            ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
        )}
      >
        {isCurrent ? "Conversa atual" : `#${number}${dateLabel}`}
      </span>
      <span className="h-px flex-1 bg-[var(--glass-border)]" />
    </div>
  )
}

interface ConversationClosedMarkerProps {
  /** ISO da data de encerramento — quando ausente, mostra so "Conversa encerrada". */
  closedAt?: string | null
}

/**
 * Marcador no fim da timeline indicando que a conversa foi encerrada.
 * Mesmo padrao visual do `ConnectionDivider`/`DaySeparator` (chip pill
 * centralizado com bordas hairline) — minimalista, dentro do proprio
 * chat, sem card lateral. Usado no inbox (via ChatArea) e no pipeline
 * (via messagesSlot do DealDetailPanel).
 */
export function ConversationClosedMarker({ closedAt }: ConversationClosedMarkerProps) {
  let label: string | null = null
  if (closedAt) {
    const d = new Date(closedAt)
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0")
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mi = String(d.getMinutes()).padStart(2, "0")
      label = `${dd}/${mm} às ${hh}:${mi}`
    }
  }
  return (
    <div className="my-2 flex items-center justify-center gap-2 self-center">
      <span className="h-px w-6 bg-[var(--glass-border)]" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[10.5px] font-semibold text-[var(--text-secondary)]">
        <IconLock size={12} className="text-[var(--text-muted)]" />
        Conversa encerrada{label ? ` · ${label}` : ""}
      </span>
      <span className="h-px w-6 bg-[var(--glass-border)]" />
    </div>
  )
}
