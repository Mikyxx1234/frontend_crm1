"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  IconArrowLeft,
  IconChevronDown,
  IconDotsVertical,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTrophy,
  IconPencil,
  IconLayoutGrid,
  IconMessageCircle,
  IconChecklist,
  IconNote,
  IconClock,
  IconAlertTriangle,
  IconTemplate,
  IconPaperclip,
  IconMoodSmile,
  IconMicrophone,
  IconSend,
} from "@tabler/icons-react"
import { BadgeGlass } from "./badge-glass"
import { ChatArea } from "./chat-area"
import { DaySeparator, MessageBubble, type Message } from "./message-bubble"

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
}

const STAGES = ["Lead", "Novo", "Qualificado", "Proposta", "Negociação", "Fechamento"]

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
}: DealDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("conversa")
  const [openFieldGroup, setOpenFieldGroup] = useState<string | null>("Idade")

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
          <button
            type="button"
            onClick={onClose}
            title="Voltar"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
          >
            <IconArrowLeft size={18} />
          </button>

          {/* Contact */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                avatarClass,
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[15px] font-bold text-white",
              )}
            >
              {deal.initials}
              {deal.online && (
                <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-white bg-[var(--color-online)]" />
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

          {/* Pipeline progress */}
          {stageRibbonSlot ? (
            <div className="mx-6 flex-1" aria-label="Etapa do pipeline">
              {stageRibbonSlot}
            </div>
          ) : (
            <div className="mx-6 flex flex-1 items-center gap-1.5" aria-label="Etapa do pipeline">
              {STAGES.map((stage, idx) => {
                const done = idx < currentStageIndex
                const active = idx === currentStageIndex
                return (
                  <button
                    key={stage}
                    type="button"
                    className={cn(
                      "flex-1 truncate rounded-full border px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.06em] transition-colors",
                      active &&
                        "border-[var(--brand-primary-dark)] bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.30)]",
                      done &&
                        "border-[rgba(16,185,129,0.25)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
                      !active &&
                        !done &&
                        "border-black/[0.06] bg-white text-[var(--text-muted)]",
                    )}
                  >
                    {stage}
                  </button>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(91,111,245,0.25)] bg-[var(--color-enterprise-bg)] px-3.5 py-1.5 font-display text-[13px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[rgba(91,111,245,0.22)]"
            >
              <IconPhone size={15} />
              Ligar
              <IconChevronDown size={12} className="opacity-70" />
            </button>
            {winButtonSlot ?? (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-success)] px-3.5 py-1.5 font-display text-xs font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.30)] transition-transform hover:-translate-y-0.5"
              >
                <IconTrophy size={14} />
                Ganhar
              </button>
            )}
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
        <div className="flex items-center gap-3.5 border-b border-black/[0.06] px-2">
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
                        : "bg-black/[0.06] text-[var(--text-muted)]",
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
          {/* SIDEBAR */}
          <aside className="flex flex-col gap-[18px] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-[22px] shadow-[var(--glass-shadow)] backdrop-blur-md">
            {/* NEGÓCIO */}
            <SidebarSection
              title="Negócio"
              action={
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 font-display text-[11px] font-bold text-[var(--brand-primary)] hover:underline"
                >
                  <IconLayoutGrid size={13} />
                  Layout personalizado
                </button>
              }
            >
              <Row label="Responsável">
                {ownerSlot ?? (
                  <span className="inline-flex cursor-pointer items-center gap-1.5 italic text-[var(--text-muted)]">
                    {deal.owner?.name || "Sem responsável"}
                    <IconChevronDown size={12} />
                  </span>
                )}
              </Row>
              <Row label="Origem">
                {sourceSlot ?? (
                  <span className="inline-flex cursor-pointer items-center gap-1.5 font-display font-bold text-[var(--text-primary)]">
                    Whatsapp-Dina-7367
                    <IconPencil size={12} className="opacity-50" />
                  </span>
                )}
              </Row>
              <Row label="Previsão">
                {forecastSlot ?? (
                  <span className="cursor-pointer italic text-[var(--text-muted)]">Indefinida</span>
                )}
              </Row>
              <Row label="Tags" isLast>
                {tagsSlot ?? (
                  <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-black/20 px-2.5 py-0.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                    <IconPlus size={10} />
                    Adicionar
                  </span>
                )}
              </Row>
            </SidebarSection>

            {/* CONTATO */}
            <SidebarSection
              title="Contato"
              action={
                <SectionActionBtn title="Editar">
                  <IconPencil size={14} />
                </SectionActionBtn>
              }
            >
              <Row label="Telefone">
                <span
                  className="cursor-pointer font-display font-bold"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {deal.phone || "+5511987023902"}
                </span>
              </Row>
              <Row label="Email" isLast>
                <span className="cursor-pointer italic text-[var(--text-muted)]">Adicionar</span>
              </Row>
            </SidebarSection>

            {/* CAMPOS DO NEGÓCIO */}
            <SidebarSection
              title="Campos do negócio"
              action={
                <SectionActionBtn title="Editar campos">
                  <IconPencil size={14} />
                </SectionActionBtn>
              }
            >
              <div className="flex flex-col">
                {FIELD_GROUPS.map((field) => {
                  const open = openFieldGroup === field
                  return (
                    <div key={field} className="border-b border-black/[0.05] pb-1">
                      <button
                        type="button"
                        onClick={() => setOpenFieldGroup(open ? null : field)}
                        className="flex w-full cursor-pointer items-center justify-between bg-transparent py-2 font-display text-[13px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                      >
                        <span>{field}</span>
                        <IconPlus
                          size={14}
                          className={cn(
                            "transition-transform",
                            open ? "rotate-45 text-[var(--brand-primary)]" : "text-[var(--text-muted)]",
                          )}
                        />
                      </button>
                      {open && (
                        <div className="flex flex-col gap-1.5 pb-1.5 pt-0.5">
                          <Row label="Valor" isLast>
                            <span className="font-display font-bold text-[var(--text-primary)]">
                              28 anos
                            </span>
                          </Row>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </SidebarSection>
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

              <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-6">
                <DaySeparator date="14/05/2026" />
                {messagesSlot}
              </div>

              {sessionAlertSlot}

              {composerSlot ? (
                <div className="mx-6 mb-6">{composerSlot}</div>
              ) : (
                <FallbackComposer />
              )}
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
  return (
    <button
      type="button"
      title={title}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
}

function SidebarSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between border-b border-black/[0.05] pb-1.5">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

function Row({
  label,
  children,
  isLast,
}: {
  label: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center justify-between gap-2.5 py-2 text-[13px]",
        !isLast && "border-b border-black/[0.05]",
      )}
    >
      <span className="font-medium text-[var(--text-muted)]">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function SectionActionBtn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-transparent text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
}

/** Composer fallback (disabled) usado apenas quando sessao expirou e
 * nao foi fornecido `composerSlot`. */
function FallbackComposer() {
  return (
    <div
      className="mx-6 mb-6 flex items-center gap-2 rounded-full border border-black/[0.06] bg-white py-2 pl-[18px] pr-2 opacity-60 shadow-[var(--glass-shadow-sm)]"
    >
      <button
        type="button"
        title="Anexar"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)]"
      >
        <IconPaperclip size={18} />
      </button>
      <input
        type="text"
        placeholder="Sessão expirada. Envie um template..."
        disabled
        className="flex-1 border-none bg-transparent text-sm italic text-[var(--text-primary)] outline-none placeholder:italic placeholder:text-[var(--text-muted)]"
      />
      <button
        type="button"
        title="Emoji"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)]"
      >
        <IconMoodSmile size={18} />
      </button>
      <button
        type="button"
        title="Áudio"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)]"
      >
        <IconMicrophone size={18} />
      </button>
      <button
        type="button"
        title="Enviar"
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
      >
        <IconSend size={16} />
      </button>
    </div>
  )
}
