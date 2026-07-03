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
import {
  IconBriefcase,
  IconGripVertical,
  IconPencil,
  IconTag,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconSettings,
  IconX,
  IconAffiliate,
} from "@tabler/icons-react"
import {
  channelTypeLabel,
  formatConnectionShort,
  formatConnectionLabel,
} from "@/lib/connection-label"
import { resolveHighlight, SEVERITY_COLORS, type HighlightSeverity } from "@/lib/highlight"
import { InlineFieldEditor } from "@/components/crm/fields/inline-field-editor"
import { InlineNativeEditor } from "@/components/crm/fields/inline-native-editor"
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
  cpf?: string
  rg?: string
  cep?: string
  addressNumber?: string
  birthDate?: string
  note?: string
  deals?: {
    id: string
    title: string
    value: number | null
    stageName?: string | null
    stageId?: string | null
    pipelineId?: string | null
    productName?: string | null
    status?: string | null
    lostReason?: string | null
    funnelSegments?: { id: string; name: string; color: string; position: number }[]
    stageDropdownSlot?: React.ReactNode
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

type AsideSection = "negocios" | "contato" | "campos-negocio"
const ASIDE_DEFAULT_ORDER: AsideSection[] = [
  "negocios",
  "contato",
  "campos-negocio",
]
const ASIDE_STORAGE_KEY = "crm:contact-aside:section-order-v3"

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
}: {
  children: React.ReactNode
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-1">
      <span
        {...dragHandleProps}
        className="flex cursor-grab items-center rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover/section:opacity-60 hover:opacity-100 active:cursor-grabbing"
        aria-label="Arrastar seção"
      >
        <IconGripVertical size={12} />
      </span>
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {children}
      </span>
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
  className,
}: {
  label: string
  value?: string
  valueStyle?: React.CSSProperties
  children?: React.ReactNode
  isLast?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 text-[13px]",
        !isLast && "border-b border-[var(--glass-border-subtle)]",
        className,
      )}
    >
      <span className="font-medium text-[var(--text-muted)]">{label}</span>
      {children ?? (
        <span className="font-display font-bold text-[var(--text-primary)]" style={valueStyle}>
          {value}
        </span>
      )}
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

  return (
    <div>
      <div className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)]">
          <IconBriefcase size={16} className="text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-[14px] font-bold leading-snug text-[var(--text-primary)]">
              {deal.title}
            </p>
            {(isLost || isWon) && (
              <span
                className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
                style={
                  isLost
                    ? {
                        background: "color-mix(in srgb, var(--color-danger, #dc2626) 12%, transparent)",
                        color: "var(--color-danger, #dc2626)",
                      }
                    : {
                        background: "color-mix(in srgb, var(--color-success, #059669) 12%, transparent)",
                        color: "var(--color-success, #059669)",
                      }
                }
              >
                {isLost ? "Perdido" : "Ganho"}
              </span>
            )}
          </div>
          <div className="relative mt-1">
            {deal.stageDropdownSlot ?? (
              <span className="font-display text-[11px] text-[var(--text-muted)]">
                {stageLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {isLost && lostReason && (
        <div className="mx-5 mb-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-danger,#dc2626)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-danger,#dc2626)_6%,transparent)] px-4 py-2.5">
          <p className="mb-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-danger,#dc2626)]">
            Motivo da perda
          </p>
          <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {lostReason}
          </p>
        </div>
      )}

      {sortedSegments && sortedSegments.length > 0 && (
        <div className="flex gap-1 px-5 pb-3">
          {sortedSegments.map((seg, i) => (
            <TooltipGlass key={seg.id} label={seg.name} side="top">
              <span
                className="h-[4px] flex-1 rounded-full transition-colors"
                style={{
                  background: seg.color || "var(--brand-primary)",
                  opacity: i <= currentSegIdx ? 1 : 0.18,
                }}
              />
            </TooltipGlass>
          ))}
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
        <div className="px-5 pb-4">
          <div className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Campos do negócio
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)]">
            {fields.map((f, i) => (
              <div
                key={f.fieldId}
                className={cn(
                  "flex items-center justify-between gap-3 px-3.5 py-2.5 text-[12.5px]",
                  i < fields.length - 1 && "border-b border-[var(--glass-border-subtle)]",
                )}
              >
                <span className="shrink-0 font-medium text-[var(--text-muted)]">{f.label}</span>
                <span className="min-w-0 truncate text-right font-display font-bold text-[var(--text-primary)]">
                  {f.value ?? PLACEHOLDER}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos do negócio (line items) — adicionar/editar/remover. */}
      <div className="px-5 pb-4">
        <DealProductsSection dealId={deal.id} compact />
      </div>
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

  // Estados de modo edição
  const [contactEditMode, setContactEditMode] = useState(false)
  const [dealFieldsEditMode, setDealFieldsEditMode] = useState(false)

  // Estados de configuração abertos
  const [contactConfigOpen, setContactConfigOpen] = useState(false)
  const [dealConfigOpen, setDealConfigOpen] = useState(false)

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

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    reorder(result.source.index, result.destination.index)
  }

  /* ── Estado recolhido ── */
  if (collapsed) {
    return (
      <aside
        aria-label="Detalhes do contato (recolhido)"
        className={cn(
          "flex h-full flex-col items-center justify-start rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pt-3 backdrop-blur-md shadow-[var(--glass-shadow)]",
          className,
        )}
      >
        <TooltipGlass label="Expandir painel de contato" side="left">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
            aria-label="Expandir painel de contato"
          >
            <IconLayoutSidebarRightExpand size={18} />
          </button>
        </TooltipGlass>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Detalhes do contato"
      className={cn("flex h-full flex-col overflow-y-auto pr-0.5", className)}
    >
      <div className="relative flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]">

        {/* Header de acoes do contato (IB4 do questionario):
            DealCallButton entra aqui via `headerActionsNode`. Antes ficava
            no header do chat (chat-area.tsx headerActionsSlot), agora vive
            ao lado do botao de colapso pra paridade com o deal detail (que
            ja tinha o botao no header da sidebar). Mantemos absolute pra
            nao deslocar o topo das secoes existentes. */}
        {(headerActionsNode || onToggleCollapse) && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
            {headerActionsNode}
            {onToggleCollapse && (
              <TooltipGlass label="Recolher painel de contato" side="left">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
                  aria-label="Recolher painel de contato"
                >
                  <IconLayoutSidebarRightCollapse size={17} />
                </button>
              </TooltipGlass>
            )}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="aside-sections">
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className="flex flex-col"
              >
                {sectionOrder.map((sectionId, index) => {
                  if (sectionId === "negocios" && deals.length === 0) return null
                  if (
                    sectionId === "campos-negocio" &&
                    resolvedDealPanelFields.length === 0 &&
                    !resolvedDealConfig
                  ) return null
                  // IB6: bloco ocultado via FieldConfigPanel admin.
                  if (sectionHiddenMap[sectionId]) return null

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
                          {/* ── Negócios ── */}
                          {sectionId === "negocios" && (
                            <div className="border-b border-[var(--glass-border-subtle)]">
                              <div className="flex justify-center pb-0 pt-1.5">
                                <span
                                  {...provided.dragHandleProps}
                                  className="flex cursor-grab items-center gap-0.5 rounded px-2 py-0.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover/section:opacity-50 hover:opacity-100 active:cursor-grabbing"
                                  aria-label="Arrastar bloco Negócios"
                                >
                                  <IconGripVertical size={13} />
                                </span>
                              </div>
                              {deals.map((deal) => (
                                <DealInline
                                  key={deal.id}
                                  deal={deal}
                                  course={course}
                                  contact={contact}
                                />
                              ))}
                            </div>
                          )}

                          {/* ── Detalhes de Contato (campos nativos + personalizados) ── */}
                          {sectionId === "contato" && (
                            <div className="border-b border-[var(--glass-border-subtle)] px-5 pb-5">
                              <SectionHeader
                                dragHandleProps={provided.dragHandleProps ?? undefined}
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
                                <span className="flex items-baseline gap-1.5">
                                  Detalhes de Contato
                                  {contact.contactNumber != null && (
                                    <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)]">
                                      #{contact.contactNumber}
                                    </span>
                                  )}
                                </span>
                              </SectionHeader>

                              {contactConfigOpen && resolvedContactConfig && (
                                <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] p-3">
                                  {resolvedContactConfig}
                                </div>
                              )}

                              {/* Tags da CONVERSA (Conversation.tags).
                                  Label antigo era "Tags" (generico), causava
                                  confusao com Contact.tags. IB7: agora
                                  separado abaixo. */}
                              {tagsNode && (
                                <div className="mb-3">
                                  <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                    Tags da conversa
                                  </p>
                                  {tagsNode}
                                </div>
                              )}
                              {/* Tags do CONTATO (Contact.tags) — DD9/IB7. */}
                              {contactTagsNode && (
                                <div className="mb-3">
                                  <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                    Tags do contato
                                  </p>
                                  {contactTagsNode}
                                </div>
                              )}

                              {/* Campos nativos */}
                              <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-[18px] py-1">
                                <Row label="Nome">
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
                                </Row>
                                {/* Row "Telefone" movida daqui pro header
                                    do ChatArea (proximo ao kebab). Reduz
                                    duplicidade de campo e coloca o numero
                                    a um clique da acao de ligar. Edicao
                                    inline continua acessivel via botao de
                                    edit do painel (Nome/Email etc.). */}
                                <Row label="Email">
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
                                    textClassName="font-display text-[12px] font-bold text-[var(--brand-primary)]"
                                  />
                                </Row>
                                {contact.connection && (
                                  <Row label="Canal">
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
                                {isFilled(contact.cpf) && <Row label="CPF" value={contact.cpf} />}
                                {isFilled(contact.rg) && <Row label="RG" value={contact.rg} />}
                                {isFilled(contact.cep) && <Row label="CEP" value={contact.cep} />}
                                {isFilled(contact.addressNumber) && (
                                  <Row label="N Residencia" value={contact.addressNumber} />
                                )}
                                {isFilled(contact.birthDate) && (
                                  <Row label="Data de Nascimento" value={contact.birthDate} isLast />
                                )}
                              </div>

                              {/* Campos personalizados de contato */}
                              {resolvedContactPanelFields.length > 0 && (
                                <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)]">
                                  {resolvedContactPanelFields.map((f, i) => {
                                    const hl = f.highlight ?? resolveHighlight(f.value, f.highlightRules)
                                    const colors = hl ? SEVERITY_COLORS[hl.severity as HighlightSeverity] : null
                                    const canEdit = !!f.entityType && !!f.entityId
                                    return (
                                      <div
                                        key={f.fieldId}
                                        className={cn(
                                          "flex items-center justify-between gap-3 px-3.5 py-2 text-[13px]",
                                          i < resolvedContactPanelFields.length - 1 &&
                                            "border-b border-[var(--glass-border-subtle)]",
                                        )}
                                      >
                                        <span className="shrink-0 font-medium text-[var(--text-muted)]">
                                          {f.label}
                                        </span>
                                        <div className="min-w-0 flex-1 flex justify-end">
                                          {/* Modo edição ativo: sempre mostra editor, ignorando badge */}
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
                                              textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                              placeholder="— Adicionar"
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
                                              textClassName="font-display text-[13px] font-bold text-[var(--text-primary)]"
                                              placeholder="— Adicionar"
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
                              )}
                            </div>
                          )}

                          {/* ── Campos de Negócio (personalizados) ── */}
                          {sectionId === "campos-negocio" &&
                            (resolvedDealPanelFields.length > 0 || resolvedDealConfig) && (
                              <div className="px-5 pb-5">
                                <SectionHeader
                                  dragHandleProps={provided.dragHandleProps ?? undefined}
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
                                  Campos de Negócio
                                </SectionHeader>

                                {dealConfigOpen && resolvedDealConfig && (
                                  <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] p-3">
                                    {resolvedDealConfig}
                                  </div>
                                )}

                                {resolvedDealPanelFields.length > 0 && (
                                  <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)]">
                                    {resolvedDealPanelFields.map((f, i) => {
                                      const hl = f.highlight ?? resolveHighlight(f.value, f.highlightRules)
                                      const colors = hl ? SEVERITY_COLORS[hl.severity as HighlightSeverity] : null
                                      const canEdit = !!f.entityType && !!f.entityId
                                      return (
                                        <div
                                          key={f.fieldId}
                                          className={cn(
                                            "flex items-center justify-between gap-3 px-3.5 py-2 text-[13px]",
                                            i < resolvedDealPanelFields.length - 1 &&
                                              "border-b border-[var(--glass-border-subtle)]",
                                          )}
                                        >
                                          <span className="shrink-0 font-medium text-[var(--text-muted)]">
                                            {f.label}
                                          </span>
                                          <div className="min-w-0 flex-1 flex justify-end">
                                            {/* Modo edição ativo: sempre mostra editor, ignorando badge */}
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
                                                placeholder="— Adicionar"
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
                                                placeholder="— Adicionar"
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
      </div>
    </aside>
  )
}
