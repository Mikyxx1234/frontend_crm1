"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import {
  IconArrowLeft,
  IconChevronDown,
  IconCircleX,
  IconDotsVertical,
  IconGripVertical,
  IconSearch,
  IconPlus,
  IconPencil,
  IconMessageCircle,
  IconChecklist,
  IconNote,
  IconClock,
  IconPhone,
  IconPaperclip,
  IconMoodSmile,
  IconMicrophone,
  IconSend,
  IconSettings,
  IconX,
  IconCircleCheck,
  IconCircleDashed,
  IconAffiliate,
} from "@tabler/icons-react"
import {
  channelTypeLabel,
  formatConnectionLabel,
  formatConnectionShort,
  type ConnectionRef,
} from "@/lib/connection-label"
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks"
import { RequirePermission } from "@/components/auth/require-permission"
import { useSectionOrder } from "@/hooks/use-section-order"
import { BadgeGlass } from "./badge-glass"

// ─── Ordem das seções da sidebar ──────────────────────────────────
type SidebarSection = "principal" | "contato" | "campos"
const SIDEBAR_DEFAULT_ORDER: SidebarSection[] = ["principal", "contato", "campos"]
const SIDEBAR_STORAGE_KEY = "crm:deal-detail:sidebar-order"
import { ChatArea } from "./chat-area"
import { type Message } from "./message-bubble"
import { resolveHighlight, SEVERITY_COLORS } from "@/lib/highlight"
import { InlineFieldEditor } from "@/components/crm/fields/inline-field-editor"
import { InlineNativeEditor } from "@/components/crm/fields/inline-native-editor"

interface DealOwner {
  initials: string
  name: string
  avatarColor: string
}

export interface DealDetail {
  id: string
  /** Número sequencial do deal por organização (1, 2, 3…). */
  number?: number | null
  /** ID do contato vinculado ao deal (necessário para editar campos do contato inline). */
  contactId?: string | null
  /** Número sequencial do contato por organização. */
  contactNumber?: number | null
  name: string
  initials: string
  avatarColor: string
  phone?: string
  email?: string | null
  /** Valor do negócio (campo "Venda" no painel Kommo). */
  value?: number | string | null
  online?: boolean
  stage?: string
  owner?: DealOwner
  /** Status do deal — quando "LOST", o painel exibe o motivo da perda. */
  status?: "OPEN" | "WON" | "LOST" | null
  /** Motivo registrado ao marcar o deal como perdido (texto livre OU label
   *  cadastrado). Exibido em destaque no cabeçalho da sidebar. */
  lostReason?: string | null
}

type TabId = "conversa" | "atividades" | "notas" | "timeline" | "chamadas"

interface DealDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  deal?: DealDetail | null
  // Slots opcionais — quando ausentes, mantém o visual default do v0.
  stageRibbonSlot?: React.ReactNode
  winButtonSlot?: React.ReactNode
  /** Botão "Ligar" do softphone — posicionado no header, antes do moreActions. */
  callButtonSlot?: React.ReactNode
  moreActionsSlot?: React.ReactNode
  /** Botão dedicado de excluir negócio (atalho visível no header). */
  deleteSlot?: React.ReactNode
  /** Botão de edição do contato (ex.: ContactEditDialog), ao lado do nome. */
  contactEditSlot?: React.ReactNode
  ownerSlot?: React.ReactNode
  sourceSlot?: React.ReactNode
  tagsSlot?: React.ReactNode
  /**
   * Slots para conteudo dinamico do painel de chat. Quando passados,
   * substituem o bloco hardcoded do v0 e permitem plugar mensagens
   * reais via useMessages, composer real via Composer e alerta de
   * sessao via SessionAlert.
   */
  messagesSlot?: React.ReactNode
  composerSlot?: React.ReactNode
  sessionAlertSlot?: React.ReactNode
  /**
   * Override por tab. Quando definido para a tab atual, substitui o
   * painel <main> inteiro pelo node. Util para Atividades/Notas/
   * Timeline conectarem em endpoints reais sem reescrever o panel.
   */
  tabContentOverride?: Partial<Record<TabId, React.ReactNode>>
  /**
   * Campos personalizados reais do negócio.
   * Quando fornecido, substitui os rótulos hardcoded (FIELD_GROUPS).
   * Cada item: { fieldId, label, value } — value nulo exibe "—".
   * `highlightRules` opcional: regras de formatação condicional (JSON cru).
   * `entityType` + `entityId`: entidade dona do valor (para edição inline).
   * `options`: opções de um campo SELECT.
   */
  customFieldsSlot?: {
    fieldId: string;
    label: string;
    value: string | null;
    type?: string;
    options?: string[];
    entityType?: "contact" | "deal";
    entityId?: string;
    highlightRules?: unknown[] | null;
    /** Highlight já resolvido pelo backend — preferir sobre re-resolver. */
    highlight?: { severity: string; label: string } | null;
  }[]
  /**
   * Seção de produtos do negócio (line items). Renderizada no fim da
   * sidebar, abaixo das seções reordenáveis. Permite adicionar/editar/
   * remover produtos vinculados ao deal.
   */
  productsSlot?: React.ReactNode
  /**
   * Callback para negócio SEM contato vinculado: ao inserir telefone/email
   * nos "Dados de contato", cria um contato novo e vincula ao deal.
   * Quando ausente, os campos ficam só-leitura (comportamento legado).
   */
  onCreateContactForField?: (field: "phone" | "email", value: string) => Promise<void>
  /**
   * Painel de configuração de campos (FieldConfigPanel).
   * Quando fornecido, exibe um botão de engrenagem na sidebar que
   * alterna para o modo de configuração. Visível apenas para admin/manager.
   */
  fieldConfigSlot?: React.ReactNode
  /** Slot de configuração de campos de contato (split do fieldConfigSlot). */
  contactFieldConfigSlot?: React.ReactNode
  /** Slot de configuração de campos de negócio (split do fieldConfigSlot). */
  dealFieldConfigSlot?: React.ReactNode
  /**
   * Dropdown de troca de fase montado externamente (ex.: StagePicker glass).
   * Quando fornecido, substitui o bloco "Funil de vendas / nome da fase" da sidebar.
   */
  stageDropdownSlot?: React.ReactNode
  /**
   * Segmentos reais do funil para a barra de progresso da sidebar.
   * Cada item: { id, name, color, position } — renderizados em ordem de position.
   * Se ausente, cai nos STAGES/FUNNEL_PALETTE hardcoded.
   */
  funnelSegments?: { id: string; name: string; color: string; position: number }[]
  /** ID da conversa ativa vinculada ao deal — permite encerrar/reabrir pelo kebab da TabsBar. */
  conversationId?: string | null
  /** Estado de resolução da conversa — para mostrar "Encerrar" ou "Reabrir". */
  isResolved?: boolean
  /**
   * Conexão (Channel) por onde o contato está conversando (qual WhatsApp).
   * Exibida como chip no header do contato — distingue quando a pessoa fala
   * por contas/fontes diferentes.
   */
  connection?: ConnectionRef | null
}

const STAGES = ["Lead", "Novo", "Qualificado", "Proposta", "Negociação", "Fechamento"]

// Paleta do funil segmentado (estilo Kommo) — uma cor por etapa.
const FUNNEL_PALETTE = ["#94a3b8", "#5b6ff5", "#a78bfa", "#f59e0b", "#ec4899", "#10b981"]

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }>; count?: number }[] = [
  { id: "conversa", label: "Conversa", icon: IconMessageCircle, count: 1 },
  { id: "atividades", label: "Atividades", icon: IconChecklist, count: 3 },
  { id: "notas", label: "Notas", icon: IconNote },
  { id: "timeline", label: "Timeline", icon: IconClock },
  { id: "chamadas", label: "Chamadas", icon: IconPhone },
]

export function DealDetailPanel({
  isOpen,
  onClose,
  deal,
  callButtonSlot,
  moreActionsSlot,
  deleteSlot: _deleteSlot,
  contactEditSlot,
  ownerSlot,
  sourceSlot,
  tagsSlot,
  productsSlot,
  onCreateContactForField,
  messagesSlot,
  composerSlot,
  sessionAlertSlot,
  tabContentOverride,
  customFieldsSlot,
  fieldConfigSlot,
  contactFieldConfigSlot,
  dealFieldConfigSlot,
  stageDropdownSlot,
  funnelSegments,
  conversationId,
  isResolved,
  connection,
}: DealDetailPanelProps) {
  // Retrocompatibilidade: split slots sobrepõem o legado fieldConfigSlot
  const resolvedContactConfig = contactFieldConfigSlot ?? fieldConfigSlot ?? null;
  const resolvedDealConfig = dealFieldConfigSlot ?? null;
  const [activeTab, setActiveTab] = useState<TabId>("conversa")
  const [configOpen, setConfigOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  // Optimistic updates para campos nativos do deal
  const [dealNative, setDealNative] = useState<Record<string, string>>({})
  // Modo edição para campos personalizados do negócio
  const [dealCustomEditMode, setDealCustomEditMode] = useState(false)
  const [sectionOrder, reorderSections] = useSectionOrder<SidebarSection>(
    SIDEBAR_STORAGE_KEY,
    SIDEBAR_DEFAULT_ORDER,
  )

  // ── Resize da sidebar do detalhe (drag horizontal) ───────────────
  // Largura persistida em localStorage por operador. Min 280 evita
  // truncar o nome do estágio/dropdown; max 560 garante que o chat
  // (coluna direita) mantenha legibilidade mesmo em telas pequenas.
  // Default 340 mantém o tamanho histórico do v0 pra quem nunca
  // arrastou ficar igual ao que já conhecia.
  const SIDEBAR_WIDTH_STORAGE_KEY = "crm:deal-detail.sidebarWidth"
  const SIDEBAR_WIDTH_MIN = 280
  const SIDEBAR_WIDTH_MAX = 560
  const SIDEBAR_WIDTH_DEFAULT = 340
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return SIDEBAR_WIDTH_DEFAULT
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
    const parsed = raw ? Number(raw) : NaN
    if (!Number.isFinite(parsed)) return SIDEBAR_WIDTH_DEFAULT
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, parsed))
  })
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const onResizeMove = useCallback((e: MouseEvent) => {
    const start = resizeRef.current
    if (!start) return
    const delta = e.clientX - start.startX
    const next = Math.min(
      SIDEBAR_WIDTH_MAX,
      Math.max(SIDEBAR_WIDTH_MIN, start.startWidth + delta),
    )
    setSidebarWidth(next)
  }, [])

  const onResizeEnd = useCallback(() => {
    resizeRef.current = null
    window.removeEventListener("mousemove", onResizeMove)
    window.removeEventListener("mouseup", onResizeEnd)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    // Persiste a última largura conhecida (lê do DOM via state via closure
    // do React — atualizamos imediatamente em onResizeMove acima).
    setSidebarWidth((current) => {
      try {
        window.localStorage.setItem(
          SIDEBAR_WIDTH_STORAGE_KEY,
          String(current),
        )
      } catch {
        // localStorage pode estar bloqueado (private mode / quota); fail-silent
      }
      return current
    })
  }, [onResizeMove])

  const onResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth }
      // Visual hint enquanto arrasta — cursor global e bloqueio de seleção
      // de texto evitam "fantasmas" de highlight ao puxar rápido.
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("mousemove", onResizeMove)
      window.addEventListener("mouseup", onResizeEnd)
    },
    [sidebarWidth, onResizeMove, onResizeEnd],
  )

  function handleSidebarDragEnd(result: DropResult) {
    if (!result.destination) return
    reorderSections(result.source.index, result.destination.index)
  }

  // ESC fecha o painel quando esta aberto. Ignora se algum input/
  // textarea/contenteditable estiver focado para nao atrapalhar
  // edicao (composer, notas, inline edits).
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return
      onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  // Cleanup defensivo: se o componente desmontar (painel fechado) durante
  // um drag em andamento, removemos listeners pra evitar memory leak e
  // restauramos o cursor/seleção globais.
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onResizeMove)
      window.removeEventListener("mouseup", onResizeEnd)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [onResizeMove, onResizeEnd])

  // Enquanto isOpen=true mas o detail ainda está carregando (API assíncrona),
  // mostra o frame do painel com skeleton para dar feedback imediato ao clique.
  if (!deal) {
    if (!isOpen) return null;
    return (
      <div
        className="fixed inset-0 z-50 translate-x-0 transition-transform duration-300 ease-out"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-base, #dde8f5) 0%, var(--bg-mesh-1, #b8cfec) 40%, var(--bg-mesh-2, #e8d5f0) 70%, var(--bg-base, #dde8f5) 100%)",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="flex h-full flex-col gap-3.5 overflow-hidden p-4">
          <header className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-[22px] py-3.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
            <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]">
              <IconX size={18} />
            </button>
            <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--glass-bg-strong)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 animate-pulse rounded bg-[var(--glass-bg-strong)]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--glass-bg-strong)]" />
            </div>
          </header>
          <div className="flex min-h-0 flex-1 gap-3.5">
            <div className="flex w-[320px] shrink-0 flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-5 backdrop-blur-md">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--glass-bg-overlay)]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[var(--glass-bg-overlay)]" />
                </div>
              ))}
            </div>
            <div className="flex flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md">
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--glass-border)] border-t-[var(--brand-primary)]" />
                <span className="font-display text-[12px]">Carregando…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStageIndex = deal.stage ? STAGES.indexOf(deal.stage) : 2
  const avatarClass = `av-${deal.avatarColor}`

  // Mensagens default (mock alinhado ao DS) — usadas quando nao ha messagesSlot.
  const fallbackMessages: Message[] = [
    {
      id: "1",
      content: "Olá! Aqui está meu currículo conforme combinado.",
      time: "15:24",
      type: "incoming",
    },
    {
      id: "2",
      content: `Olá, ${deal.name.split(" ")[0]}! Recebi seu currículo. Vou analisar e retorno até amanhã com os próximos passos.`,
      time: "15:32",
      type: "outgoing",
      senderInitials: "AS",
    },
    {
      id: "3",
      content: "Perfeito! Fico no aguardo. Se precisar de mais documentação, me avise.",
      time: "15:35",
      type: "incoming",
    },
  ]

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--bg-base, #dde8f5) 0%, var(--bg-mesh-1, #b8cfec) 40%, var(--bg-mesh-2, #e8d5f0) 70%, var(--bg-base, #dde8f5) 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="flex h-full flex-col gap-3.5 overflow-hidden p-4">
        {/* HEADER */}
        <header className="flex items-center gap-[18px] rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-[22px] py-3.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <TooltipGlass label="Voltar" side="bottom">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)]/30 hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
            >
              <IconArrowLeft size={18} />
            </button>
          </TooltipGlass>

          {/* Contact */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                avatarClass,
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--glass-bg-overlay)] font-display text-[15px] font-bold text-white",
              )}
            >
              {deal.initials}
              {deal.online && (
                <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-[var(--glass-bg-strong)] bg-[var(--color-online)]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 font-display text-[18px] font-bold text-[var(--text-primary)]">
                {deal.name}
                <BadgeGlass variant="enterprise">ENTERPRISE</BadgeGlass>
                {contactEditSlot}
              </div>
              <div className="mt-px flex items-center gap-2 font-display text-xs text-[var(--text-muted)]">
                <span>
                  {deal.contactNumber != null
                    ? `#${deal.contactNumber}`
                    : deal.number != null
                      ? `#${deal.number}`
                      : `#${deal.id.slice(-6).toUpperCase()}`}
                  {deal.phone ? ` · ${deal.phone}` : ""}
                </span>
                {connection && (
                  <TooltipGlass
                    label={`Conversando por ${formatConnectionLabel(connection)}`}
                    side="bottom"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--text-secondary)]">
                      <IconAffiliate size={11} className="text-[var(--brand-primary)]" />
                      {channelTypeLabel(connection.type)} · {formatConnectionShort(connection)}
                    </span>
                  </TooltipGlass>
                )}
              </div>
            </div>
          </div>

          {/* Espaço flex-1 para empurrar actions para a direita */}
          <div className="flex-1" />
        </header>

        {/* 2 COLS: SIDEBAR + CONTENT — largura da sidebar é dinâmica
            (drag horizontal na handle entre as colunas). Min/max bounds
            evitam quebrar layouts em telas pequenas / coluna direita ficar
            espremida. */}
        <div
          className="grid min-h-0 flex-1 gap-4 overflow-hidden"
          style={{ gridTemplateColumns: `${sidebarWidth}px 8px 1fr` }}
        >
          {/* SIDEBAR — painel funcional estilo Kommo (DS glass) */}
          <aside
            aria-label="Detalhes do negócio"
            className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow)] backdrop-blur-md"
          >
            {/* Cabeçalho fixo: identificador + funil de vendas segmentado */}
            <div className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-[22px] pb-4 pt-[18px]">
              {/* Linha do título: nome do deal + tags inline + gear */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  <h2 className="shrink-0 font-display text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
                    Lead #{deal.number ?? deal.id.slice(-6).toUpperCase()}
                  </h2>
                  {/* Tags inline com o título */}
                  {tagsSlot ?? (
                    <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-[var(--glass-border)] px-2 py-0.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                      <IconPlus size={10} />
                      Tags
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                {/* Botão "Ligar" — softphone Api4Com */}
                {callButtonSlot}
                {/* Kebab (ações do deal) */}
                {moreActionsSlot}
                {/* Gear (configuração de campos) */}
                {(resolvedContactConfig || resolvedDealConfig) && (
                  <TooltipGlass
                    label={configOpen ? "Voltar aos campos" : "Configurar campos"}
                    side="left"
                  >
                    <button
                      type="button"
                      onClick={() => setConfigOpen((v) => !v)}
                      aria-label={configOpen ? "Voltar aos campos" : "Configurar campos"}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                        configOpen
                          ? "bg-[var(--brand-primary)] text-white"
                          : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      {configOpen ? <IconX size={14} /> : <IconSettings size={14} />}
                    </button>
                  </TooltipGlass>
                )}
                </div>{/* fim flex shrink-0 (kebab + gear) */}
              </div>{/* fim justify-between */}

              <div className="mt-3.5">
                <div className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Funil de vendas
                </div>

                {/* Dropdown de fase (slot externo) ou label estático */}
                {stageDropdownSlot ? (
                  <div className="mt-1">{stageDropdownSlot}</div>
                ) : (
                  <div className="mt-1 font-display text-[15px] font-bold text-[var(--text-primary)]">
                    {deal.stage ?? "Em processo"}
                  </div>
                )}

                {/* Barra de progresso — segmentos reais ou fallback hardcoded */}
                {funnelSegments && funnelSegments.length > 0 ? (
                  <div className="mt-2.5 flex gap-1">
                    {[...funnelSegments]
                      .sort((a, b) => a.position - b.position)
                      .map((seg) => {
                        const segIdx = funnelSegments
                          .sort((a, b) => a.position - b.position)
                          .findIndex((s) => s.id === seg.id)
                        const reached = segIdx <= currentStageIndex
                        return (
                          <TooltipGlass key={seg.id} label={seg.name} side="top">
                            <span
                              className="h-[6px] flex-1 rounded-full transition-opacity"
                              style={{
                                background: seg.color || "var(--brand-primary)",
                                opacity: reached ? 1 : 0.18,
                              }}
                            />
                          </TooltipGlass>
                        )
                      })}
                  </div>
                ) : (
                  <div className="mt-2.5 flex gap-1">
                    {STAGES.map((s, i) => (
                      <span
                        key={s}
                        className="h-[6px] flex-1 rounded-full transition-opacity"
                        style={{
                          background: FUNNEL_PALETTE[i % FUNNEL_PALETTE.length],
                          opacity: i <= currentStageIndex ? 1 : 0.18,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Motivo da perda — destaque vermelho quando deal está LOST.
                  Mostrado entre a barra de progresso do funil e o bloco do
                  responsável pra ficar imediatamente visível ao abrir o card,
                  resposta direta ao "por que esse lead foi perdido?". */}
              {deal.status === "LOST" && deal.lostReason?.trim() ? (
                <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] px-2.5 py-2">
                  <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#dc2626]">
                    <IconCircleX size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#dc2626]">
                      Motivo da perda
                    </div>
                    <div className="mt-px text-[12px] leading-snug text-[#991b1b]">
                      {deal.lostReason.trim()}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Responsável — clicável para alterar */}
              <div className="mt-3.5 flex items-center gap-2 border-t border-[var(--glass-border-subtle)] pt-3">
                <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Responsável
                </span>
                {ownerSlot ?? (
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 font-display text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
                  >
                    {deal.owner?.name || "Sem responsável"}
                    <IconChevronDown size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Conteúdo rolável: lista densa de campos */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[22px] py-4">
              {configOpen && (resolvedContactConfig || resolvedDealConfig) ? (
                <div className="flex min-w-0 flex-col gap-3">
                  {resolvedContactConfig}
                  {resolvedDealConfig}
                </div>
              ) : (
                <DragDropContext onDragEnd={handleSidebarDragEnd}>
                  <Droppable droppableId="sidebar-sections">
                    {(droppableProvided) => (
                      <div
                        ref={droppableProvided.innerRef}
                        {...droppableProvided.droppableProps}
                        className="flex min-w-0 flex-col gap-5"
                      >
                        {sectionOrder.map((sectionId, index) => {
                          if (sectionId === "campos" && (!customFieldsSlot || customFieldsSlot.length === 0)) return null
                          return (
                            <Draggable key={sectionId} draggableId={sectionId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "group/section",
                                    snapshot.isDragging && "z-50 opacity-90",
                                  )}
                                >
                                  {sectionId === "principal" && (
                                    <FieldCard
                                      dragHandleProps={provided.dragHandleProps ?? undefined}
                                      dragLabel="Arraste o bloco principal"
                                    >
                                      <FieldRow
                                        label="Origem"
                                        isLast
                                        valueNode={sourceSlot ?? <PlaceholderValue text="Adicionar" />}
                                      />
                                    </FieldCard>
                                  )}

                                  {sectionId === "contato" && (
                                    <FieldCard
                                      title="Dados de Contato"
                                      dragHandleProps={provided.dragHandleProps ?? undefined}
                                    >
                                      <FieldRow
                                        label="Telefone"
                                        valueNode={
                                          deal.contactId ? (
                                            <InlineNativeEditor
                                              value={dealNative["phone"] ?? deal.phone}
                                              entityType="contact"
                                              entityId={deal.contactId}
                                              fieldKey="phone"
                                              inputType="tel"
                                              placeholder="Adicionar telefone"
                                              invalidateKeys={[["contact-sidebar", deal.contactId]]}
                                              onSaved={(v) => setDealNative((p) => ({ ...p, phone: v }))}
                                              textClassName="font-display text-[13px] font-bold text-[var(--brand-primary)]"
                                            />
                                          ) : onCreateContactForField ? (
                                            <InlineNativeEditor
                                              value={dealNative["phone"] ?? deal.phone}
                                              entityType="deal"
                                              entityId={deal.id}
                                              fieldKey="phone"
                                              inputType="tel"
                                              placeholder="Adicionar telefone"
                                              customSave={(v) => onCreateContactForField("phone", v)}
                                              onSaved={(v) => setDealNative((p) => ({ ...p, phone: v }))}
                                              textClassName="font-display text-[13px] font-bold text-[var(--brand-primary)]"
                                            />
                                          ) : (
                                            <a
                                              href={deal.phone ? `tel:${deal.phone}` : undefined}
                                              className="font-display text-[13px] font-bold text-[var(--brand-primary)]"
                                            >
                                              {deal.phone || "—"}
                                            </a>
                                          )
                                        }
                                      />
                                      <FieldRow
                                        label="Email"
                                        isLast
                                        valueNode={
                                          deal.contactId ? (
                                            <InlineNativeEditor
                                              value={dealNative["email"] ?? (deal.email ?? undefined)}
                                              entityType="contact"
                                              entityId={deal.contactId}
                                              fieldKey="email"
                                              inputType="email"
                                              placeholder="Adicionar e-mail"
                                              invalidateKeys={[["contact-sidebar", deal.contactId]]}
                                              onSaved={(v) => setDealNative((p) => ({ ...p, email: v }))}
                                              textClassName="font-display text-[13px] font-bold text-[var(--brand-primary)]"
                                            />
                                          ) : onCreateContactForField ? (
                                            <InlineNativeEditor
                                              value={dealNative["email"] ?? (deal.email ?? undefined)}
                                              entityType="deal"
                                              entityId={deal.id}
                                              fieldKey="email"
                                              inputType="email"
                                              placeholder="Adicionar e-mail"
                                              customSave={(v) => onCreateContactForField("email", v)}
                                              onSaved={(v) => setDealNative((p) => ({ ...p, email: v }))}
                                              textClassName="font-display text-[13px] font-bold text-[var(--brand-primary)]"
                                            />
                                          ) : (
                                            <span className="font-display text-[13px] font-bold text-[var(--brand-primary)]">
                                              {deal.email || "—"}
                                            </span>
                                          )
                                        }
                                      />
                                    </FieldCard>
                                  )}

                                  {sectionId === "campos" && customFieldsSlot && customFieldsSlot.length > 0 && (
                                    <FieldCard
                                      title="Campos do negócio"
                                      dragHandleProps={provided.dragHandleProps ?? undefined}
                                      titleActions={
                                        <button
                                          type="button"
                                          onClick={() => setDealCustomEditMode((v) => !v)}
                                          title={dealCustomEditMode ? "Sair do modo edição" : "Editar campos"}
                                          className={cn(
                                            "flex h-6 w-6 items-center justify-center rounded transition-colors",
                                            dealCustomEditMode
                                              ? "bg-[var(--brand-primary)] text-white"
                                              : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
                                          )}
                                        >
                                          {dealCustomEditMode ? <IconX size={12} /> : <IconPencil size={12} />}
                                        </button>
                                      }
                                    >
                                      {customFieldsSlot.map((field, i) => {
                                        const currentValue = fieldValues[field.fieldId] ?? field.value
                                        const hl = field.highlight ?? resolveHighlight(currentValue, field.highlightRules)
                                        const canEdit = !!field.entityType && !!field.entityId
                                        return (
                                          <FieldRow
                                            key={field.fieldId}
                                            label={field.label}
                                            value={(!hl && !canEdit && !dealCustomEditMode) ? (currentValue ?? undefined) : undefined}
                                            valueNode={
                                              /* Modo edição: sempre mostra editor, ignorando badge */
                                              dealCustomEditMode && canEdit ? (
                                                <InlineFieldEditor
                                                  fieldId={field.fieldId}
                                                  fieldType={(field as { type?: string }).type ?? "TEXT"}
                                                  fieldOptions={field.options ?? []}
                                                  value={currentValue ?? null}
                                                  entityType={field.entityType!}
                                                  entityId={field.entityId!}
                                                  editMode={dealCustomEditMode}
                                                  invalidateKeys={[["deal-detail-v2", deal.id]]}
                                                  onSaved={(v) =>
                                                    setFieldValues((prev) => ({ ...prev, [field.fieldId]: v }))
                                                  }
                                                  textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                                  placeholder="— Adicionar"
                                                />
                                              ) : hl ? (
                                                <HighlightBadge severity={hl.severity as "danger" | "success" | "warning" | "info"} label={hl.label} />
                                              ) : canEdit ? (
                                                <InlineFieldEditor
                                                  fieldId={field.fieldId}
                                                  fieldType={(field as { type?: string }).type ?? "TEXT"}
                                                  fieldOptions={field.options ?? []}
                                                  value={currentValue ?? null}
                                                  entityType={field.entityType!}
                                                  entityId={field.entityId!}
                                                  invalidateKeys={[["deal-detail-v2", deal.id]]}
                                                  onSaved={(v) =>
                                                    setFieldValues((prev) => ({ ...prev, [field.fieldId]: v }))
                                                  }
                                                  textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                                  placeholder="— Adicionar"
                                                />
                                              ) : undefined
                                            }
                                            isLast={i === customFieldsSlot.length - 1}
                                          />
                                        )
                                      })}
                                    </FieldCard>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {droppableProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}

              {productsSlot && <div className="mt-5">{productsSlot}</div>}
            </div>
          </aside>

          {/* Handle de resize — divisor entre sidebar e content. Coluna
              fina (8px) no grid pra ficar fácil de pegar com o mouse.
              role="separator" + aria-* descrevem o controle pra leitores
              de tela; setas left/right ajustam de 16 em 16px via teclado. */}
          <div
            role="separator"
            aria-label="Redimensionar painel de detalhes"
            aria-orientation="vertical"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_WIDTH_MIN}
            aria-valuemax={SIDEBAR_WIDTH_MAX}
            tabIndex={0}
            onMouseDown={onResizeStart}
            onDoubleClick={() => {
              // Duplo-clique restaura o tamanho default — atalho útil
              // pra desfazer um arrasto acidental.
              setSidebarWidth(SIDEBAR_WIDTH_DEFAULT)
              try {
                window.localStorage.setItem(
                  SIDEBAR_WIDTH_STORAGE_KEY,
                  String(SIDEBAR_WIDTH_DEFAULT),
                )
              } catch {
                /* fail-silent */
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
              e.preventDefault()
              const step = e.shiftKey ? 32 : 16
              setSidebarWidth((w) => {
                const next = Math.min(
                  SIDEBAR_WIDTH_MAX,
                  Math.max(
                    SIDEBAR_WIDTH_MIN,
                    w + (e.key === "ArrowRight" ? step : -step),
                  ),
                )
                try {
                  window.localStorage.setItem(
                    SIDEBAR_WIDTH_STORAGE_KEY,
                    String(next),
                  )
                } catch {
                  /* fail-silent */
                }
                return next
              })
            }}
            className="group/handle relative flex cursor-col-resize items-center justify-center self-stretch rounded-full transition-colors hover:bg-[var(--brand-primary)]/15 focus-visible:bg-[var(--brand-primary)]/25 focus-visible:outline-none"
          >
            <span
              aria-hidden
              className="h-10 w-[3px] rounded-full bg-[var(--glass-border)] transition-colors group-hover/handle:bg-[var(--brand-primary)] group-focus-visible/handle:bg-[var(--brand-primary)]"
            />
          </div>

          {/* CONTENT */}
          {tabContentOverride?.[activeTab] ? (
            <main
              aria-label={activeTab}
              className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]"
            >
              <TabsBar activeTab={activeTab} onChange={setActiveTab} />
              {tabContentOverride[activeTab]}
            </main>
          ) : messagesSlot || composerSlot || sessionAlertSlot ? (
            // Quando ha slots reais, montamos um <main> custom com o
            // mesmo visual da ChatArea nova (header + messages + alert +
            // composer) mas plugado nos slots externos.
            <main
              aria-label="Conversa"
              className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]"
            >
              <TabsBar
                activeTab={activeTab}
                onChange={setActiveTab}
                searchOpen={searchOpen}
                searchQuery={searchQuery}
                onSearchOpen={setSearchOpen}
                onSearchChange={setSearchQuery}
                conversationId={conversationId}
                isResolved={isResolved}
              />

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-7 py-6">
                {messagesSlot}
              </div>

              {sessionAlertSlot}

              {composerSlot ? composerSlot : <FallbackComposer />}
            </main>
          ) : (
            // Default: container com header de tabs + ChatArea mock.
            <main
              aria-label="Conversa"
              className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]"
            >
              <TabsBar activeTab={activeTab} onChange={setActiveTab} />
              <div className="min-h-0 flex-1">
                <ChatArea
                  contact={{ name: deal.name, badge: "enterprise", badgeLabel: "ENTERPRISE" }}
                  messages={fallbackMessages}
                  daySeparator="14/05/2026"
                  showSessionAlert
                />
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Subcomponentes locais ─── */

/**
 * Barra de abas (Conversa / Atividades / Notas / Timeline) renderizada
 * no header do container de conteúdo. Antes ficava numa linha solta
 * entre a topbar e os containers; agora vive dentro do próprio container.
 */
function TabsBar({
  activeTab,
  onChange,
  searchOpen,
  searchQuery,
  onSearchOpen,
  onSearchChange,
  conversationId,
  isResolved,
}: {
  activeTab: TabId
  onChange: (id: TabId) => void
  searchOpen?: boolean
  searchQuery?: string
  onSearchOpen?: (open: boolean) => void
  onSearchChange?: (q: string) => void
  conversationId?: string | null
  isResolved?: boolean
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleResolve = useToggleConversationResolve()

  /* Fecha kebab ao clicar fora */
  useEffect(() => {
    if (!menuOpen) return
    function onOut(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onOut)
    return () => document.removeEventListener("mousedown", onOut)
  }, [menuOpen])

  /* Foca input ao abrir busca */
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const hasConversaActions = (activeTab === "conversa" && !!onSearchOpen) || !!conversationId

  return (
    <div className="shrink-0 border-b border-[var(--glass-border-subtle)]">
      <header className="flex items-center gap-2 px-4 py-3">
        {/* Tabs pill group — oculta enquanto busca está aberta */}
        {!(searchOpen && activeTab === "conversa") && (
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-[12px] font-bold transition-all",
                    isActive
                      ? "bg-[var(--brand-primary)] text-white shadow-[var(--glass-shadow-sm)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 font-display text-[10px] font-bold",
                        isActive ? "bg-white/25 text-white" : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Busca inline — ocupa o flex-1 quando aberta */}
        {searchOpen && activeTab === "conversa" ? (
          <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-1.5">
            <IconSearch size={13} className="shrink-0 text-[var(--text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar na conversa…"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="flex-1 bg-transparent font-display text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)]"
              >
                <IconX size={10} />
              </button>
            )}
            <button
              type="button"
              aria-label="Fechar busca"
              onClick={() => { onSearchOpen?.(false); onSearchChange?.("") }}
              className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <IconX size={12} />
            </button>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Kebab de ações do header — lupa + encerrar conversa */}
        {hasConversaActions && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Ações"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                menuOpen
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
              )}
            >
              <IconDotsVertical size={15} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-[200] mt-1.5 w-52 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
                {/* Buscar na conversa */}
                {activeTab === "conversa" && onSearchOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchOpen(!searchOpen)
                      if (searchOpen) onSearchChange?.("")
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left font-display text-[12.5px] text-[var(--text-primary)] hover:bg-white/10"
                  >
                    <IconSearch size={14} className="shrink-0 text-[var(--text-muted)]" />
                    {searchOpen ? "Fechar busca" : "Buscar na conversa"}
                  </button>
                )}

                {/* Encerrar / Reabrir conversa */}
                {conversationId && (
                  <RequirePermission permission="conversation:close">
                    <button
                      type="button"
                      disabled={toggleResolve.isPending}
                      onClick={() => {
                        toggleResolve.mutate(
                          { conversationId, action: isResolved ? "reopen" : "resolve" },
                          { onSuccess: () => setMenuOpen(false) },
                        )
                      }}
                      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left font-display text-[12.5px] text-[var(--text-primary)] hover:bg-white/10 disabled:opacity-50"
                    >
                      {isResolved
                        ? <IconCircleDashed size={14} className="shrink-0 text-[var(--text-muted)]" />
                        : <IconCircleCheck size={14} className="shrink-0 text-[var(--text-muted)]" />
                      }
                      {isResolved ? "Reabrir conversa" : "Encerrar conversa"}
                    </button>
                  </RequirePermission>
                )}
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  )
}

function PanelIconBtn({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  const btn = (
    <button
      type="button"
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
  if (!title) return btn
  return <TooltipGlass label={title} side="bottom">{btn}</TooltipGlass>
}

/** Rótulo de seção (uppercase tracking) acima de cada cartão de campos. */
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      {children}
    </div>
  )
}

/** Badge colorido de destaque para campos com formatação condicional. */
function HighlightBadge({
  severity,
  label,
}: {
  severity: "danger" | "success" | "warning" | "info"
  label: string
}) {
  const colors = SEVERITY_COLORS[severity]
  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
    >
      {label}
    </span>
  )
}

/** Cartão que agrupa uma lista densa de FieldRow (estilo Kommo).
 *  Quando `dragHandleProps` é fornecido, exibe alça de arraste no header. */
function FieldCard({
  title,
  dragLabel,
  dragHandleProps,
  titleActions,
  children,
}: {
  title?: string
  /** Texto acessível para a alça quando não há título. */
  dragLabel?: string
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  /** Ações extras no cabeçalho (botões, ícones). */
  titleActions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      {/* Header com título + alça de arraste */}
      <div className="mb-2 flex items-center gap-1">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="flex cursor-grab items-center rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover/section:opacity-50 hover:opacity-100 active:cursor-grabbing"
            aria-label={dragLabel ?? `Arrastar bloco ${title ?? ""}`}
          >
            <IconGripVertical size={12} />
          </span>
        )}
        {title && (
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {title}
          </span>
        )}
        {titleActions && (
          <div className="ml-auto flex items-center gap-1">
            {titleActions}
          </div>
        )}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4">
        {children}
      </div>
    </section>
  )
}

/** Valor placeholder (italic muted) usado quando não há slot/dado real. */
function PlaceholderValue({ text }: { text: string }) {
  return (
    <span className="font-display text-[13px] italic text-[var(--text-muted)]">
      {text}
    </span>
  )
}

/**
 * Linha densa de campo: rótulo à esquerda, valor à direita. Quando
 * `valueNode` é fornecido (ex.: ownerSlot/tagsSlot/InlineEditText),
 * ele substitui o texto e fica responsável pela interação. Caso
 * contrário renderiza `value` (ou "—") com lápis de edição no hover.
 */
function FieldRow({
  label,
  value,
  valueNode,
  isLast,
  money,
}: {
  label: string
  value?: string | null
  valueNode?: React.ReactNode
  isLast?: boolean
  money?: boolean
}) {
  const empty = !value
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 py-2.5",
        !isLast && "border-b border-[var(--glass-border-subtle)]",
      )}
    >
      <span className="min-w-0 shrink truncate text-[12.5px] font-medium text-[var(--text-muted)]">
        {label}
      </span>
      {valueNode ? (
        <div className="ml-auto flex min-w-0 max-w-[70%] flex-wrap items-center justify-end gap-1.5 text-right">
          {valueNode}
        </div>
      ) : (
        <span
          className={cn(
            "group flex min-w-0 max-w-[70%] items-center justify-end gap-1.5 text-right font-display text-[13px] font-bold",
            empty ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
            money && !empty && "text-[var(--color-success-text)]",
          )}
        >
          <span className="truncate">{value || "—"}</span>
          <IconPencil
            size={13}
            className="shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
          />
        </span>
      )}
    </div>
  )
}

/** Formata o valor do negócio em BRL; retorna undefined quando vazio. */
function formatMoney(v: number | string | null | undefined): string | undefined {
  if (v === null || v === undefined || v === "") return undefined
  const n = typeof v === "string" ? Number(v) : v
  if (Number.isNaN(n)) return undefined
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** Composer fallback (disabled) usado apenas quando sessao expirou e
 * nao foi fornecido `composerSlot`. */
function FallbackComposer() {
  return (
    <div
      className="mx-[22px] mb-[22px] flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-[18px] pr-2 opacity-60 shadow-[var(--glass-shadow-sm)]"
    >
      <TooltipGlass label="Anexar" side="top">
        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)]"
        >
          <IconPaperclip size={18} />
        </button>
      </TooltipGlass>
      <input
        type="text"
        placeholder="Sessão expirada. Envie um template..."
        disabled
        className="flex-1 border-none bg-transparent text-sm italic text-[var(--text-primary)] outline-none placeholder:italic placeholder:text-[var(--text-muted)]"
      />
      <TooltipGlass label="Emoji" side="top">
        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)]"
        >
          <IconMoodSmile size={18} />
        </button>
      </TooltipGlass>
      <TooltipGlass label="Áudio" side="top">
        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)]"
        >
          <IconMicrophone size={18} />
        </button>
      </TooltipGlass>
      <TooltipGlass label="Enviar mensagem" side="top">
        <button
          type="button"
          className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
        >
          <IconSend size={16} />
        </button>
      </TooltipGlass>
    </div>
  )
}
