"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  IconChevronDown,
  IconBriefcase,
  IconTag,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
} from "@tabler/icons-react"

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface ContactDetails {
  name: string
  contactId: string
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
    value: number
    stageName?: string | null
    stageId?: string | null
    pipelineId?: string | null
    productName?: string | null
    funnelSegments?: { id: string; name: string; color: string; position: number }[]
    stageDropdownSlot?: React.ReactNode
    customFields?: { fieldId: string; label: string; value: string | null }[]
  }[]
  // campos legados
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
  panelFields?: { fieldId: string; label: string; value: string; type: string }[]
}

interface ContactAsideProps {
  contact: ContactDetails
  className?: string
  headerActionsNode?: React.ReactNode
  tagsNode?: React.ReactNode
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const PLACEHOLDER = "—"
const MAX_DEAL_FIELDS_VISIBLE = 4

const isFilled = (v: string | undefined | null): v is string =>
  !!v && v !== PLACEHOLDER

const formatCurrency = (v: number) =>
  v ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : PLACEHOLDER

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
// DealInline — negocio embutido dentro do card unico da aside
// (declarado ANTES de ContactAside para evitar referencia antecipada)
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
  const [showAll, setShowAll] = useState(false)
  const fields = deal.customFields ?? []
  const visibleFields = showAll ? fields : fields.slice(0, MAX_DEAL_FIELDS_VISIBLE)
  const hasMore = fields.length > MAX_DEAL_FIELDS_VISIBLE

  const segments = deal.funnelSegments
  const sortedSegments = segments ? [...segments].sort((a, b) => a.position - b.position) : null
  const currentSegIdx = sortedSegments ? sortedSegments.findIndex((s) => s.id === deal.stageId) : -1

  const productName = deal.productName ?? course ?? null

  return (
    <div className="border-b border-[var(--glass-border-subtle)]">
      {/* Header do negocio */}
      <div className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)]">
          <IconBriefcase size={16} className="text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Titulo em linha propria, sem truncate agressivo */}
          <p className="font-display text-[14px] font-bold leading-snug text-[var(--text-primary)]">
            {deal.title}
          </p>
          {/* Estagio abaixo do titulo */}
          <div className="relative mt-1">
            {deal.stageDropdownSlot ?? (
              <span className="font-display text-[11px] text-[var(--text-muted)]">
                {deal.stageName ?? "Sem estagio"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progresso do funil */}
      {sortedSegments && sortedSegments.length > 0 && (
        <div className="flex gap-1 px-5 pb-3">
          {sortedSegments.map((seg, i) => (
            <span
              key={seg.id}
              title={seg.name}
              className="h-[4px] flex-1 rounded-full transition-colors"
              style={{
                background: seg.color || "var(--brand-primary)",
                opacity: i <= currentSegIdx ? 1 : 0.18,
              }}
            />
          ))}
        </div>
      )}

      {/* Produto — destaque dentro do negocio */}
      {productName && (
        <div className="mx-5 mb-4 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-4 py-3">
          <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Produto
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <IconTag size={14} className="shrink-0 text-[var(--brand-primary)]" />
              <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                {productName}
              </span>
            </div>
            {deal.value > 0 && (
              <span className="shrink-0 font-display text-[13px] font-bold text-[var(--color-success,#059669)]">
                {formatCurrency(deal.value)}
              </span>
            )}
          </div>
          {isFilled(contact.formation) && (
            <p className="mt-1.5 font-display text-[11px] text-[var(--text-muted)]">
              {contact.formation}
            </p>
          )}
        </div>
      )}

      {/* Campos personalizados do negocio */}
      {fields.length > 0 && (
        <div className="px-5 pb-4">
          <SubLabel>Campos do negocio</SubLabel>
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
              <IconChevronDown size={13} className={cn("transition-transform", showAll && "rotate-180")} />
            </button>
          )}
        </div>
      )}
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
}: ContactAsideProps) {
  const [showAllPanelFields, setShowAllPanelFields] = useState(false)

  const course = contact.course ?? contact.product
  const deals = contact.deals ?? []

  const panelFields = contact.panelFields ?? []
  const visiblePanelFields = showAllPanelFields ? panelFields : panelFields.slice(0, MAX_DEAL_FIELDS_VISIBLE)
  const hasMorPanelFields = panelFields.length > MAX_DEAL_FIELDS_VISIBLE

  /* ── Estado recolhido ─────────────────────────────────────────── */
  if (collapsed) {
    return (
      <aside
        aria-label="Detalhes do contato (recolhido)"
        className={cn(
          "flex h-full flex-col items-center justify-start rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pt-3 backdrop-blur-md shadow-[var(--glass-shadow)]",
          className,
        )}
      >
        <button
          type="button"
          title="Expandir painel de contato"
          onClick={onToggleCollapse}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
          aria-label="Expandir painel de contato"
        >
          <IconLayoutSidebarRightExpand size={18} />
        </button>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Detalhes do contato"
      className={cn("flex flex-col overflow-y-auto pr-0.5", className)}
    >
      {/* Card unico que envolve tudo */}
      <div className="relative flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]">

        {/* Botao de colapso — absoluto para nao gerar espaco */}
        {onToggleCollapse && (
          <button
            type="button"
            title="Recolher painel de contato"
            onClick={onToggleCollapse}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
            aria-label="Recolher painel de contato"
          >
            <IconLayoutSidebarRightCollapse size={15} />
          </button>
        )}

        {/* Negocios vinculados — topo do card */}
        {deals.map((deal) => (
          <DealInline key={deal.id} deal={deal} course={course} contact={contact} />
        ))}

        {/* Detalhes de Contato */}
        <div className="px-5 pb-5">
          <SubLabel>Detalhes de Contato</SubLabel>
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-[18px] py-1">
            <Row label="Nome" value={contact.name} />
            {isFilled(contact.phone) && (
              <Row label="Telefone" valueStyle={{ color: "var(--brand-primary)" }} value={contact.phone} />
            )}
            {isFilled(contact.email) && (
              <Row label="Email" value={contact.email} valueStyle={{ color: "var(--brand-primary)", fontSize: 12 }} />
            )}
            {isFilled(contact.cpf) && <Row label="CPF" value={contact.cpf} />}
            {isFilled(contact.rg) && <Row label="RG" value={contact.rg} />}
            {isFilled(contact.cep) && <Row label="CEP" value={contact.cep} />}
            {isFilled(contact.addressNumber) && <Row label="N Residencia" value={contact.addressNumber} />}
            {isFilled(contact.birthDate) && <Row label="Data de Nascimento" value={contact.birthDate} isLast />}
          </div>

          {/* Campos personalizados do contato */}
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
                  {showAllPanelFields ? "Mostrar menos" : `Mostrar mais (${panelFields.length - MAX_DEAL_FIELDS_VISIBLE})`}
                  <IconChevronDown size={13} className={cn("transition-transform", showAllPanelFields && "rotate-180")} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
