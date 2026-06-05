"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import {
  IconArrowLeft,
  IconChevronDown,
  IconDotsVertical,
  IconSearch,
  IconTag,
  IconPencil,
  IconMessageCircle,
  IconChecklist,
  IconNote,
  IconClock,
  IconPaperclip,
  IconMoodSmile,
  IconMicrophone,
  IconSend,
} from "@tabler/icons-react"
import { BadgeGlass } from "./badge-glass"
import { ChatArea } from "./chat-area"
import { type Message } from "./message-bubble"

interface DealOwner {
  initials: string
  name: string
  avatarColor: string
}

export interface DealDetail {
  id: string
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
  ownerSlot?: React.ReactNode
  sourceSlot?: React.ReactNode
  forecastSlot?: React.ReactNode
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
   */
  customFieldsSlot?: { fieldId: string; label: string; value: string | null }[]
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

const FIELD_GROUPS = [
  "Área de Atuação",
  "CEP",
  "Data de Nascimento",
  "Endereço",
  "Escolaridade",
  "Idade",
  "Local de Ensino",
  "Nome Completo",
]

export function DealDetailPanel({
  isOpen,
  onClose,
  deal,
  stageRibbonSlot,
  winButtonSlot,
  moreActionsSlot,
  ownerSlot,
  sourceSlot,
  forecastSlot,
  tagsSlot,
  messagesSlot,
  composerSlot,
  sessionAlertSlot,
  tabContentOverride,
  customFieldsSlot,
  stageDropdownSlot,
  funnelSegments,
}: DealDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("conversa")

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
              </div>
              <div className="mt-px font-display text-xs text-[var(--text-muted)]">
                #{deal.id} · {deal.phone || "+55 11 98702-3902"}
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
            {moreActionsSlot ?? (
              <PanelIconBtn title="Mais">
                <IconDotsVertical size={16} />
              </PanelIconBtn>
            )}
          </div>
        </header>

        {/* TABS */}
        <div className="flex items-center gap-3.5 border-b border-[var(--glass-border-subtle)] px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-3.5 py-2.5 font-display text-xs font-bold tracking-[0.06em] transition-all",
                  isActive
                    ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
              >
                <Icon size={14} />
                {tab.label.toUpperCase()}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px font-display text-[10px] font-bold",
                      isActive
                        ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                        : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 2 COLS: SIDEBAR + CONTENT */}
        <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr] gap-4 overflow-hidden">
          {/* SIDEBAR — painel funcional estilo Kommo (DS glass) */}
          <aside
            aria-label="Detalhes do negócio"
            className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow)] backdrop-blur-md"
          >
            {/* Cabeçalho fixo: identificador + funil de vendas segmentado */}
            <div className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-[22px] pb-4 pt-[18px]">
              <h2 className="truncate font-display text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
                Lead #{deal.id.slice(-6).toUpperCase()}
              </h2>

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
            </div>

            {/* Conteúdo rolável: lista densa de campos */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[22px] py-4">
              <div className="flex min-w-0 flex-col gap-5">
                {/* Principal */}
                <FieldCard>
                  <FieldRow
                    label="Responsável"
                    valueNode={
                      ownerSlot ?? (
                        <span className="inline-flex cursor-pointer items-center gap-1.5 font-display text-[13px] font-bold italic text-[var(--text-muted)]">
                          {deal.owner?.name || "Sem responsável"}
                          <IconChevronDown size={12} />
                        </span>
                      )
                    }
                  />
                  <FieldRow label="Venda" value={formatMoney(deal.value)} money />
                  <FieldRow
                    label="Origem"
                    valueNode={sourceSlot ?? <PlaceholderValue text="Adicionar" />}
                  />
                  <FieldRow
                    label="Previsão"
                    valueNode={forecastSlot ?? <PlaceholderValue text="Indefinida" />}
                  />
                  <FieldRow
                    label="Tags"
                    isLast
                    valueNode={
                      tagsSlot ?? (
                        <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-[var(--glass-border)] px-2.5 py-0.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                          <IconPlus size={10} />
                          Adicionar
                        </span>
                      )
                    }
                  />
                </FieldCard>

                {/* Dados de Contato */}
                <FieldCard title="Dados de Contato">
                  <FieldRow
                    label="Telefone"
                    valueNode={
                      <a
                        href={deal.phone ? `tel:${deal.phone}` : undefined}
                        className="font-display text-[13px] font-bold text-[var(--brand-primary)]"
                      >
                        {deal.phone || "—"}
                      </a>
                    }
                  />
                  <FieldRow label="Email" value={deal.email ?? undefined} isLast />
                </FieldCard>

                {/* Campos do negócio — dados reais via customFieldsSlot */}
                {customFieldsSlot && customFieldsSlot.length > 0 && (
                  <FieldCard title="Campos do negócio">
                    {customFieldsSlot.map((field, i) => (
                      <FieldRow
                        key={field.fieldId}
                        label={field.label}
                        value={field.value ?? undefined}
                        isLast={i === customFieldsSlot.length - 1}
                      />
                    ))}
                  </FieldCard>
                )}
              </div>
            </div>
          </aside>

          {/* CONTENT */}
          {tabContentOverride?.[activeTab] ? (
            <main
              aria-label={activeTab}
              className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]"
            >
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
              <header className="flex items-center gap-3.5 border-b border-[var(--glass-border-subtle)] px-6 py-[18px]">
                <div className="flex flex-1 items-center gap-2.5">
                  <h2 className="font-display text-[18px] font-bold text-[var(--text-primary)]">
                    {deal.name}
                  </h2>
                  <BadgeGlass variant="enterprise">ENTERPRISE</BadgeGlass>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-7 py-6">
                {messagesSlot}
              </div>

              {sessionAlertSlot}

              {composerSlot ? composerSlot : <FallbackComposer />}
            </main>
          ) : (
            // Default: usa o ChatArea novo com mensagens mock.
            <ChatArea
              contact={{ name: deal.name, badge: "enterprise", badgeLabel: "ENTERPRISE" }}
              messages={fallbackMessages}
              daySeparator="14/05/2026"
              showSessionAlert
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Subcomponentes locais ─── */

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

/** Cartão branco que agrupa uma lista densa de FieldRow (estilo Kommo). */
function FieldCard({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section>
      {title && <SubLabel>{title}</SubLabel>}
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
