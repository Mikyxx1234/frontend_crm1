"use client"

import { useMemo, useState } from "react"
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
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconGripVertical,
  IconLayoutList,
  IconPackage,
  IconPencil,
  IconSparkles,
  IconTag,
  IconSettings,
  IconUser,
  IconX,
  IconAffiliate,
} from "@tabler/icons-react"
import { useAsideViewMode, type AsideViewMode } from "@/hooks/use-aside-view-mode"
import {
  channelTypeLabel,
  formatConnectionShort,
  formatConnectionLabel,
} from "@/lib/connection-label"
import { resolveHighlight, SEVERITY_COLORS, type HighlightSeverity } from "@/lib/highlight"
import { InlineFieldEditor } from "@/components/crm/fields/inline-field-editor"
import { InlineNativeEditor } from "@/components/crm/fields/inline-native-editor"
import { useContactSources } from "@/hooks/use-contact-sources"
import { formatPhoneDisplay } from "@/lib/phone"
import { DealProductsSection } from "@/components/pipeline/deal-detail/sidebar"
import { useSectionOrder } from "@/hooks/use-section-order"
import { useFieldLayout } from "@/hooks/use-field-layout"

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface ContactDetails {
  name: string
  contactId: string
  /** Número sequencial do contato por organização (1, 2, 3…). */
  contactNumber?: number | null
  /**
   * Conexão (Channel) por onde o contato está conversando — qual conta do
   * canal (ex.: qual WhatsApp da empresa). Exibida na seção de contato para
   * distinguir quando a pessoa fala por fontes diferentes.
   */
  connection?: {
    id: string
    name: string
    type?: string | null
    phoneNumber?: string | null
  } | null
  assignee?: string
  statusBadge?: { variant: "lead" | "enterprise" | "success"; label: string }
  stageSegments?: number
  stageActiveIndex?: number
  course?: string
  formation?: string
  entry?: string
  phone?: string
  email?: string
  /** @ do WhatsApp (Contact.whatsappUsername), quando disponível. */
  whatsappUsername?: string
  cpf?: string
  rg?: string
  cep?: string
  addressNumber?: string
  birthDate?: string
  note?: string
  deals?: {
    id: string
    /** N\u00famero sequencial do neg\u00f3cio por organiza\u00e7\u00e3o (1, 2, 3...). */
    number?: number | null
    title: string
    value: number | null
    stageName?: string | null
    stageId?: string | null
    pipelineId?: string | null
    pipelineName?: string | null
    productName?: string | null
    status?: string | null
    lostReason?: string | null
    origin?: string | null
    funnelSegments?: { id: string; name: string; color: string; position: number }[]
    stageDropdownSlot?: React.ReactNode
    /** Slot para renderizar o seletor de responsável abaixo das info do deal. */
    assigneeSlot?: React.ReactNode
    /** Slot para renderizar as tags do negócio (add/remove). */
    dealTagsNode?: React.ReactNode
    customFields?: { fieldId: string; label: string; value: string | null }[]
  }[]
  financialStatus?: "success" | "lead" | "enterprise"
  financialLabel?: string
  product?: string
  origin?: string
  createdAt?: string
  tag?: string
  initials?: string
  avatarColor?: string
  status?: string
  activities?: { text: string; time: string; color?: string }[]
  panelFields?: {
    fieldId: string
    label: string
    value: string
    type: string
    options?: string[]
    entityType?: "contact" | "deal"
    entityId?: string
    highlightRules?: unknown[] | null
    /** Highlight já resolvido pelo backend — use este para não re-resolver. */
    highlight?: { severity: string; label: string } | null
  }[]
}

interface ContactAsideProps {
  contact: ContactDetails
  className?: string
  headerActionsNode?: React.ReactNode
  /** Tags da CONVERSA atual (Conversation.tags). Renderiza com label
   *  "Tags da conversa" para diferenciar de Contact.tags. */
  tagsNode?: React.ReactNode
  /** DD9/IB7: Tags do CONTATO (Contact.tags). Renderiza num bloco
   *  separado abaixo de tagsNode, com label "Tags do contato". Quando
   *  ausente, o bloco nao aparece (compat com clientes legados). */
  contactTagsNode?: React.ReactNode
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Slot legado — mantido por compatibilidade. Preferir os dois abaixo. */
  contactEditNode?: React.ReactNode
  /**
   * Painel de configuração de campos de **contato** (FieldConfigPanel entity="contact").
   * Quando fornecido, exibe ⚙ engrenagem na seção "Campos de Contato".
   */
  contactFieldConfigSlot?: React.ReactNode
  /**
   * Painel de configuração de campos de **negócio** (FieldConfigPanel entity="deal").
   * Quando fornecido, exibe ⚙ engrenagem na seção "Campos de Negócio".
   */
  dealFieldConfigSlot?: React.ReactNode
  /** @deprecated Use contactFieldConfigSlot + dealFieldConfigSlot */
  fieldConfigSlot?: React.ReactNode
}

// ─────────────────────────────────────────────────────────────────
// Section ordering
// ─────────────────────────────────────────────────────────────────

type AsideSection = "negocios" | "contato" | "produtos" | "campos-negocio"
const ASIDE_DEFAULT_ORDER: AsideSection[] = [
  "negocios",
  "contato",
  "produtos",
  "campos-negocio",
]
// Bump da versao pra `v4` porque adicionamos a secao `produtos` na
// ordem default. Sem novo storage key, usuarios antigos ficariam com
// [negocios, contato, campos-negocio] persistido em localStorage e
// a nova secao nunca apareceria (`useSectionOrder` mantem o valor salvo).
const ASIDE_STORAGE_KEY = "crm:contact-aside:section-order-v4"

// ── Abas Perfil / Produto ─────────────────────────────────────────
// O hero do negócio (secao `negocios`) fica FIXO no topo. As demais
// secoes sao distribuidas em duas abas: "Perfil" (dados de contato +
// campos de negocio) e "Produto" (produtos). O drag-and-drop continua
// funcionando DENTRO de cada aba (ex.: reordenar contato/campos).
type AsideTab = "perfil" | "produto"
const SECTION_TAB: Partial<Record<AsideSection, AsideTab>> = {
  contato: "perfil",
  "campos-negocio": "perfil",
  produtos: "produto",
}
const ASIDE_TAB_ITEMS = [
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

// ─────────────────────────────────────────────────────────────────
// Constants / helpers
// ─────────────────────────────────────────────────────────────────

const PLACEHOLDER = "—"
const isFilled = (v: string | undefined | null): v is string => !!v && v !== PLACEHOLDER
const formatCurrency = (v: number) =>
  v ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : PLACEHOLDER

// ─────────────────────────────────────────────────────────────────
// SectionHeader — cabeçalho de seção com alça + ações
// ─────────────────────────────────────────────────────────────────

function SectionHeader({
  children,
  dragHandleProps,
  actions,
  icon,
  open = true,
  onToggle,
}: {
  children: React.ReactNode
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  actions?: React.ReactNode
  icon?: React.ReactNode
  open?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="mb-1 mt-2 flex items-center gap-1">
      <span
        {...dragHandleProps}
        className="flex cursor-grab items-center rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover/section:opacity-60 hover:opacity-100 active:cursor-grabbing"
        aria-label="Arrastar seção"
      >
        <IconGripVertical size={12} />
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
        className={cn(
          // Tipografia padronizada — mesma usada em "Campos de Negocio":
          // font-display 10px bold uppercase, tracking 0.12em, muted.
          // Aplica a TODOS os cabeçalhos (Detalhes de Contato, Produtos,
          // Campos de Negocio) pra evitar variação visual entre secoes.
          "flex items-center gap-1.5 rounded font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]",
          onToggle && "cursor-pointer hover:text-[var(--text-primary)]",
        )}
      >
        {icon}
        {children}
        {onToggle && (
          <IconChevronDown
            size={12}
            className={cn("transition-transform", !open && "-rotate-90")}
          />
        )}
      </button>
      {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
    </div>
  )
}

/** Botão de ação no cabeçalho (lápis ou engrenagem) */
function HeaderBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <TooltipGlass label={label} side="left">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
          active
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
        )}
      >
        {children}
      </button>
    </TooltipGlass>
  )
}

// ─────────────────────────────────────────────────────────────────
// Row — linha de campo nativo
// ─────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  valueStyle,
  children,
  isLast,
  compact,
  className,
}: {
  label: string
  value?: string
  valueStyle?: React.CSSProperties
  children?: React.ReactNode
  isLast?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 px-3",
        compact ? "py-1.5" : "py-2",
        !isLast && "border-b border-[var(--glass-border-subtle)]",
        className,
      )}
    >
      <span className={cn(
        "shrink-0 font-medium text-[var(--text-muted)]",
        compact ? "w-[40%] text-[11px] leading-tight" : "w-[38%] text-[12px]",
      )}>
        {label}
      </span>
      <div className="min-w-0 flex-1">
        {children ?? (
          <span className={cn(
            "font-display font-semibold text-[var(--text-primary)] break-words",
            compact ? "text-[12px]" : "text-[13px]",
          )} style={valueStyle}>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ViewModeToggle — alterna entre visão foco (premium) e compacta
// ─────────────────────────────────────────────────────────────────
function ViewModeToggle({ mode, onChange }: { mode: AsideViewMode; onChange: (m: AsideViewMode) => void }) {
  return (
    <div className="flex shrink-0 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5">
      <TooltipGlass label="Visão foco" side="top">
        <button
          type="button"
          onClick={() => onChange("focus")}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
            mode === "focus"
              ? "bg-[var(--brand-primary)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
          aria-label="Visão foco"
        >
          <IconSparkles size={12} />
        </button>
      </TooltipGlass>
      <TooltipGlass label="Visão compacta" side="top">
        <button
          type="button"
          onClick={() => onChange("compact")}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
            mode === "compact"
              ? "bg-[var(--brand-primary)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
          aria-label="Visão compacta"
        >
          <IconLayoutList size={12} />
        </button>
      </TooltipGlass>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// DealInline
// ─────────────────────────────────────────────────────────────────

function DealInline({
  deal,
  course,
  contact,
}: {
  deal: NonNullable<ContactDetails["deals"]>[number]
  course: string | undefined
  contact: ContactDetails
}) {
  const fields = deal.customFields ?? []
  const segments = deal.funnelSegments
  const sortedSegments = segments
    ? [...segments].sort((a, b) => a.position - b.position)
    : null
  const currentSegIdx = sortedSegments
    ? sortedSegments.findIndex((s) => s.id === deal.stageId)
    : -1
  const stageLabel =
    deal.stageName ??
    sortedSegments?.find((s) => s.id === deal.stageId)?.name ??
    "Sem estágio"
  const productName = deal.productName ?? course ?? null
  const status = deal.status ?? null
  const isLost = status === "LOST"
  const isWon = status === "WON"
  const lostReason = isLost ? (deal.lostReason ?? "").trim() : ""

  // Progresso do funil: usa currentSegIdx (0-based) + total de segmentos.
  const totalStages = sortedSegments?.length ?? 0
  const currentStage = currentSegIdx >= 0 ? currentSegIdx + 1 : 0
  const progress = totalStages > 0 ? Math.round((currentStage / totalStages) * 100) : 0

  return (
    <div className="px-3 pt-2 pb-0">
      {/* ── Hero header: cor sólida da NavRail (--nav-bg), ocupando toda a
          cabeça do container (edge-to-edge via margens negativas + cantos
          superiores acompanhando o raio do container). ── */}
      <header className="relative isolate -mx-3 -mt-2 mb-2 rounded-t-[var(--radius-xl)] bg-[var(--nav-bg)] px-3.5 pb-2.5 pt-3.5 text-white">
        {/* Bolhas decorativas */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[var(--radius-xl)]">
          <div className="absolute -right-8 -top-10 size-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-6 size-24 rounded-full bg-white/10" />
        </div>

        {/* Linha topo: título + stage dropdown numa única linha */}
        <div className="relative flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-baseline gap-1.5 font-display text-[14px] font-bold leading-snug text-white">
            <span className="min-w-0 truncate">{deal.title}</span>
            {deal.number != null && (
              <span className="shrink-0 font-mono text-[10px] font-semibold text-white/65">
                #{deal.number}
              </span>
            )}
          </h2>

          {deal.stageDropdownSlot ? (
            <div className="relative z-30 shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)] shadow-sm [&_button]:!text-[var(--brand-primary)] [&_button]:hover:!opacity-100">
              {deal.stageDropdownSlot}
            </div>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              {stageLabel}
            </span>
          )}
        </div>

        {/* Linha base: anel de progresso + pipeline info + responsável */}
        <div className="relative mt-2 flex items-center gap-2.5">
          <div
            className="grid size-9 shrink-0 place-items-center rounded-full"
            style={{
              background:
                sortedSegments && sortedSegments.length > 0
                  ? (() => {
                      const step = 100 / sortedSegments.length
                      const stops = sortedSegments
                        .map((seg, i) => {
                          const color = seg.color || "var(--brand-primary)"
                          const active = i <= currentSegIdx
                          const c = active
                            ? color
                            : `color-mix(in srgb, ${color} 22%, rgba(255,255,255,0.35))`
                          return `${c} ${i * step}% ${(i + 1) * step}%`
                        })
                        .join(", ")
                      return `conic-gradient(${stops})`
                    })()
                  : `conic-gradient(var(--brand-primary) ${progress}%, rgba(255,255,255,0.25) 0)`,
            }}
          >
            <div className="grid size-[26px] place-items-center rounded-full bg-[var(--brand-primary)]">
              <span className="font-display text-[9px] font-bold text-white">
                {totalStages > 0 ? `${currentStage}/${totalStages}` : "—"}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-[10.5px] text-white/80">
            <p className="truncate font-semibold text-white">{deal.pipelineName ?? "Funil de vendas"}</p>
            <p className="truncate">
              {totalStages > 0 ? `Etapa ${currentStage} de ${totalStages}` : stageLabel}
            </p>
          </div>
          {deal.assigneeSlot && (
            <div className="shrink-0 [&_span]:!border-transparent [&_span]:!bg-white [&_span]:!text-[var(--brand-primary)] [&_span]:shadow-sm">
              {deal.assigneeSlot}
            </div>
          )}
        </div>

        {/* Barra de funil segmentada — dentro do card */}
        {sortedSegments && sortedSegments.length > 0 && (
          <div className="relative mt-2 flex gap-1 px-0.5">
            {sortedSegments.map((seg, i) => (
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

        {/* Origem + Canal + Tags — seção inferior do card */}
        {(deal.origin || contact.connection || deal.dealTagsNode !== undefined) && (
          <div className="relative mt-2 flex flex-col gap-0 divide-y divide-white/15 rounded-[var(--radius-md)] bg-white/10 px-2.5 py-1">
            {deal.origin && (
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="shrink-0 text-[11px] text-white/60">Origem</span>
                <span className="truncate text-right text-[11.5px] font-semibold text-white">{deal.origin}</span>
              </div>
            )}
            {contact.connection && (
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="shrink-0 text-[11px] text-white/60">Canal</span>
                <span className="truncate text-right text-[11.5px] font-semibold text-white">
                  {formatConnectionShort(contact.connection)}
                </span>
              </div>
            )}
            {deal.dealTagsNode !== undefined && (
              <div className="flex flex-wrap items-center gap-1.5 py-1.5 [&_.tag-chip]:!bg-white/15 [&_.tag-chip]:!text-white [&_.tag-chip]:!border-white/20">
                <span className="shrink-0 text-[11px] text-white/60">Tags</span>
                {deal.dealTagsNode}
              </div>
            )}
          </div>
        )}
      </header>

      {isLost && lostReason && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-danger,#dc2626)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-danger,#dc2626)_6%,transparent)] px-4 py-2.5">
          <p className="mb-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-danger,#dc2626)]">
            Motivo da perda
          </p>
          <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {lostReason}
          </p>
        </div>
      )}

      {/* IB5 do questionario: card legado "Produto" (`deal.productName`)
          removido. Antes existia em paralelo com a `DealProductsSection`
          (abaixo) e ao adicionar um produto novo, este card legado nao
          atualizava — o item aparecia so na secao moderna, dando a
          impressao de "produto duplicado abaixo do card". A fonte agora
          e unica: DealProductsSection com line items reais da API
          /api/deals/:id/products. */}

      {fields.length > 0 && (
        <div className="mt-2 mb-2">
          <div className="mb-1 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <IconSparkles size={12} />
            Informações do Negócio
          </div>
          {/* Layout responsivo: grid 2-col; valores muito longos (>18 chars ou com espaco)
              ganham col-span-2 (ocupam linha inteira sozinhos) — layout compacto sem
              truncar e sem espaco vazio esquisito. */}
          <div className="grid grid-cols-2 gap-1.5">
            {fields.map((f) => {
              const isEmpty = !f.value || f.value === PLACEHOLDER
              const isLong = !isEmpty && (f.value!.length > 18 || f.value!.includes("@"))
              return (
                <div
                  key={f.fieldId}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-[var(--radius-lg)] bg-[var(--glass-bg-overlay)] p-2",
                    isLong && "col-span-2",
                  )}
                >
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    {f.label}
                  </span>
                  {isEmpty ? (
                    <span className="italic text-[12px] text-[var(--text-muted)]/70">
                      + Adicionar
                    </span>
                  ) : (
                    <span className="min-w-0 break-words font-display text-[12px] font-bold text-[var(--text-primary)]">
                      {f.value}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Produtos removido daqui — vira secao independente arrastavel
          (`produtos`) renderizada no loop de secoes da ContactAside.
          Assim o operador pode mover Produtos pra antes/depois dos
          outros blocos, ganhando o mesmo padrao de header (icone +
          titulo + chevron + acoes) das demais secoes. */}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ContactAside — componente principal
// ─────────────────────────────────────────────────────────────────

export function ContactAside({
  contact,
  className,
  collapsed = false,
  onToggleCollapse,
  contactEditNode,
  tagsNode,
  contactFieldConfigSlot,
  dealFieldConfigSlot,
  fieldConfigSlot, // legado
  headerActionsNode,
  contactTagsNode,
}: ContactAsideProps) {
  const course = contact.course ?? contact.product
  const deals = contact.deals ?? []

  // Campos personalizados separados por entidade
  const allPanelFields = contact.panelFields ?? []
  const contactPanelFields = allPanelFields.filter((f) => f.entityType === "contact")
  const dealPanelFields = allPanelFields.filter((f) => f.entityType === "deal")

  // Retrocompatibilidade: se ainda usar fieldConfigSlot (sem split), exibir em ambas seções
  const resolvedContactConfig = contactFieldConfigSlot ?? fieldConfigSlot
  const resolvedDealConfig = dealFieldConfigSlot ?? null

  // Updates otimísticos
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [nativeValues, setNativeValues] = useState<Record<string, string>>({})
  const native = (key: string, fallback: string | undefined) => nativeValues[key] ?? fallback

  // Chaves de invalidação de cache para este contato
  const contactInvalidateKeys: unknown[][] = [
    ["contact-sidebar", contact.contactId],
    ["inbox-conversations"],
  ]
  const { data: contactSources = [] } = useContactSources(!!contact.contactId)

  // Estados de modo edição
  const [contactEditMode, setContactEditMode] = useState(false)
  const [dealFieldsEditMode, setDealFieldsEditMode] = useState(false)

  // Estados de configuração abertos
  const [contactConfigOpen, setContactConfigOpen] = useState(false)
  const [dealConfigOpen, setDealConfigOpen] = useState(false)

  // Estados de colapso de seção (variante Vívida)
  const [contactSectionOpen, setContactSectionOpen] = useState(true)
  const [dealFieldsSectionOpen, setDealFieldsSectionOpen] = useState(true)
  const [productsSectionOpen, setProductsSectionOpen] = useState(true)

  const resolvedContactPanelFields = contactPanelFields.map((f) => ({
    ...f,
    value: fieldValues[f.fieldId] ?? f.value,
  }))
  const resolvedDealPanelFields = dealPanelFields.map((f) => ({
    ...f,
    value: fieldValues[f.fieldId] ?? f.value,
  }))

  const [sectionOrder, reorder] = useSectionOrder<AsideSection>(
    ASIDE_STORAGE_KEY,
    ASIDE_DEFAULT_ORDER,
  )

  // Aba ativa (Perfil por padrão — é o conteúdo primário do operador).
  const [activeTab, setActiveTab] = useState<AsideTab>("perfil")

  // Toggle foco ↔ compacto (persiste em localStorage, compartilhado com deal-detail).
  const [viewMode, setViewMode] = useAsideViewMode()

  // IB6 do questionario: respeitar visibilidade configurada no
  // FieldConfigPanel admin (context=inbox_lead_v2). Antes o toggle do
  // "olho" no painel de config nao tinha efeito porque ContactAside
  // ignorava o layout. Mapeamento sectionId interno -> id taxonomia.
  const { sections: fieldLayoutSections } = useFieldLayout("inbox_lead_v2")
  const sectionHiddenMap = useMemo(() => {
    const FIELD_LAYOUT_TO_INTERNAL: Record<string, AsideSection> = {
      negocios: "negocios",
      detalhes_contato: "contato",
      campos_personalizados: "campos-negocio",
    }
    const hidden: Partial<Record<AsideSection, boolean>> = {}
    for (const section of fieldLayoutSections ?? []) {
      const internal = FIELD_LAYOUT_TO_INTERNAL[section.id]
      if (internal && section.hidden) hidden[internal] = true
    }
    return hidden
  }, [fieldLayoutSections])

  // Seções visíveis na aba ativa (o hero `negocios` fica fora — é fixo).
  // Aplica os mesmos guards de dados que antes viviam no loop de render.
  const tabbedSections = useMemo(
    () =>
      sectionOrder.filter((s) => {
        if (s === "negocios") return false
        if (SECTION_TAB[s] !== activeTab) return false
        if (sectionHiddenMap[s]) return false
        if (s === "produtos" && deals.length === 0) return false
        if (
          s === "campos-negocio" &&
          resolvedDealPanelFields.length === 0 &&
          !resolvedDealConfig
        )
          return false
        return true
      }),
    [
      sectionOrder,
      activeTab,
      sectionHiddenMap,
      deals.length,
      resolvedDealPanelFields.length,
      resolvedDealConfig,
    ],
  )

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    // Os índices do resultado são relativos à lista da aba atual;
    // traduz de volta para a posição absoluta em `sectionOrder`.
    const from = tabbedSections[result.source.index]
    const to = tabbedSections[result.destination.index]
    if (!from || !to) return
    reorder(sectionOrder.indexOf(from), sectionOrder.indexOf(to))
  }

  /* ── Estado recolhido ── */
  if (collapsed) {
    return (
      <aside
        aria-label="Detalhes do contato (recolhido)"
        className={cn(
          "relative flex h-full flex-col items-center justify-start rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pt-3 backdrop-blur-md shadow-[var(--glass-shadow)]",
          className,
        )}
      >
        {/* Mesma pill do estado expandido, só com o chevron invertido
            (`<`) — padroniza o elemento de recolher/expandir. Fica na
            faixa entre o chat e o aside recolhido. */}
        <TooltipGlass label="Expandir painel de contato" side="left">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group absolute left-0 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 flex h-10 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white text-[var(--brand-primary)] shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-all hover:bg-[var(--brand-primary)] hover:text-white hover:shadow-[0_4px_14px_rgba(91,111,245,0.40)] hover:scale-110"
            aria-label="Expandir painel de contato"
          >
            <IconChevronLeft size={13} strokeWidth={3} />
          </button>
        </TooltipGlass>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Detalhes do contato"
      className={cn("relative flex h-full flex-col pr-0.5 overflow-visible", className)}
    >
      {/* Botao recolher — chevron minimalista tipo '>' na faixa entre aside
          e chat. Fica FORA do container interno (que tem overflow) para nao
          ser cortado; posicionado no outer aside com left:0 e translate-x
          negativo pra ficar centrado sobre a borda esquerda. */}
      {onToggleCollapse && (
        <TooltipGlass label="Recolher painel de contato" side="left">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group absolute left-0 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 flex h-10 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white text-[var(--brand-primary)] shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-all hover:bg-[var(--brand-primary)] hover:text-white hover:shadow-[0_4px_14px_rgba(91,111,245,0.40)] hover:scale-110"
            aria-label="Recolher painel de contato"
          >
            <IconChevronRight size={13} strokeWidth={3} />
          </button>
        </TooltipGlass>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]">

        {/* Header de acoes do contato (IB4 do questionario):
            DealCallButton entra aqui via `headerActionsNode`. Antes ficava
            no header do chat (chat-area.tsx headerActionsSlot), agora vive
            ao lado do botao de colapso pra paridade com o deal detail (que
            ja tinha o botao no header da sidebar). Mantemos absolute pra
            nao deslocar o topo das secoes existentes. */}
        {headerActionsNode && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
            {headerActionsNode}
          </div>
        )}

        {/* ── Hero do negócio (FIXO no topo, fora das abas) ── */}
        {deals.length > 0 && !sectionHiddenMap["negocios"] && (
          <div className="border-b border-[var(--glass-border-subtle)]">
            {deals.map((deal) => (
              <DealInline key={deal.id} deal={deal} course={course} contact={contact} />
            ))}
          </div>
        )}

        {/* ── Pills: Perfil / Produto + toggle de visão ── */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <PageSegmentedControl
            items={ASIDE_TAB_ITEMS}
            value={activeTab}
            onChange={(v) => setActiveTab(v as AsideTab)}
            aria-label="Alternar entre Perfil e Produto"
            size="compact"
            className="flex-1 [&>button]:flex [&>button]:flex-1 [&>button]:items-center [&>button]:justify-center"
          />
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="aside-sections">
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className="flex flex-col"
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
                            snapshot.isDragging &&
                              "z-50 rounded-[var(--radius-xl)] opacity-90 shadow-2xl ring-2 ring-[var(--brand-primary)]/30",
                          )}
                        >
                          {/* ── Detalhes de Contato (campos nativos + personalizados) ── */}
                          {sectionId === "contato" && (
                            <div className="border-b border-[var(--glass-border-subtle)] px-3 pb-2">
                              <SectionHeader
                                dragHandleProps={provided.dragHandleProps ?? undefined}
                                icon={<IconUser size={12} />}
                                open={contactSectionOpen}
                                onToggle={() => setContactSectionOpen((v) => !v)}
                                actions={
                                  <>
                                    <HeaderBtn
                                      label={contactEditMode ? "Sair do modo edição" : "Editar dados de contato"}
                                      active={contactEditMode}
                                      onClick={() => setContactEditMode((v) => !v)}
                                    >
                                      {contactEditMode ? <IconX size={13} /> : <IconPencil size={13} />}
                                    </HeaderBtn>
                                    {resolvedContactConfig && (
                                      <HeaderBtn
                                        label={contactConfigOpen ? "Fechar configurações" : "Configurar campos de contato"}
                                        active={contactConfigOpen}
                                        onClick={() => setContactConfigOpen((v) => !v)}
                                      >
                                        {contactConfigOpen ? <IconX size={13} /> : <IconSettings size={13} />}
                                      </HeaderBtn>
                                    )}
                                  </>
                                }
                              >
                                Informações do Contato
                              </SectionHeader>

                              {contactSectionOpen && (
                              <>
                              {contactConfigOpen && resolvedContactConfig && (
                                <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] p-3">
                                  {resolvedContactConfig}
                                </div>
                              )}

                              {/* Campos nativos */}
                              <div className={cn(
                                "rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] overflow-hidden",
                                viewMode === "compact"
                                  ? "bg-[var(--glass-bg-overlay)]"
                                  : "bg-[var(--glass-bg-overlay)] px-3.5 py-1"
                              )}>
                                <Row label="Nome" compact={viewMode === "compact"}>
                                  <div className="flex items-center gap-1.5">
                                    <InlineNativeEditor
                                      value={native("name", contact.name)}
                                      entityType="contact"
                                      entityId={contact.contactId}
                                      fieldKey="name"
                                      editMode={contactEditMode}
                                      invalidateKeys={contactInvalidateKeys}
                                      onSaved={(v) => setNativeValues((p) => ({ ...p, name: v }))}
                                      textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                    />
                                    {contact.contactNumber != null && (
                                      <span className="shrink-0 font-mono text-[10px] font-semibold text-[var(--text-muted)]">
                                        #{contact.contactNumber}
                                      </span>
                                    )}
                                  </div>
                                </Row>
                                {/* Telefone (formatado). Campos basicos
                                    garantidos no aside: Nome, Telefone, Email
                                    e @ do WhatsApp. Edicao inline salva o valor
                                    cru; exibicao usa mascara BR. */}
                                <Row label="Telefone" compact={viewMode === "compact"}>
                                  <InlineNativeEditor
                                    value={native("phone", contact.phone)}
                                    entityType="contact"
                                    entityId={contact.contactId}
                                    fieldKey="phone"
                                    inputType="tel"
                                    placeholder="Adicionar telefone"
                                    formatDisplay={(v) => formatPhoneDisplay(v)}
                                    editMode={contactEditMode}
                                    invalidateKeys={contactInvalidateKeys}
                                    onSaved={(v) => setNativeValues((p) => ({ ...p, phone: v }))}
                                    textClassName="font-display text-[12px] font-bold text-[var(--text-primary)] text-right"
                                  />
                                </Row>
                                <Row label="Email" compact={viewMode === "compact"}>
                                  <InlineNativeEditor
                                    value={native("email", contact.email)}
                                    entityType="contact"
                                    entityId={contact.contactId}
                                    fieldKey="email"
                                    inputType="email"
                                    placeholder="Adicionar e-mail"
                                    editMode={contactEditMode}
                                    invalidateKeys={contactInvalidateKeys}
                                    onSaved={(v) => setNativeValues((p) => ({ ...p, email: v }))}
                                    textClassName="font-display text-[12px] font-bold text-[var(--brand-primary)] text-right"
                                  />
                                </Row>
                                {/* @ do WhatsApp — somente leitura (vem do
                                    webhook Meta, nao editavel). So aparece
                                    quando o contato tem username capturado. */}
                                {isFilled(contact.whatsappUsername) && (
                                  <Row
                                    label="@ WhatsApp"
                                    value={`@${contact.whatsappUsername!.replace(/^@/, "")}`}
                                    compact={viewMode === "compact"}
                                  />
                                )}
                                {contact.connection && (
                                  <Row label="Canal" compact={viewMode === "compact"}>
                                    <TooltipGlass
                                      label={`Conversando por ${formatConnectionLabel(contact.connection)}`}
                                      side="left"
                                    >
                                      <span className="inline-flex items-center gap-1.5 font-display text-[12px] font-bold text-[var(--text-primary)]">
                                        <IconAffiliate size={13} className="text-[var(--brand-primary)]" />
                                        {channelTypeLabel(contact.connection.type)} · {formatConnectionShort(contact.connection)}
                                      </span>
                                    </TooltipGlass>
                                  </Row>
                                )}
                                {isFilled(contact.cpf) && <Row label="CPF" value={contact.cpf} compact={viewMode === "compact"} />}
                                {isFilled(contact.rg) && <Row label="RG" value={contact.rg} compact={viewMode === "compact"} />}
                                {isFilled(contact.cep) && <Row label="CEP" value={contact.cep} compact={viewMode === "compact"} />}
                                {isFilled(contact.addressNumber) && (
                                  <Row label="N Residencia" value={contact.addressNumber} compact={viewMode === "compact"} />
                                )}
                                {isFilled(contact.birthDate) && (
                                  <Row label="Data de Nascimento" value={contact.birthDate} isLast compact={viewMode === "compact"} />
                                )}
                              </div>

                              {/* Campos personalizados de contato */}
                              {resolvedContactPanelFields.length > 0 && (
                                <div className={cn(
                                  "mt-3 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] overflow-hidden",
                                  "bg-[var(--glass-bg-overlay)]"
                                )}>
                                  {resolvedContactPanelFields.map((f, i) => {
                                    const hl = f.highlight ?? resolveHighlight(f.value, f.highlightRules)
                                    const colors = hl ? SEVERITY_COLORS[hl.severity as HighlightSeverity] : null
                                    const canEdit = !!f.entityType && !!f.entityId
                                    const isCompact = viewMode === "compact"
                                    return (
                                      <div
                                        key={f.fieldId}
                                        className={cn(
                                          "flex items-baseline gap-2 px-3",
                                          isCompact ? "py-1.5" : "py-2",
                                          i < resolvedContactPanelFields.length - 1 &&
                                            "border-b border-[var(--glass-border-subtle)]",
                                        )}
                                      >
                                        <span className={cn(
                                          "shrink-0 font-medium text-[var(--text-muted)]",
                                          isCompact ? "w-[40%] text-[11px] leading-tight" : "w-[38%] text-[12px]"
                                        )}>
                                          {f.label}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          {contactEditMode && canEdit ? (
                                            <InlineFieldEditor
                                              fieldId={f.fieldId}
                                              fieldType={f.type}
                                              fieldOptions={f.options ?? []}
                                              value={f.value || null}
                                              entityType={f.entityType!}
                                              entityId={f.entityId!}
                                              editMode={contactEditMode}
                                              invalidateKeys={contactInvalidateKeys}
                                              onSaved={(v) =>
                                                setFieldValues((prev) => ({ ...prev, [f.fieldId]: v }))
                                              }
                                              textClassName={cn("font-display font-semibold text-[var(--text-primary)]", isCompact ? "text-[12px]" : "text-[13px]")}
                                              placeholder="+ Adicionar"
                                            />
                                          ) : hl && colors ? (
                                            <span
                                              style={{
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                                border: `1px solid ${colors.border}`,
                                              }}
                                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                                            >
                                              {hl.label}
                                            </span>
                                          ) : canEdit ? (
                                            <InlineFieldEditor
                                              fieldId={f.fieldId}
                                              fieldType={f.type}
                                              fieldOptions={f.options ?? []}
                                              value={f.value || null}
                                              entityType={f.entityType!}
                                              entityId={f.entityId!}
                                              editMode={contactEditMode}
                                              invalidateKeys={contactInvalidateKeys}
                                              onSaved={(v) =>
                                                setFieldValues((prev) => ({ ...prev, [f.fieldId]: v }))
                                              }
                                              textClassName={cn("font-display font-semibold text-[var(--text-primary)]", isCompact ? "text-[12px]" : "text-[13px]")}
                                              placeholder="+ Adicionar"
                                            />
                                          ) : (
                                            <span className={cn("font-display font-semibold text-[var(--text-primary)]", isCompact ? "text-[12px]" : "text-[13px]")}>
                                              {f.value || PLACEHOLDER}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Tags do CONTATO removidas das asides por decisão de design */}
                              </>
                              )}
                            </div>
                          )}

                          {/* ── Produtos (secao independente, arrastavel) ──
                              Antes ficava fixo dentro do bloco Negocios; agora
                              e uma secao autonoma com header padronizado (icone
                              + titulo + chevron), permitindo drag-and-drop e
                              colapso. Usa o 1o negocio do contato (`deals[0]`)
                              como target — cenario dominante no inbox e um
                              contato com um deal ativo por vez. */}
                          {sectionId === "produtos" && deals[0] && (
                            <div className="border-b border-[var(--glass-border-subtle)] px-3 pb-2">
                              <SectionHeader
                                dragHandleProps={provided.dragHandleProps ?? undefined}
                                icon={<IconPackage size={12} />}
                                open={productsSectionOpen}
                                onToggle={() => setProductsSectionOpen((v) => !v)}
                              >
                                Produtos
                              </SectionHeader>
                              {productsSectionOpen && (
                                <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3 py-2">
                                  {/* `hideTitle` evita duplicar o rotulo "Produtos"
                                      — quem provee o cabecalho e o SectionHeader
                                      acima; DealProductsSection so renderiza os
                                      items + botao adicionar + count. */}
                                  <DealProductsSection dealId={deals[0].id} compact hideTitle />
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Campos de Negócio (personalizados) ── */}
                          {sectionId === "campos-negocio" &&
                            (resolvedDealPanelFields.length > 0 || resolvedDealConfig) && (
                              <div className="px-3 pb-3">
                                <SectionHeader
                                  dragHandleProps={provided.dragHandleProps ?? undefined}
                                  icon={<IconSparkles size={12} />}
                                  open={dealFieldsSectionOpen}
                                  onToggle={() => setDealFieldsSectionOpen((v) => !v)}
                                  actions={
                                  <>
                                    <HeaderBtn
                                        label={dealFieldsEditMode ? "Sair do modo edição" : "Editar campos de negócio"}
                                        active={dealFieldsEditMode}
                                        onClick={() => setDealFieldsEditMode((v) => !v)}
                                      >
                                        {dealFieldsEditMode ? <IconX size={13} /> : <IconPencil size={13} />}
                                      </HeaderBtn>
                                      {resolvedDealConfig && (
                                        <HeaderBtn
                                          label={dealConfigOpen ? "Fechar configurações" : "Configurar campos de negócio"}
                                          active={dealConfigOpen}
                                          onClick={() => setDealConfigOpen((v) => !v)}
                                        >
                                          {dealConfigOpen ? <IconX size={13} /> : <IconSettings size={13} />}
                                        </HeaderBtn>
                                      )}
                                    </>
                                  }
                                >
                                  Informações do Negócio
                                </SectionHeader>

                                {dealFieldsSectionOpen && (
                                <>
                                {dealConfigOpen && resolvedDealConfig && (
                                  <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] p-3">
                                    {resolvedDealConfig}
                                  </div>
                                )}

                                {resolvedDealPanelFields.length > 0 && (
                                  viewMode === "compact" ? (
                                    /* ── Compact: flat rows ── */
                                    <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] overflow-hidden">
                                      {resolvedDealPanelFields.map((f, idx) => {
                                        const hl = f.highlight ?? resolveHighlight(f.value, f.highlightRules)
                                        const colors = hl ? SEVERITY_COLORS[hl.severity as HighlightSeverity] : null
                                        const canEdit = !!f.entityType && !!f.entityId
                                        return (
                                          <div
                                            key={f.fieldId}
                                            className={cn(
                                              "flex items-baseline gap-2 px-3 py-1.5",
                                              idx < resolvedDealPanelFields.length - 1 && "border-b border-[var(--glass-border-subtle)]",
                                            )}
                                          >
                                            <span className="w-[38%] shrink-0 text-[11px] font-medium text-[var(--text-muted)] leading-tight">{f.label}</span>
                                            <div className="min-w-0 flex-1">
                                              {dealFieldsEditMode && canEdit ? (
                                                <InlineFieldEditor fieldId={f.fieldId} fieldType={f.type} fieldOptions={f.options ?? []} value={f.value || null} entityType={f.entityType!} entityId={f.entityId!} editMode={dealFieldsEditMode} invalidateKeys={[["deal-detail-v2", f.entityId!]]} onSaved={(v) => setFieldValues((prev) => ({ ...prev, [f.fieldId]: v }))} textClassName="font-display text-[12px] font-semibold text-[var(--text-primary)]" placeholder="+ Adicionar" />
                                              ) : hl && colors ? (
                                                <span style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold">{hl.label}</span>
                                              ) : canEdit ? (
                                                <InlineFieldEditor fieldId={f.fieldId} fieldType={f.type} fieldOptions={f.options ?? []} value={f.value || null} entityType={f.entityType!} entityId={f.entityId!} editMode={dealFieldsEditMode} invalidateKeys={[["deal-detail-v2", f.entityId!]]} onSaved={(v) => setFieldValues((prev) => ({ ...prev, [f.fieldId]: v }))} textClassName="font-display text-[12px] font-semibold text-[var(--text-primary)]" placeholder="+ Adicionar" />
                                              ) : (
                                                <span className="font-display text-[12px] font-semibold text-[var(--text-primary)]">{f.value || PLACEHOLDER}</span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                  /* ── Focus (padrão): grid de cards ── */
                                  <div className="grid grid-cols-2 gap-2">
                                    {resolvedDealPanelFields.map((f) => {
                                      const hl = f.highlight ?? resolveHighlight(f.value, f.highlightRules)
                                      const colors = hl ? SEVERITY_COLORS[hl.severity as HighlightSeverity] : null
                                      const canEdit = !!f.entityType && !!f.entityId
                                      const isEmptyDeal = !f.value || f.value === PLACEHOLDER
                                      const isLongDeal =
                                        !isEmptyDeal && ((f.value ?? "").length > 18 || (f.value ?? "").includes("@"))
                                      return (
                                        <div
                                          key={f.fieldId}
                                          className={cn(
                                            "flex flex-col items-start gap-0.5 rounded-[var(--radius-lg)] bg-[var(--glass-bg-overlay)] p-2.5",
                                            isLongDeal && "col-span-2",
                                          )}
                                        >
                                          <span className="text-[11px] font-medium text-[var(--text-muted)]">
                                            {f.label}
                                          </span>
                                          <div className="min-w-0 w-full">
                                            {dealFieldsEditMode && canEdit ? (
                                              <InlineFieldEditor
                                                fieldId={f.fieldId}
                                                fieldType={f.type}
                                                fieldOptions={f.options ?? []}
                                                value={f.value || null}
                                                entityType={f.entityType!}
                                                entityId={f.entityId!}
                                                editMode={dealFieldsEditMode}
                                                invalidateKeys={[["deal-detail-v2", f.entityId!]]}
                                                onSaved={(v) =>
                                                  setFieldValues((prev) => ({ ...prev, [f.fieldId]: v }))
                                                }
                                                textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                                placeholder="+ Adicionar"
                                              />
                                            ) : hl && colors ? (
                                              <span
                                                style={{
                                                  backgroundColor: colors.bg,
                                                  color: colors.text,
                                                  border: `1px solid ${colors.border}`,
                                                }}
                                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                                              >
                                                {hl.label}
                                              </span>
                                            ) : canEdit ? (
                                              <InlineFieldEditor
                                                fieldId={f.fieldId}
                                                fieldType={f.type}
                                                fieldOptions={f.options ?? []}
                                                value={f.value || null}
                                                entityType={f.entityType!}
                                                entityId={f.entityId!}
                                                editMode={dealFieldsEditMode}
                                                invalidateKeys={[["deal-detail-v2", f.entityId!]]}
                                                onSaved={(v) =>
                                                  setFieldValues((prev) => ({ ...prev, [f.fieldId]: v }))
                                                }
                                                textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                                placeholder="+ Adicionar"
                                              />
                                            ) : (
                                              <span className="font-display font-bold text-[var(--text-primary)]">
                                                {f.value || PLACEHOLDER}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  )
                                )}
                                </>
                                )}
                              </div>
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

        {/* Estado vazio da aba (ex.: Produto sem negócio vinculado) */}
        {tabbedSections.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="font-display text-[12px] text-[var(--text-muted)]">
              {activeTab === "produto"
                ? "Nenhum produto — vincule um negócio para adicionar."
                : "Nenhum dado de perfil disponível."}
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
