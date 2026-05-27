"use client"

import { useState } from "react"
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconChevronDown,
  IconDotsVertical,
  IconDownload,
  IconFileText,
  IconFilter,
  IconLayoutGrid,
  IconMessageCircle,
  IconMicrophone,
  IconMoodSmile,
  IconNote,
  IconPaperclip,
  IconPencil,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconChecklist,
  IconClock,
  IconTrophy,
  IconTemplate,
  IconAlertTriangle,
} from "@tabler/icons-react"

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

interface DealDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  deal?: DealDetail | null
  // Slots opcionais — quando ausentes, mantém o visual default do v0.
  // Permite que o wrapper de /pipeline/kanban-v2 injete popovers e
  // mutations sem reescrever o componente.
  stageRibbonSlot?: React.ReactNode
  winButtonSlot?: React.ReactNode
  moreActionsSlot?: React.ReactNode
  ownerSlot?: React.ReactNode
  sourceSlot?: React.ReactNode
  forecastSlot?: React.ReactNode
  tagsSlot?: React.ReactNode
}

const STAGES = ["Lead", "Novo", "Qualificado", "Proposta", "Negociação", "Fechamento"]

type TabId = "conversa" | "atividades" | "notas" | "timeline"

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
}: DealDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("conversa")
  const [openFieldGroup, setOpenFieldGroup] = useState<string | null>("Idade")

  if (!deal) return null

  const currentStageIndex = deal.stage ? STAGES.indexOf(deal.stage) : 2
  const avatarClass = `av-${deal.avatarColor}`

  return (
    <>
      {/* Panel — fullscreen slide-in com o gradient da referência (ds-deal-aberto.html).
          A REFERÊNCIA NÃO TEM BACKDROP SEMI-TRANSPARENTE: a página toma a tela inteira
          com o gradient sólido. Mantemos esse comportamento aqui (sem backdrop).
          Fallback hexa duplica os valores caso var(--bg-*) não resolva (Tailwind v4
          às vezes não expõe tokens de @theme em inline styles). */}
      <div
        className={`fixed inset-0 z-50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background:
            "linear-gradient(135deg, var(--bg-base, #dde8f5) 0%, var(--bg-mesh-1, #b8cfec) 40%, var(--bg-mesh-2, #e8d5f0) 70%, var(--bg-base, #dde8f5) 100%)",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="flex h-full flex-col gap-3.5 overflow-hidden p-4">
          {/* HEADER PRINCIPAL */}
          <header
            className="flex items-center gap-[18px] rounded-[var(--radius-xl)] border px-[22px] py-3.5"
            style={{
              background: "var(--glass-bg-strong)",
              backdropFilter: "blur(16px)",
              borderColor: "var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
              title="Voltar"
            >
              <IconArrowLeft size={18} />
            </button>

            {/* Contato */}
            <div className="flex items-center gap-3">
              <div
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[15px] font-bold text-white ${avatarClass}`}
              >
                {deal.initials}
                {deal.online && (
                  <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-white bg-[var(--color-online)]" />
                )}
              </div>
              <div>
                <div className="font-display text-base font-bold text-[var(--text-primary)]">{deal.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <IconBrandWhatsapp size={14} className="text-[var(--color-success)]" />
                  {deal.phone || "+55 11 98702-3902"}
                  <span className="mx-1">·</span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-display text-[10px] font-semibold"
                    style={{
                      background: "var(--color-success-bg)",
                      color: "var(--color-success-text)",
                      borderColor: "rgba(16,185,129,0.2)",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Pipeline progress */}
            {stageRibbonSlot ? (
              <div className="mx-6 flex-1" aria-label="Etapa do pipeline">{stageRibbonSlot}</div>
            ) : (
            <div className="mx-6 flex flex-1 items-center gap-1" aria-label="Etapa do pipeline">
              {STAGES.map((stage, idx) => {
                const done = idx < currentStageIndex
                const active = idx === currentStageIndex
                return (
                  <button
                    key={stage}
                    className="flex-1 truncate rounded-full border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.06em] transition-colors"
                    style={
                      active
                        ? {
                            background: "var(--brand-primary)",
                            color: "#fff",
                            borderColor: "var(--brand-primary-dark)",
                            boxShadow: "0 4px 12px rgba(91,111,245,0.35)",
                          }
                        : done
                          ? {
                              background: "var(--color-success-bg)",
                              color: "var(--color-success-text)",
                              borderColor: "rgba(16,185,129,0.25)",
                            }
                          : {
                              background: "var(--glass-bg)",
                              color: "var(--text-muted)",
                              borderColor: "var(--glass-border)",
                            }
                    }
                  >
                    {stage}
                  </button>
                )
              })}
            </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-display text-[13px] font-semibold transition-colors"
                style={{
                  background: "linear-gradient(135deg, rgba(91,111,245,0.10), rgba(167,139,250,0.10))",
                  borderColor: "rgba(91,111,245,0.25)",
                  color: "var(--brand-primary)",
                }}
              >
                <IconPhone size={15} />
                Ligar
                <IconChevronDown size={12} className="opacity-70" />
              </button>
              {winButtonSlot ?? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
                  style={{
                    background: "var(--color-success)",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.30)",
                  }}
                >
                  <IconTrophy size={14} />
                  Ganhar
                </button>
              )}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border text-[var(--text-primary)] transition-colors"
                style={{
                  background: "var(--glass-bg-strong)",
                  borderColor: "var(--glass-border)",
                  boxShadow: "var(--glass-shadow-sm)",
                }}
                title="Buscar"
              >
                <IconSearch size={16} />
              </button>
              {moreActionsSlot ?? (
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border text-[var(--text-primary)] transition-colors"
                  style={{
                    background: "var(--glass-bg-strong)",
                    borderColor: "var(--glass-border)",
                    boxShadow: "var(--glass-shadow-sm)",
                  }}
                  title="Mais"
                >
                  <IconDotsVertical size={16} />
                </button>
              )}
            </div>
          </header>

          {/* TABS */}
          <div className="flex items-center gap-3.5 px-1">
            <div
              className="inline-flex gap-0.5 rounded-[var(--radius-md)] border p-1"
              style={{ background: "var(--glass-bg-subtle)", borderColor: "var(--glass-border-subtle)" }}
              role="tablist"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-4 py-1.5 font-display text-[13px] font-semibold transition-colors"
                    style={
                      isActive
                        ? {
                            background: "var(--glass-bg-overlay)",
                            color: "var(--brand-primary)",
                            border: "1px solid var(--glass-border)",
                            boxShadow: "var(--glass-shadow-sm)",
                          }
                        : { color: "var(--text-muted)", background: "transparent" }
                    }
                  >
                    <Icon size={14} />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-px text-center font-display text-[10px] font-bold"
                        style={
                          isActive
                            ? { background: "var(--color-enterprise-bg)", color: "var(--brand-primary)" }
                            : { background: "rgba(163,163,163,0.15)", color: "var(--text-muted)" }
                        }
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2 COLUNAS: SIDEBAR + CHAT */}
          <div className="grid flex-1 grid-cols-[320px_1fr] gap-4 overflow-hidden">
            {/* SIDEBAR ESQUERDA */}
            <aside
              className="flex flex-col gap-[18px] overflow-y-auto rounded-[var(--radius-xl)] border p-5"
              style={{
                background: "var(--glass-bg-strong)",
                backdropFilter: "blur(16px)",
                borderColor: "var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              {/* NEGÓCIO */}
              <SidebarSection
                title="Negócio"
                action={
                  <button
                    className="inline-flex items-center gap-1 font-display text-[11px] font-semibold text-[var(--brand-primary)] hover:underline"
                    type="button"
                  >
                    <IconLayoutGrid size={13} />
                    Layout personalizado
                  </button>
                }
              >
                <DetailRow label="Responsável">
                  {ownerSlot ?? (
                    <span className="inline-flex cursor-pointer items-center gap-1.5 italic text-[var(--text-muted)]">
                      {deal.owner?.name || "Sem responsável"}
                      <IconChevronDown size={12} />
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="Origem">
                  {sourceSlot ?? (
                    <span className="inline-flex cursor-pointer items-center gap-1.5 font-display font-semibold text-[var(--text-primary)]">
                      Whatsapp-Dina-7367
                      <IconPencil size={12} className="opacity-50" />
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="Previsão">
                  {forecastSlot ?? (
                    <span className="cursor-pointer italic text-[var(--text-muted)]">Indefinida</span>
                  )}
                </DetailRow>
                <DetailRow label="Tags" noBorder>
                  {tagsSlot ?? (
                    <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-[rgba(163,163,163,0.40)] px-2.5 py-0.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                      <IconPlus size={10} />
                      Adicionar
                    </span>
                  )}
                </DetailRow>
              </SidebarSection>

              {/* CONTATO */}
              <SidebarSection
                title="Contato"
                action={
                  <SectionActionButton title="Editar">
                    <IconPencil size={14} />
                  </SectionActionButton>
                }
              >
                <DetailRow label="Telefone">
                  <span className="cursor-pointer font-display font-semibold text-[var(--brand-primary)]">
                    {deal.phone || "+5511987023902"}
                  </span>
                </DetailRow>
                <DetailRow label="Email" noBorder>
                  <span className="cursor-pointer italic text-[var(--text-muted)]">Adicionar</span>
                </DetailRow>
              </SidebarSection>

              {/* CAMPOS DO NEGÓCIO */}
              <SidebarSection
                title="Campos do negócio"
                action={
                  <SectionActionButton title="Editar campos">
                    <IconPencil size={14} />
                  </SectionActionButton>
                }
              >
                <div className="flex flex-col">
                  {FIELD_GROUPS.map((field) => {
                    const open = openFieldGroup === field
                    return (
                      <div
                        key={field}
                        className="border-b pb-1.5"
                        style={{ borderColor: "var(--glass-border-subtle)" }}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFieldGroup(open ? null : field)}
                          className="flex w-full items-center justify-between py-2 font-display text-[13px] font-semibold transition-colors hover:text-[var(--brand-primary)]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <span>{field}</span>
                          <IconPlus
                            size={14}
                            className="transition-transform"
                            style={{
                              transform: open ? "rotate(45deg)" : "rotate(0deg)",
                              color: open ? "var(--brand-primary)" : "var(--text-muted)",
                            }}
                          />
                        </button>
                        {open && (
                          <div className="flex flex-col gap-1.5 pb-1.5 pt-0.5">
                            <DetailRow label="Valor" noBorder>
                              <span className="font-display font-semibold text-[var(--text-primary)]">
                                28 anos
                              </span>
                            </DetailRow>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </SidebarSection>
            </aside>

            {/* CHAT */}
            <main
              className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(16px)",
                borderColor: "var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
              aria-label="Conversa"
            >
              {/* Header canal */}
              <div
                className="flex items-center justify-between border-b px-[22px] py-3.5"
                style={{ background: "var(--glass-bg-overlay)", borderColor: "var(--glass-border)" }}
              >
                <div className="flex items-center gap-2.5 font-display text-[13px] font-semibold text-[var(--text-secondary)]">
                  <div
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full border"
                    style={{
                      background: "var(--color-success-bg)",
                      borderColor: "rgba(16,185,129,0.25)",
                      color: "var(--color-success)",
                    }}
                  >
                    <IconBrandWhatsapp size={14} />
                  </div>
                  <div>
                    <div>WhatsApp Business</div>
                    <div className="mt-px text-[11px] font-normal text-[var(--text-muted)]">
                      Última atividade · 14/05/2026 às 15:24
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <ChatHeaderIconBtn title="Pesquisar na conversa">
                    <IconSearch size={16} />
                  </ChatHeaderIconBtn>
                  <ChatHeaderIconBtn title="Filtrar">
                    <IconFilter size={16} />
                  </ChatHeaderIconBtn>
                  <ChatHeaderIconBtn title="Atualizar">
                    <IconRefresh size={16} />
                  </ChatHeaderIconBtn>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-[22px]">
                <div
                  className="self-center rounded-full border px-3.5 py-1 font-display text-[11px] font-bold"
                  style={{
                    background: "var(--color-success-bg)",
                    color: "var(--color-success-text)",
                    borderColor: "rgba(16,185,129,0.2)",
                  }}
                >
                  14/05/2026
                </div>

                {/* Bubble incoming with file */}
                <div className="flex items-end gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[11px] font-bold text-white ${avatarClass}`}
                  >
                    {deal.initials}
                  </div>
                  <div className="flex items-end gap-2">
                    <div
                      className="flex min-w-[320px] items-center gap-3.5 rounded-[var(--radius-lg)] border px-[18px] py-3.5"
                      style={{
                        background: "var(--glass-bg-overlay)",
                        backdropFilter: "blur(8px)",
                        borderColor: "var(--glass-border)",
                        boxShadow: "var(--glass-shadow-sm)",
                      }}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
                        }}
                      >
                        <IconFileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-sm font-bold text-[var(--text-primary)]">
                          Currículo Renato.pdf
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          Arquivo PDF · 1.2 MB
                        </div>
                      </div>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border transition-colors"
                        style={{
                          background: "var(--color-enterprise-bg)",
                          color: "var(--brand-primary)",
                          borderColor: "rgba(91,111,245,0.2)",
                        }}
                        title="Baixar"
                      >
                        <IconDownload size={14} />
                      </button>
                    </div>
                    <span className="self-end text-[11px] text-[var(--text-muted)]">15:24</span>
                  </div>
                </div>

                {/* Outgoing — fallback hex garante o gradiente mesmo se
                    Tailwind v4 não resolver `var(--brand-primary*)` no
                    inline style (ex.: pré-hidratação). */}
                <div className="flex flex-row-reverse items-end gap-2.5">
                  <div
                    className="max-w-[70%] rounded-[var(--radius-lg)] px-[15px] py-2.5 text-[13.5px] leading-[1.55] text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--brand-primary, #5b6ff5) 0%, var(--brand-primary-dark, #3d52e8) 100%)",
                      borderBottomRightRadius: "var(--radius-sm)",
                      boxShadow: "0 4px 16px rgba(91,111,245,0.35)",
                    }}
                  >
                    Olá, {deal.name.split(" ")[0]}! Recebi seu currículo. Vou analisar e retorno até amanhã com os
                    próximos passos.
                    <span className="mt-1 block text-right text-[10px] opacity-60">15:32</span>
                  </div>
                </div>

                {/* Incoming */}
                <div className="flex items-end gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[11px] font-bold text-white ${avatarClass}`}
                  >
                    {deal.initials}
                  </div>
                  <div
                    className="max-w-[70%] rounded-[var(--radius-lg)] border px-[15px] py-2.5 text-[13.5px] leading-[1.55] text-[var(--text-primary)]"
                    style={{
                      background: "var(--glass-bg-overlay)",
                      backdropFilter: "blur(8px)",
                      borderColor: "var(--glass-border)",
                      borderBottomLeftRadius: "var(--radius-sm)",
                      boxShadow: "var(--glass-shadow-sm)",
                    }}
                  >
                    Perfeito! Fico no aguardo. Se precisar de mais alguma documentação, me avise.
                    <span className="mt-1 block text-right text-[10px] opacity-60">15:35</span>
                  </div>
                </div>
              </div>

              {/* Sessão alerta */}
              <div
                className="mx-[22px] mb-3 flex items-center gap-3.5 rounded-[var(--radius-lg)] border px-[18px] py-3.5"
                style={{
                  background: "rgba(254, 226, 226, 0.5)",
                  backdropFilter: "blur(8px)",
                  borderColor: "rgba(239,68,68,0.2)",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    borderColor: "rgba(239,68,68,0.2)",
                    color: "var(--color-danger)",
                  }}
                >
                  <IconAlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-[13px] font-bold text-[var(--color-danger-text)]">
                    Sessão de 24h encerrada
                  </div>
                  <div className="mt-px text-xs text-[var(--text-secondary)]">
                    Só templates aprovados pelo WhatsApp
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-white"
                  style={{
                    background: "var(--brand-primary)",
                    boxShadow: "0 4px 14px rgba(91,111,245,0.35)",
                  }}
                >
                  <IconTemplate size={14} />
                  Usar Template
                </button>
              </div>

              {/* Input */}
              <div
                className="mx-[22px] mb-[22px] flex items-center gap-2 rounded-[var(--radius-2xl)] border py-2 pl-4 pr-2 opacity-60"
                style={{
                  background: "var(--glass-bg-strong)",
                  backdropFilter: "blur(16px)",
                  borderColor: "var(--glass-border)",
                  boxShadow: "var(--glass-shadow-sm)",
                }}
              >
                <ChatInputBtn title="Anexar">
                  <IconPaperclip size={17} />
                </ChatInputBtn>
                <ChatInputBtn title="Emoji">
                  <IconMoodSmile size={17} />
                </ChatInputBtn>
                <input
                  type="text"
                  placeholder="Sessão expirada. Envie um template..."
                  disabled
                  className="flex-1 border-none bg-transparent text-sm italic text-[var(--text-primary)] outline-none placeholder:italic placeholder:text-[var(--text-muted)]"
                />
                <ChatInputBtn title="Áudio">
                  <IconMicrophone size={17} />
                </ChatInputBtn>
                <button
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-white transition-transform hover:scale-105"
                  style={{
                    background: "var(--brand-primary)",
                    boxShadow: "0 4px 14px rgba(91,111,245,0.35)",
                  }}
                  title="Enviar"
                >
                  <IconSend size={17} />
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── Subcomponentes locais ─── */

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
      <div
        className="mb-1 flex items-center justify-between border-b pb-1.5"
        style={{ borderColor: "var(--glass-border-subtle)" }}
      >
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

function DetailRow({
  label,
  children,
  noBorder = false,
}: {
  label: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div
      className={`flex min-h-8 items-center justify-between gap-2.5 py-1.5 text-[13px] ${
        noBorder ? "" : "border-b border-white/20"
      }`}
    >
      <span className="font-normal text-[var(--text-muted)]">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function SectionActionButton({
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
      className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-transparent text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
}

function ChatHeaderIconBtn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border text-[var(--text-primary)] transition-colors"
      style={{
        background: "var(--glass-bg-strong)",
        borderColor: "var(--glass-border)",
        boxShadow: "var(--glass-shadow-sm)",
      }}
    >
      {children}
    </button>
  )
}

function ChatInputBtn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-transparent text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
    >
      {children}
    </button>
  )
}
