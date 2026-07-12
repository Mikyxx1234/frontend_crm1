"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import { PageSegmentedControl } from "@/components/crm/page-toolbar"
import {
  IconArrowLeft,
  IconCircleX,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutList,
  IconSearch,
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
  IconSparkles,
  IconX,
  IconCircleCheck,
  IconCircleDashed,
  IconAffiliate,
  IconPackage,
  IconUser,
} from "@tabler/icons-react"
import { useAsideViewMode, type AsideViewMode } from "@/hooks/use-aside-view-mode"
import {
  channelTypeLabel,
  formatConnectionLabel,
  formatConnectionShort,
  type ConnectionRef,
} from "@/lib/connection-label"
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks"
import { RequirePermission } from "@/components/auth/require-permission"
import { useSectionOrder } from "@/hooks/use-section-order"
import { useFieldLayout } from "@/hooks/use-field-layout"
import { useContactSources } from "@/hooks/use-contact-sources"

// ─── Ordem das seções da sidebar ──────────────────────────────────
// Mudancas (DD4 + DD5 do questionario):
//   - "principal" removido (so tinha Origem, que foi pro cabecalho fixo
//     como Contact.source). Mantido no union pra absorver localStorage
//     antigo — o render trata "principal" como `null`.
//   - "produtos" adicionado: antes ficava abaixo da lista, fora do DnD;
//     agora vira bloco arrastavel como os demais (paridade com inbox
//     ContactAside).
// A chave foi bumpada pra v3 pra invalidar a ordem antiga.
type SidebarSection = "principal" | "contato" | "campos" | "produtos"
// Ordem alinhada ao mockup (hero → Origem/Tags → Produtos → Campos de
// Negócio → Detalhes de Contato). Bump v4 pra invalidar a ordem antiga
// persistida em localStorage.
const SIDEBAR_DEFAULT_ORDER: SidebarSection[] = ["produtos", "campos", "contato"]
const SIDEBAR_STORAGE_KEY = "crm:deal-detail:sidebar-order:v4"

// ── Abas Perfil / Produto ─────────────────────────────────────────
// Origem + Tags continuam FIXOS acima das pills. As seções vão para
// duas abas: "Perfil" (contato + campos de negócio) e "Produto"
// (produtos). `principal` não pertence a nenhuma aba (render null).
type SidebarTab = "perfil" | "produto"
const SIDEBAR_SECTION_TAB: Partial<Record<SidebarSection, SidebarTab>> = {
  contato: "perfil",
  campos: "perfil",
  produtos: "produto",
}
const SIDEBAR_TAB_ITEMS = [
  {
    value: "perfil",
    label: (
      <span className="inline-flex items-center gap-1.5">
        <IconUser size={13} />
        Perfil
      </span>
    ),
  },
  {
    value: "produto",
    label: (
      <span className="inline-flex items-center gap-1.5">
        <IconPackage size={13} />
        Produto
      </span>
    ),
  },
] as const
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
  /** Nome do funil (pipeline) ao qual o deal pertence. Exibido no header. */
  pipelineName?: string | null
  owner?: DealOwner
  /** Status do deal — quando "LOST", o painel exibe o motivo da perda. */
  status?: "OPEN" | "WON" | "LOST" | null
  /** Origem do contato (nativo). Antes vivia em `Deal.source` (campo
   *  fantasma — backend nao persistia), agora puxado de Contact.source via
   *  InlineNativeEditor. Editavel inline no cabecalho fixo da sidebar. */
  contactSource?: string | null
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
  /** DD9: popover/slot de tags do CONTATO (Contact.tags), separado do
   *  `tagsSlot` (que sao tags do Deal). Renderizado no FieldCard
   *  "Dados de Contato" ao lado do label "Tags". */
  contactTagsSlot?: React.ReactNode
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

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }>; count?: number }[] = [
  { id: "conversa", label: "Conversa", icon: IconMessageCircle, count: 1 },
  { id: "atividades", label: "Tarefas", icon: IconChecklist, count: 3 },
  { id: "notas", label: "Notas", icon: IconNote },
  { id: "timeline", label: "Timeline", icon: IconClock },
  { id: "chamadas", label: "Chamadas", icon: IconPhone },
]

// ─────────────────────────────────────────────────────────────────
// ViewModeToggle — alterna entre visão foco (premium) e compacta
// ─────────────────────────────────────────────────────────────────
function ViewModeToggle({ mode, onChange }: { mode: AsideViewMode; onChange: (m: AsideViewMode) => void }) {
  return (
    <div className="flex shrink-0 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5">
      <TooltipGlass label="Visão foco" side="top">
        <button type="button" onClick={() => onChange("focus")} aria-label="Visão foco"
          className={cn("flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
            mode === "focus" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}>
          <IconSparkles size={12} />
        </button>
      </TooltipGlass>
      <TooltipGlass label="Visão compacta" side="top">
        <button type="button" onClick={() => onChange("compact")} aria-label="Visão compacta"
          className={cn("flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
            mode === "compact" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}>
          <IconLayoutList size={12} />
        </button>
      </TooltipGlass>
    </div>
  )
}

export function DealDetailPanel({
  isOpen,
  onClose,
  deal,
  callButtonSlot,
  contactTagsSlot,
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
  const { data: contactSources = [] } = useContactSources(isOpen)
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

  // Aba ativa da sidebar (Perfil por padrão — conteúdo primário do operador).
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("perfil")

  // Toggle foco ↔ compacto (compartilhado com contact-aside via localStorage).
  const [viewMode, setViewMode] = useAsideViewMode()

  // DD8 do questionario: respeitar visibilidade de blocos configurada via
  // FieldConfigPanel admin (PUT /api/field-layout, context=deal_panel_v2).
  // Antes o painel era estatico e ignorava qualquer toggle de "olho" feito
  // na config — o operador clicava "esconder Produtos" e nada acontecia.
  // Mapeamento sectionId interno -> id da taxonomia field-layout.
  const { sections: fieldLayoutSections } = useFieldLayout("deal_panel_v2")
  const sectionHiddenMap = useMemo(() => {
    const FIELD_LAYOUT_TO_INTERNAL: Record<string, SidebarSection> = {
      dados_contato: "contato",
      campos_negocio: "campos",
      produtos: "produtos",
    }
    const hidden: Partial<Record<SidebarSection, boolean>> = {}
    for (const section of fieldLayoutSections ?? []) {
      const internal = FIELD_LAYOUT_TO_INTERNAL[section.id]
      if (internal && section.hidden) hidden[internal] = true
    }
    return hidden
  }, [fieldLayoutSections])

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

  // Seções visíveis na aba ativa (Origem/Tags são fixos, fora daqui).
  const tabbedSections = useMemo(
    () =>
      sectionOrder.filter((s) => {
        if (SIDEBAR_SECTION_TAB[s] !== activeSidebarTab) return false
        if (sectionHiddenMap[s]) return false
        if (s === "campos" && (!customFieldsSlot || customFieldsSlot.length === 0))
          return false
        if (s === "produtos" && !productsSlot) return false
        return true
      }),
    [sectionOrder, activeSidebarTab, sectionHiddenMap, customFieldsSlot, productsSlot],
  )

  function handleSidebarDragEnd(result: DropResult) {
    if (!result.destination) return
    // Índices relativos à aba atual → traduz p/ posição absoluta.
    const from = tabbedSections[result.source.index]
    const to = tabbedSections[result.destination.index]
    if (!from || !to) return
    reorderSections(sectionOrder.indexOf(from), sectionOrder.indexOf(to))
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
          <header className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-5.5 py-3.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
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

  // Funil (hero): deriva o índice da etapa atual casando o NOME da etapa
  // (deal.stage) com os segmentos reais. Alimenta o anel de progresso e a
  // barra segmentada — mesma fonte usada pelo contact-aside do inbox.
  const sortedFunnel =
    funnelSegments && funnelSegments.length > 0
      ? [...funnelSegments].sort((a, b) => a.position - b.position)
      : null
  const currentSegIdx = sortedFunnel
    ? sortedFunnel.findIndex((s) => s.name === deal.stage)
    : -1
  const funnelTotal = sortedFunnel?.length ?? 0
  const funnelCurrent = currentSegIdx >= 0 ? currentSegIdx + 1 : 0

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
        {/* Barra de topo REMOVIDA (jul/26): duplicava nome/#id/telefone que já
            aparecem no hero roxo e em "Detalhes de contato", além de um badge
            "ENTERPRISE" hardcoded (dado falso). Os controles essenciais (voltar,
            editar contato, chip de conexão) foram realocados para o hero. */}

        {/* 2 COLS: SIDEBAR + CONTENT — largura da sidebar é dinâmica
            (drag horizontal na handle entre as colunas). Min/max bounds
            evitam quebrar layouts em telas pequenas / coluna direita ficar
            espremida. */}
        <div
          className="grid min-h-0 flex-1 gap-1 overflow-hidden"
          style={{ gridTemplateColumns: `${sidebarWidth}px 8px 1fr` }}
        >
          {/* SIDEBAR — painel funcional estilo Kommo (DS glass) */}
          <aside
            aria-label="Detalhes do negócio"
            className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow)] backdrop-blur-md"
          >
            {/* Cabeçalho fixo: hero do negócio — paridade visual com o
                contact-aside do inbox (fundo brand + anel de progresso).
                Pill "Negócio" removida (redundante, pedido do operador). */}
            <div className="shrink-0 px-3 pt-2">
              {/* ── Hero header: paridade total com o hero do inbox (DealInline).
                  Fundo sólido da NavRail, edge-to-edge no topo do container via
                  margens negativas + cantos superiores acompanhando o raio. ── */}
              <header className="relative isolate -mx-3 -mt-2 mb-2 rounded-t-[var(--radius-xl)] bg-[var(--nav-bg)] px-3.5 pb-2.5 pt-3 text-white">
                {/* Bolhas decorativas */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[var(--radius-xl)]">
                  <div className="absolute -right-8 -top-10 size-28 rounded-full bg-white/10" />
                  <div className="absolute -bottom-10 -left-6 size-24 rounded-full bg-white/10" />
                </div>

                {/* Linha de controles: Voltar (esq) + spacer + kebab + engrenagem */}
                <div className="relative flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Voltar"
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm transition-all hover:bg-white/25 hover:border-white/40"
                  >
                    <IconArrowLeft size={13} strokeWidth={2.5} />
                    <span className="font-display text-[11px] font-semibold leading-none">Voltar</span>
                  </button>
                  <div className="flex-1" />
                  {moreActionsSlot && (
                    <div className="[&_button]:!text-white [&_button:hover]:!bg-white/15 [&_button]:!rounded-[var(--radius-sm)]">
                      {moreActionsSlot}
                    </div>
                  )}
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
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                          configOpen
                            ? "bg-white text-[var(--brand-primary)]"
                            : "text-white/80 hover:bg-white/15 hover:text-white",
                        )}
                      >
                        {configOpen ? <IconX size={13} /> : <IconSettings size={13} />}
                      </button>
                    </TooltipGlass>
                  )}
                </div>

                {/* Linha topo: título + #num + editar (esq) + pill de etapa (dir) */}
                <div className="relative mt-2 flex items-center justify-between gap-2">
                  <h2 className="flex min-w-0 items-baseline gap-1.5 font-display text-[14px] font-bold leading-snug text-white">
                    <span className="min-w-0 truncate">{deal.name}</span>
                    <span className="shrink-0 font-mono text-[10px] font-semibold text-white/65">
                      #{deal.number ?? deal.id.slice(-6).toUpperCase()}
                    </span>
                    {contactEditSlot && (
                      <span className="shrink-0 self-center [&_button]:!text-white/70 [&_button:hover]:!text-white">
                        {contactEditSlot}
                      </span>
                    )}
                  </h2>

                  {stageDropdownSlot ? (
                    <div className="relative z-30 shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)] shadow-sm [&_button]:!text-[var(--brand-primary)] [&_button]:hover:!opacity-100">
                      {stageDropdownSlot}
                    </div>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
                      {deal.stage ?? "Em processo"}
                    </span>
                  )}
                </div>

                {/* Linha base: anel de progresso + pipeline info + responsável */}
                <div className="relative mt-2 flex items-center gap-2.5">
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-full"
                    style={{
                      background:
                        sortedFunnel && sortedFunnel.length > 0
                          ? (() => {
                              const stepPct = 100 / sortedFunnel.length
                              const stops = sortedFunnel
                                .map((seg, i) => {
                                  const color = seg.color || "var(--brand-primary)"
                                  const active = i <= currentSegIdx
                                  const c = active
                                    ? color
                                    : `color-mix(in srgb, ${color} 22%, rgba(255,255,255,0.35))`
                                  return `${c} ${i * stepPct}% ${(i + 1) * stepPct}%`
                                })
                                .join(", ")
                              return `conic-gradient(${stops})`
                            })()
                          : "conic-gradient(rgba(255,255,255,0.25) 0% 100%)",
                    }}
                  >
                    <div className="grid size-[26px] place-items-center rounded-full bg-[var(--brand-primary)]">
                      <span className="font-display text-[9px] font-bold text-white">
                        {funnelTotal > 0 ? `${funnelCurrent}/${funnelTotal}` : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-[10.5px] text-white/80">
                    <p className="truncate font-semibold text-white">{deal.pipelineName ?? "Funil de vendas"}</p>
                    <p className="truncate">
                      {funnelTotal > 0
                        ? `Etapa ${funnelCurrent} de ${funnelTotal}`
                        : (deal.stage ?? "Em processo")}
                    </p>
                  </div>
                  {ownerSlot && (
                    <div className="shrink-0 [&_button]:!rounded-full [&_button]:!border-transparent [&_button]:!bg-white [&_button]:!text-[var(--brand-primary)] [&_button]:shadow-sm [&_span]:!rounded-full [&_span]:!border-transparent [&_span]:!bg-white [&_span]:!text-[var(--brand-primary)] [&_span]:shadow-sm">
                      {ownerSlot}
                    </div>
                  )}
                </div>

                {/* Barra de funil segmentada — dentro do hero (igual inbox) */}
                {sortedFunnel && sortedFunnel.length > 0 && (
                  <div className="relative mt-2 flex gap-1 px-0.5">
                    {sortedFunnel.map((seg, i) => (
                      <TooltipGlass key={seg.id} label={seg.name} side="top">
                        <span
                          className="h-[3px] flex-1 rounded-full transition-colors"
                          style={{
                            background: i <= currentSegIdx
                              ? (seg.color || "var(--brand-primary)")
                              : "rgba(255,255,255,0.28)",
                          }}
                        />
                      </TooltipGlass>
                    ))}
                  </div>
                )}

                {/* Origem + Canal + Tags — seção inferior do hero (igual inbox) */}
                <div className="relative mt-2 flex flex-col gap-0 divide-y divide-white/15 rounded-[var(--radius-md)] bg-white/10 px-2.5 py-1">
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="shrink-0 text-[11px] text-white/60">Origem</span>
                    <div className="ml-auto min-w-0 text-right [&_input]:!bg-white [&_input]:!text-[var(--text-primary)] [&_input]:!rounded [&_input]:!px-1">
                      {deal.contactId ? (
                        <InlineNativeEditor
                          value={deal.contactSource ?? undefined}
                          entityType="contact"
                          entityId={deal.contactId}
                          fieldKey="source"
                          placeholder="Adicionar origem"
                          suggestions={contactSources}
                          invalidateKeys={[
                            ["contact-sidebar", deal.contactId],
                            ["deal-detail-v2", deal.id],
                          ]}
                          textClassName="font-display text-[11.5px] font-semibold text-white"
                        />
                      ) : (
                        <span className="text-[11.5px] italic text-white/60">
                          Vincule um contato
                        </span>
                      )}
                    </div>
                  </div>
                  {connection && (
                    <div className="flex items-center justify-between gap-2 py-1">
                      <span className="shrink-0 text-[11px] text-white/60">Canal</span>
                      <TooltipGlass
                        label={`Conversando por ${formatConnectionLabel(connection)}`}
                        side="left"
                      >
                        <span className="inline-flex items-center gap-1 truncate text-right text-[11.5px] font-semibold text-white">
                          <IconAffiliate size={11} className="shrink-0" />
                          {formatConnectionShort(connection)}
                        </span>
                      </TooltipGlass>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 py-1.5 [&_.tag-chip]:!bg-white/15 [&_.tag-chip]:!text-white [&_.tag-chip]:!border-white/20">
                    <span className="shrink-0 text-[11px] text-white/60">Tags</span>
                    {tagsSlot ?? (
                      <span className="text-[11.5px] text-white/60">Nenhuma tag</span>
                    )}
                  </div>
                </div>
              </header>

              {/* Motivo da perda — destaque vermelho quando deal está LOST. */}
              {deal.status === "LOST" && deal.lostReason?.trim() ? (
                <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] px-2.5 py-2">
                  <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-danger-dark)]">
                    <IconCircleX size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--color-danger-dark)]">
                      Motivo da perda
                    </div>
                    <div className="mt-px text-[12px] leading-snug text-[var(--color-danger-text)]">
                      {deal.lostReason.trim()}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Conteúdo rolável: lista densa de campos */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5.5 py-4">
              {configOpen && (resolvedContactConfig || resolvedDealConfig) ? (
                <div className="flex min-w-0 flex-col gap-3">
                  {resolvedContactConfig}
                  {resolvedDealConfig}
                </div>
              ) : (
                <div className="flex min-w-0 flex-col gap-5">
                  {/* Origem + Tags migraram para dentro do hero (paridade com o
                      aside do inbox). */}

                  {/* ── Pills: Perfil / Produto + toggle de visão ── */}
                  <div className="flex items-center gap-2">
                    <PageSegmentedControl
                      items={SIDEBAR_TAB_ITEMS}
                      value={activeSidebarTab}
                      onChange={(v) => setActiveSidebarTab(v as SidebarTab)}
                      aria-label="Alternar entre Perfil e Produto"
                      size="compact"
                      className="flex-1 [&>button]:flex [&>button]:flex-1 [&>button]:items-center [&>button]:justify-center"
                    />
                    <ViewModeToggle mode={viewMode} onChange={setViewMode} />
                  </div>

                <DragDropContext onDragEnd={handleSidebarDragEnd}>
                  <Droppable droppableId="sidebar-sections">
                    {(droppableProvided) => (
                      <div
                        ref={droppableProvided.innerRef}
                        {...droppableProvided.droppableProps}
                        className="flex min-w-0 flex-col gap-5"
                      >
                        {tabbedSections.map((sectionId, index) => {
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
                                  {/* sectionId === "principal" intencionalmente
                                      NAO renderiza nada: a unica row que existia
                                      aqui (Origem) migrou pro cabecalho fixo
                                      como Contact.source (DD5). Mantemos o
                                      branch vazio porque clientes com a ordem
                                      antiga em localStorage ainda passam por
                                      este id antes da chave v2 substituir. */}
                                  {sectionId === "principal" && null}

                                  {sectionId === "contato" && (
                                    <FieldCard
                                      title="Informações do Contato"
                                      dragHandleProps={provided.dragHandleProps ?? undefined}
                                    >
                                        {viewMode === "compact" ? (
                                        /* ── Compact: flat rows (mesmo padrão dos campos de negócio) ── */
                                        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] overflow-hidden mt-1">
                                          {/* Telefone */}
                                          <div className="flex items-baseline gap-2 px-3 py-1.5 border-b border-[var(--glass-border-subtle)]">
                                            <span className="w-[38%] shrink-0 text-[11px] font-medium text-[var(--text-muted)] leading-tight">Telefone</span>
                                            <div className="min-w-0 flex-1">
                                              {deal.contactId ? (
                                                <InlineNativeEditor value={dealNative["phone"] ?? deal.phone} entityType="contact" entityId={deal.contactId} fieldKey="phone" inputType="tel" placeholder="+ Adicionar" invalidateKeys={[["contact-sidebar", deal.contactId]]} onSaved={(v) => setDealNative((p) => ({ ...p, phone: v }))} textClassName="font-display text-[12px] font-semibold text-[var(--brand-primary)]" />
                                              ) : (
                                                <a href={deal.phone ? `tel:${deal.phone}` : undefined} className="font-display text-[12px] font-semibold text-[var(--brand-primary)]">{deal.phone || <span className="italic text-[var(--text-muted)]">+ Adicionar</span>}</a>
                                              )}
                                            </div>
                                          </div>
                                          {/* Email */}
                                          <div className="flex items-baseline gap-2 px-3 py-1.5 border-b border-[var(--glass-border-subtle)]">
                                            <span className="w-[38%] shrink-0 text-[11px] font-medium text-[var(--text-muted)] leading-tight">Email</span>
                                            <div className="min-w-0 flex-1">
                                              {deal.contactId ? (
                                                <InlineNativeEditor value={dealNative["email"] ?? (deal.email ?? undefined)} entityType="contact" entityId={deal.contactId} fieldKey="email" inputType="email" placeholder="+ Adicionar" invalidateKeys={[["contact-sidebar", deal.contactId]]} onSaved={(v) => setDealNative((p) => ({ ...p, email: v }))} textClassName="font-display text-[12px] font-semibold text-[var(--brand-primary)] break-all" />
                                              ) : (
                                                <span className="font-display text-[12px] font-semibold text-[var(--brand-primary)] break-all">{deal.email || <span className="italic text-[var(--text-muted)]">+ Adicionar</span>}</span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Canal */}
                                          <div className="flex items-baseline gap-2 px-3 py-1.5">
                                            <span className="w-[38%] shrink-0 text-[11px] font-medium text-[var(--text-muted)] leading-tight">Canal</span>
                                            <div className="min-w-0 flex-1">
                                              {connection ? (
                                                <span className="inline-flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-primary)]">
                                                  <IconAffiliate size={11} className="shrink-0 text-[var(--brand-primary)]" />
                                                  {channelTypeLabel(connection.type)} · {formatConnectionShort(connection)}
                                                </span>
                                              ) : (
                                                <span className="font-display text-[12px] italic text-[var(--text-muted)]">—</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        /* ── Focus: grid 2 colunas de cards ── */
                                        <div className="py-2 grid grid-cols-2 gap-1.5">
                                          {/* Telefone */}
                                          <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)] p-2">
                                            <span className="text-[10px] font-medium text-[var(--text-muted)]">Telefone</span>
                                            {deal.contactId ? (
                                              <InlineNativeEditor value={dealNative["phone"] ?? deal.phone} entityType="contact" entityId={deal.contactId} fieldKey="phone" inputType="tel" placeholder="+ Adicionar" invalidateKeys={[["contact-sidebar", deal.contactId]]} onSaved={(v) => setDealNative((p) => ({ ...p, phone: v }))} textClassName="font-display text-[12.5px] font-bold text-[var(--brand-primary)] break-all" />
                                            ) : onCreateContactForField ? (
                                              <InlineNativeEditor value={dealNative["phone"] ?? deal.phone} entityType="deal" entityId={deal.id} fieldKey="phone" inputType="tel" placeholder="+ Adicionar" customSave={(v) => onCreateContactForField("phone", v)} onSaved={(v) => setDealNative((p) => ({ ...p, phone: v }))} textClassName="font-display text-[12.5px] font-bold text-[var(--brand-primary)] break-all" />
                                            ) : (
                                              <a href={deal.phone ? `tel:${deal.phone}` : undefined} className="font-display text-[12.5px] font-bold text-[var(--brand-primary)] break-all">{deal.phone || <span className="italic text-[var(--text-muted)]">+ Adicionar</span>}</a>
                                            )}
                                          </div>
                                          {/* Email */}
                                          <div className={cn("flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)] p-2", (dealNative["email"] ?? deal.email ?? "").length > 20 ? "col-span-2" : "")}>
                                            <span className="text-[10px] font-medium text-[var(--text-muted)]">Email</span>
                                            {deal.contactId ? (
                                              <InlineNativeEditor value={dealNative["email"] ?? (deal.email ?? undefined)} entityType="contact" entityId={deal.contactId} fieldKey="email" inputType="email" placeholder="+ Adicionar" invalidateKeys={[["contact-sidebar", deal.contactId]]} onSaved={(v) => setDealNative((p) => ({ ...p, email: v }))} textClassName="font-display text-[12.5px] font-bold text-[var(--brand-primary)] break-all" />
                                            ) : onCreateContactForField ? (
                                              <InlineNativeEditor value={dealNative["email"] ?? (deal.email ?? undefined)} entityType="deal" entityId={deal.id} fieldKey="email" inputType="email" placeholder="+ Adicionar" customSave={(v) => onCreateContactForField("email", v)} onSaved={(v) => setDealNative((p) => ({ ...p, email: v }))} textClassName="font-display text-[12.5px] font-bold text-[var(--brand-primary)] break-all" />
                                            ) : (
                                              <span className="font-display text-[12.5px] font-bold text-[var(--brand-primary)] break-all">{deal.email || <span className="italic text-[var(--text-muted)]">+ Adicionar</span>}</span>
                                            )}
                                          </div>
                                          {/* Canal */}
                                          <div className="col-span-2 flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)] p-2">
                                            <span className="text-[10px] font-medium text-[var(--text-muted)]">Canal</span>
                                            {connection ? (
                                              <TooltipGlass label={`Conversando por ${formatConnectionLabel(connection)}`} side="left">
                                                <span className="inline-flex items-center gap-1 font-display text-[12.5px] font-bold text-[var(--text-primary)]">
                                                  <IconAffiliate size={12} className="shrink-0 text-[var(--brand-primary)]" />
                                                  <span className="break-all">{channelTypeLabel(connection.type)} · {formatConnectionShort(connection)}</span>
                                                </span>
                                              </TooltipGlass>
                                            ) : (
                                              <span className="font-display text-[12.5px] italic text-[var(--text-muted)]">—</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </FieldCard>
                                  )}

                                  {/* DD4: Produtos — sem FieldCard extra (o
                                      próprio DealProductsSection já provê o
                                      card branco com header "Produtos"). Aqui
                                      só expomos a alça de arrasto acima. */}
                                  {sectionId === "produtos" && productsSlot && (
                                    <section className="group/section">
                                      {provided.dragHandleProps && (
                                        <div className="mb-1.5 flex items-center gap-1">
                                          <span
                                            {...provided.dragHandleProps}
                                            className="flex cursor-grab items-center rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover/section:opacity-50 hover:opacity-100 active:cursor-grabbing"
                                            aria-label="Arrastar bloco Produtos"
                                          >
                                            <IconGripVertical size={12} />
                                          </span>
                                        </div>
                                      )}
                                      {productsSlot}
                                    </section>
                                  )}

                                  {sectionId === "campos" && customFieldsSlot && customFieldsSlot.length > 0 && (
                                    <FieldCard
                                      title="Informações do Negócio"
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
                                      {viewMode === "compact" ? (
                                        /* ── Compact: flat rows ── */
                                        <div className="divide-y divide-[var(--glass-border-subtle)] py-1">
                                          {customFieldsSlot.map((field) => {
                                            const currentValue = fieldValues[field.fieldId] ?? field.value
                                            const hl = field.highlight ?? resolveHighlight(currentValue, field.highlightRules)
                                            const canEdit = !!field.entityType && !!field.entityId
                                            return (
                                              <div key={field.fieldId} className="flex items-baseline gap-2 px-1 py-1.5">
                                                <span className="w-[38%] shrink-0 text-[11px] text-[var(--text-muted)] leading-tight">{field.label}</span>
                                                <div className="min-w-0 flex-1">
                                                  {dealCustomEditMode && canEdit ? (
                                                    <InlineFieldEditor fieldId={field.fieldId} fieldType={(field as { type?: string }).type ?? "TEXT"} fieldOptions={field.options ?? []} value={currentValue ?? null} entityType={field.entityType!} entityId={field.entityId!} editMode={dealCustomEditMode} invalidateKeys={[["deal-detail-v2", deal.id]]} onSaved={(v) => setFieldValues((prev) => ({ ...prev, [field.fieldId]: v }))} textClassName="font-display text-[12px] font-semibold text-[var(--text-primary)]" placeholder="+ Adicionar" />
                                                  ) : hl ? (
                                                    <HighlightBadge severity={hl.severity as "danger" | "success" | "warning" | "info"} label={hl.label} />
                                                  ) : canEdit ? (
                                                    <InlineFieldEditor fieldId={field.fieldId} fieldType={(field as { type?: string }).type ?? "TEXT"} fieldOptions={field.options ?? []} value={currentValue ?? null} entityType={field.entityType!} entityId={field.entityId!} invalidateKeys={[["deal-detail-v2", deal.id]]} onSaved={(v) => setFieldValues((prev) => ({ ...prev, [field.fieldId]: v }))} textClassName="font-display text-[12px] font-semibold text-[var(--text-primary)]" placeholder="+ Adicionar" />
                                                  ) : (
                                                    <span className="font-display text-[12px] font-semibold text-[var(--text-primary)]">{currentValue || <span className="italic text-[var(--text-muted)]">—</span>}</span>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        /* ── Focus (padrão): grid de cards ── */
                                        <div className="grid grid-cols-2 gap-1.5 py-2">
                                          {customFieldsSlot.map((field) => {
                                            const currentValue = fieldValues[field.fieldId] ?? field.value
                                            const hl = field.highlight ?? resolveHighlight(currentValue, field.highlightRules)
                                            const canEdit = !!field.entityType && !!field.entityId
                                            const isLong = (currentValue ?? "").toString().length > 18 || (currentValue ?? "").toString().includes("@")
                                            return (
                                              <div
                                                key={field.fieldId}
                                                className={cn(
                                                  "flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)] p-2",
                                                  isLong && "col-span-2",
                                                )}
                                              >
                                                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                                                  {field.label}
                                                </span>
                                                <div className="min-w-0 w-full">
                                                  {dealCustomEditMode && canEdit ? (
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
                                                      textClassName="font-display text-[12.5px] font-bold text-[var(--text-primary)] break-all"
                                                      placeholder="+ Adicionar"
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
                                                      textClassName="font-display text-[12.5px] font-bold text-[var(--text-primary)] break-all"
                                                      placeholder="+ Adicionar"
                                                    />
                                                  ) : (
                                                    <span className="font-display text-[12.5px] font-bold text-[var(--text-primary)] break-all">
                                                      {currentValue || <span className="italic text-[var(--text-muted)]">—</span>}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
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

                {/* Estado vazio da aba (ex.: Produto sem itens) */}
                {tabbedSections.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <p className="font-display text-[12px] text-[var(--text-muted)]">
                      {activeSidebarTab === "produto"
                        ? "Nenhum produto adicionado a este negócio."
                        : "Nenhum dado de perfil disponível."}
                    </p>
                  </div>
                )}
                </div>
              )}

              {/* productsSlot agora vive dentro do DragDropContext acima
                  (sectionId === "produtos"). DD4: paridade com o
                  ContactAside do inbox, que ja tinha produtos arrastaveis. */}
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
                callButtonSlot={callButtonSlot}
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
  callButtonSlot,
}: {
  activeTab: TabId
  onChange: (id: TabId) => void
  searchOpen?: boolean
  searchQuery?: string
  onSearchOpen?: (open: boolean) => void
  onSearchChange?: (q: string) => void
  conversationId?: string | null
  isResolved?: boolean
  /** Botao "Ligar" (softphone) — renderizado no canto direito, ao lado do
   *  kebab de acoes da conversa. Antes vivia no header do card do deal. */
  callButtonSlot?: React.ReactNode
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
                        isActive ? "bg-[var(--glass-bg)] text-white" : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
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

        {/* Botao "Ligar" (softphone) — vive aqui pra ficar ao lado do
            kebab, canto direito do container da conversa. Antes ficava
            no header do card do deal, mas ergonomicamente pertence
            proximo da conversa (mesma logica do inbox). */}
        {callButtonSlot}

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
              <div className="absolute right-0 top-full z-(--z-above) mt-1.5 w-52 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
                {/* Buscar na conversa */}
                {activeTab === "conversa" && onSearchOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchOpen(!searchOpen)
                      if (searchOpen) onSearchChange?.("")
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left font-display text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-subtle)]"
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
                      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left font-display text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-subtle)] disabled:opacity-50"
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
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          {valueNode}
        </div>
      ) : (
        <span
          className={cn(
            "group flex min-w-0 items-center gap-1.5 font-display text-[13px] font-semibold",
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
      className="mx-5.5 mb-5.5 flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-4.5 pr-2 opacity-60 shadow-[var(--glass-shadow-sm)]"
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
