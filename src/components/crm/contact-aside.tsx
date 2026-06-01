"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Chip } from "./chip"
import { BadgeGlass } from "./badge-glass"
import { IconChevronDown, IconBriefcase, IconTag, IconCurrencyDollar } from "@tabler/icons-react"

/**
 * Shape estendido — combina os campos do design v2 com os campos
 * legados produzidos pelo `toContactAside` do `inbox-v2/adapters.ts`.
 */
export interface ContactDetails {
  name: string
  contactId: string
  assignee?: string

  /** Badge no header — derivada de financialStatus quando ausente. */
  statusBadge?: { variant: "lead" | "enterprise" | "success"; label: string }

  /** Stage progress: number of segments and active index (0-based) */
  stageSegments?: number
  stageActiveIndex?: number

  // Campos de contato
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

  /** Negocios vinculados ao contato */
  deals?: {
    id: string
    title: string
    value: number
    stageName?: string | null
    productName?: string | null
    stageCount?: number
    stageIndex?: number
    /** Campos personalizados do negocio */
    customFields?: { fieldId: string; label: string; value: string | null }[]
  }[]

  // Campos legados — retrocompat com toContactAside
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
  /**
   * Campos personalizados mesclados (contato + deal ativo),
   * produzidos por toContactAside a partir de inboxLeadPanelFields e
   * dealInboxPanelFields.
   */
  panelFields?: { fieldId: string; label: string; value: string; type: string }[]
}

interface ContactAsideProps {
  contact: ContactDetails
  className?: string
  /** Slot para o AssigneePopover — substitui a linha "Responsavel" */
  headerActionsNode?: React.ReactNode
  /** Slot para chips de tags + TagsPopover */
  tagsNode?: React.ReactNode
}

const PLACEHOLDER = "—"
const MAX_DEAL_FIELDS_VISIBLE = 4

const isFilled = (v: string | undefined | null): v is string =>
  !!v && v !== PLACEHOLDER

const formatCurrency = (v: number) =>
  v ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : PLACEHOLDER

export function ContactAside({ contact, className, headerActionsNode, tagsNode }: ContactAsideProps) {
  const [activeView, setActiveView] = useState<"produto" | "perfil">("perfil")
  const [activeTab, setActiveTab] = useState<"informacoes" | "dados">("informacoes")
  const [showAllPanelFields, setShowAllPanelFields] = useState(false)

  const segs = contact.stageSegments ?? 5
  const activeIdx = contact.stageActiveIndex ?? 0

  const badge =
    contact.statusBadge ??
    (contact.financialStatus && contact.financialLabel
      ? { variant: contact.financialStatus, label: contact.financialLabel }
      : undefined)

  const course = contact.course ?? contact.product
  const deals = contact.deals ?? []

  const panelFields = contact.panelFields ?? []
  const visiblePanelFields = showAllPanelFields ? panelFields : panelFields.slice(0, MAX_DEAL_FIELDS_VISIBLE)
  const hasMorPanelFields = panelFields.length > MAX_DEAL_FIELDS_VISIBLE

  return (
    <aside
      aria-label="Detalhes do contato"
      className={cn("flex flex-col gap-3.5 overflow-y-auto pr-0.5", className)}
    >
      {/* ── Cartao principal ──────────────────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-[22px] backdrop-blur-md shadow-[var(--glass-shadow)]">
        {/* Nome + ID */}
        <div>
          <div className="font-display text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            {contact.name}
          </div>
          <div className="mt-px font-display text-xs text-[var(--text-muted)]">
            #{contact.contactId}
          </div>
        </div>

        {/* Responsavel */}
        <Row label="Responsavel" className="mt-3.5">
          {headerActionsNode ?? (
            contact.assignee ? (
              <Chip variant="brand">{contact.assignee}</Chip>
            ) : (
              <Chip variant="ghost">+Responsavel</Chip>
            )
          )}
        </Row>

        {/* Tags */}
        {tagsNode && <Row label="Tags">{tagsNode}</Row>}

        {/* Status */}
        {badge && (
          <Row label="Status">
            <BadgeGlass variant={badge.variant}>{badge.label}</BadgeGlass>
          </Row>
        )}

        {/* Stage progress bar */}
        <div className="mt-3 flex gap-1">
          {Array.from({ length: segs }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] flex-1 rounded-full",
                i <= activeIdx ? "bg-[var(--color-lead)]" : "bg-[var(--glass-border)]",
              )}
            />
          ))}
        </div>

        {/* Toggle Produto / Perfil */}
        <div className="mb-1.5 mt-4 grid grid-cols-2 gap-1.5">
          {(["produto", "perfil"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2.5 font-display text-[13px] font-bold transition-all",
                activeView === view
                  ? "border-[var(--brand-primary-dark)] bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.30)]"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-strong)]",
              )}
            >
              {view === "produto" ? "Produto" : "Perfil"}
            </button>
          ))}
        </div>

        {/* Tabs underline */}
        <div className="mb-3.5 mt-4 flex gap-1.5 border-b border-[var(--glass-border-subtle)]">
          {(["informacoes", "dados"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "-mb-px cursor-pointer border-b-2 bg-transparent px-3.5 py-2.5 font-display text-xs font-bold tracking-[0.08em] transition-all",
                activeTab === tab
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)]",
              )}
            >
              {tab === "informacoes" ? "INFORMACOES" : "DADOS"}
            </button>
          ))}
        </div>

        {/* Nota */}
        {contact.note && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-4">
            <div className="mb-2.5 flex items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.12em] text-[var(--brand-primary)]">
              <span className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
              NOTAS
            </div>
            <div className="text-[13px] italic leading-[1.6] text-[var(--text-secondary)]">
              {contact.note}
            </div>
          </div>
        )}

        {/* Detalhes Curso */}
        {(isFilled(course) || isFilled(contact.formation) || isFilled(contact.entry)) && (
          <>
            <SubLabel>Detalhes Curso</SubLabel>
            {isFilled(course) && <Row label="Curso" value={course} />}
            {isFilled(contact.formation) && <Row label="Formacao" value={contact.formation} />}
            {isFilled(contact.entry) && (
              <Row label="Entrada">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent font-display text-xs font-bold text-[var(--text-primary)]"
                >
                  {contact.entry}
                  <IconChevronDown size={14} className="text-[var(--text-muted)]" />
                </button>
              </Row>
            )}
          </>
        )}

        {/* Detalhes de Contato */}
        <SubLabel>Detalhes de Contato</SubLabel>
        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-[18px] py-3.5">
          <Row label="Nome" value={contact.name} />
          {isFilled(contact.phone) && (
            <Row label="Telefone" valueStyle={{ color: "var(--brand-primary)" }} value={contact.phone} />
          )}
          {isFilled(contact.email) && (
            <Row
              label="Email"
              value={contact.email}
              valueStyle={{ color: "var(--brand-primary)", fontSize: 12 }}
            />
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
        {/* Campos personalizados (inboxLeadPanelFields + dealInboxPanelFields) */}
        {panelFields.length > 0 && (
          <div className="mt-4">
            <SubLabel>Campos personalizados</SubLabel>
            <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)]">
              {visiblePanelFields.map((f, i) => (
                <div
                  key={f.fieldId}
                  className={cn(
                    "px-[14px] py-2.5",
                    i < visiblePanelFields.length - 1 && "border-b border-[var(--glass-border-subtle)]",
                  )}
                >
                  <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {f.label}
                  </p>
                  <p className="mt-0.5 font-display text-[13px] font-bold text-[var(--text-primary)]">
                    {f.value || PLACEHOLDER}
                  </p>
                </div>
              ))}
            </div>
            {hasMorPanelFields && (
              <button
                type="button"
                onClick={() => setShowAllPanelFields((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1 font-display text-[11.5px] font-semibold text-[var(--brand-primary)] transition-opacity hover:opacity-70"
              >
                {showAllPanelFields
                  ? "Mostrar menos"
                  : `Mostrar mais (${panelFields.length - MAX_DEAL_FIELDS_VISIBLE})`}
                <IconChevronDown
                  size={13}
                  className={cn("transition-transform", showAllPanelFields && "rotate-180")}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Negocios vinculados ───────────────────────────────────── */}
      {deals.length > 0 && deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────
// DealCard — negocio com estagio, produto, valor e campos custom
// ─────────────────────────────────────────────────────────────────

function DealCard({
  deal,
}: {
  deal: NonNullable<ContactDetails["deals"]>[number]
}) {
  const [showAll, setShowAll] = useState(false)
  const fields = deal.customFields ?? []
  const visibleFields = showAll ? fields : fields.slice(0, MAX_DEAL_FIELDS_VISIBLE)
  const hasMore = fields.length > MAX_DEAL_FIELDS_VISIBLE

  const stageSegs = deal.stageCount ?? 5
  const stageIdx = deal.stageIndex ?? 0

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]">
      {/* Header do negocio */}
      <div className="flex items-start gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)]">
          <IconBriefcase size={16} className="text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
            {deal.title}
          </p>
          <p className="mt-0.5 font-display text-[11px] text-[var(--text-muted)]">
            {deal.stageName ?? "Sem estagio"}
          </p>
        </div>
        {deal.value > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-bg,rgba(16,185,129,0.10))] px-2.5 py-1 font-display text-[11px] font-bold text-[var(--color-success,#059669)]">
            <IconCurrencyDollar size={12} />
            {deal.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Progresso do estagio */}
      <div className="flex gap-1 px-5 pt-3">
        {Array.from({ length: stageSegs }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-[4px] flex-1 rounded-full transition-colors",
              i <= stageIdx ? "bg-[var(--brand-primary)]" : "bg-[var(--glass-border)]",
            )}
          />
        ))}
      </div>

      {/* Produto */}
      {deal.productName && (
        <div className="flex items-center gap-2 px-5 py-3">
          <IconTag size={13} className="shrink-0 text-[var(--text-muted)]" />
          <span className="font-display text-[12px] text-[var(--text-secondary)]">
            {deal.productName}
          </span>
        </div>
      )}

      {/* Campos personalizados do negocio */}
      {fields.length > 0 && (
        <div className="px-5 pb-4">
          <SectionLabel>Campos do negocio</SectionLabel>
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)]">
            {visibleFields.map((f, i) => (
              <div
                key={f.fieldId}
                className={cn(
                  "flex items-center justify-between gap-3 px-[14px] py-2.5 text-[12.5px]",
                  i < visibleFields.length - 1 && "border-b border-[var(--glass-border-subtle)]",
                )}
              >
                <span className="shrink-0 font-medium text-[var(--text-muted)]">{f.label}</span>
                <span className="min-w-0 truncate text-right font-display font-bold text-[var(--text-primary)]">
                  {f.value ?? PLACEHOLDER}
                </span>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1 font-display text-[11.5px] font-semibold text-[var(--brand-primary)] transition-opacity hover:opacity-70"
            >
              {showAll ? "Mostrar menos" : `Mostrar mais (${fields.length - MAX_DEAL_FIELDS_VISIBLE})`}
              <IconChevronDown
                size={13}
                className={cn("transition-transform", showAll && "rotate-180")}
              />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers de layout
// ─────────────────────────────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-0 pb-1.5 pt-0 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      {children}
    </div>
  )
}

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
        <span
          className="font-display font-bold text-[var(--text-primary)]"
          style={valueStyle}
        >
          {value}
        </span>
      )}
    </div>
  )
}
