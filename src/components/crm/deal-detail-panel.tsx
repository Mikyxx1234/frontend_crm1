"use client"

import { useEffect, useState } from "react"
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
  IconDotsVertical,
  IconGripVertical,
  IconSearch,
  IconPlus,
  IconPencil,
  IconMessageCircle,
  IconChecklist,
  IconNote,
  IconClock,
  IconPaperclip,
  IconMoodSmile,
  IconMicrophone,
  IconSend,
  IconSettings,
  IconX,
} from "@tabler/icons-react"
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
}

type TabId = "conversa" | "atividades" | "notas" | "timeline"

interface DealDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  deal?: DealDetail | null
  // Slots opcionais — quando ausentes, mantém o visual default do v0.
  stageRibbonSlot?: React.ReactNode
  winButtonSlot?: React.ReactNode
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
}

const STAGES = ["Lead", "Novo", "Qualificado", "Proposta", "Negociação", "Fechamento"]

// Paleta do funil segmentado (estilo Kommo) — uma cor por etapa.
const FUNNEL_PALETTE = ["#94a3b8", "#5b6ff5", "#a78bfa", "#f59e0b", "#ec4899", "#10b981"]

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }>; count?: number }[] = [
  { id: "conversa", label: "Conversa", icon: IconMessageCircle, count: 1 },
  { id: "atividades", label: "Atividades", icon: IconChecklist, count: 3 },
  { id: "notas", label: "Notas", icon: IconNote },
  { id: "timeline", label: "Timeline", icon: IconClock },
]

export function DealDetailPanel({
  isOpen,
  onClose,
  deal,
  moreActionsSlot,
  deleteSlot,
  contactEditSlot,
  ownerSlot,
  sourceSlot,
  tagsSlot,
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
}: DealDetailPanelProps) {
  // Retrocompatibilidade: split slots sobrepõem o legado fieldConfigSlot
  const resolvedContactConfig = contactFieldConfigSlot ?? fieldConfigSlot ?? null;
  const resolvedDealConfig = dealFieldConfigSlot ?? null;
  const [activeTab, setActiveTab] = useState<TabId>("conversa")
  const [configOpen, setConfigOpen] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  // Optimistic updates para campos nativos do deal
  const [dealNative, setDealNative] = useState<Record<string, string>>({})
  // Modo edição para campos personalizados do negócio
  const [dealCustomEditMode, setDealCustomEditMode] = useState(false)
  const [sectionOrder, reorderSections] = useSectionOrder<SidebarSection>(
    SIDEBAR_STORAGE_KEY,
    SIDEBAR_DEFAULT_ORDER,
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

  if (!deal) return null

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
              <div className="mt-px font-display text-xs text-[var(--text-muted)]">
                {deal.contactNumber != null
                  ? `#${deal.contactNumber}`
                  : deal.number != null
                    ? `#${deal.number}`
                    : `#${deal.id.slice(-6).toUpperCase()}`}
                {" · "}
                {deal.phone || "+55 11 98702-3902"}
              </div>
            </div>
          </div>

          {/* Espaço flex-1 para empurrar actions para a direita */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <PanelIconBtn title="Buscar">
              <IconSearch size={16} />
            </PanelIconBtn>
            {deleteSlot}
            {moreActionsSlot ?? (
              <PanelIconBtn title="Mais">
                <IconDotsVertical size={16} />
              </PanelIconBtn>
            )}
          </div>
        </header>

        {/* 2 COLS: SIDEBAR + CONTENT */}
        <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr] gap-4 overflow-hidden">
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
              </div>

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
            </div>
          </aside>

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
              <TabsBar activeTab={activeTab} onChange={setActiveTab} />

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
}: {
  activeTab: TabId
  onChange: (id: TabId) => void
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3">
      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1">
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
    </header>
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
