"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Chip } from "./chip"
import { IconChevronDown, IconBriefcase, IconTag, IconCurrencyDollar, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand } from "@tabler/icons-react"

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
    stageId?: string | null
    pipelineId?: string | null
    productName?: string | null
    /** Segmentos reais do funil — fornecidos pelo client (useDealDetail + useBoard). */
    funnelSegments?: { id: string; name: string; color: string; position: number }[]
    /** Dropdown funcional de troca de fase — montado externamente no client. */
    stageDropdownSlot?: React.ReactNode
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
  /** Estado recolhido — quando true exibe apenas a aba lateral com o botao de toggle */
  collapsed?: boolean
  /** Callback disparado ao clicar no botao de toggle */
  onToggleCollapse?: () => void
}

const PLACEHOLDER = "—"
const MAX_DEAL_FIELDS_VISIBLE = 4

const isFilled = (v: string | undefined | null): v is string =>
  !!v && v !== PLACEHOLDER

const formatCurrency = (v: number) =>
  v ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : PLACEHOLDER

export function ContactAside({ contact, className, headerActionsNode, tagsNode, collapsed = false, onToggleCollapse }: ContactAsideProps) {
  const [showAllPanelFields, setShowAllPanelFields] = useState(false)

  const course = contact.course ?? contact.product
  const deals = contact.deals ?? []

  const panelFields = contact.panelFields ?? []
  const visiblePanelFields = showAllPanelFields ? panelFields : panelFields.slice(0, MAX_DEAL_FIELDS_VISIBLE)
  const hasMorPanelFields = panelFields.length > MAX_DEAL_FIELDS_VISIBLE

  /* ── Estado recolhido: faixa vertical com botao de expansao ─── */
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
      className={cn("flex flex-col gap-3.5 overflow-y-auto pr-0.5", className)}
    >
      {/* ── Cartao principal ──────────────────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-[22px] backdrop-blur-md shadow-[var(--glass-shadow)]">

        {/* Nome + botao de colapso */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
              {contact.name}
            </div>
            <div className="mt-px font-display text-xs text-[var(--text-muted)]">
              #{contact.contactId}
            </div>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              title="Recolher painel de contato"
              onClick={onToggleCollapse}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
              aria-label="Recolher painel de contato"
            >
              <IconLayoutSidebarRightCollapse size={17} />
            </button>
          )}
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

        {/* Produto / Curso */}
        {isFilled(course) && (
          <>
            <SubLabel>Produto</SubLabel>
            <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-[18px] py-3.5">
              <Row label="Produto" value={course} isLast />
              {isFilled(contact.formation) && <Row label="Formacao" value={contact.formation} isLast />}
              {isFilled(contact.entry) && (
                <Row label="Entrada" isLast>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent font-display text-xs font-bold text-[var(--text-primary)]"
                  >
                    {contact.entry}
                    <IconChevronDown size={14} className="text-[var(--text-muted)]" />
                  </button>
                </Row>
              )}
            </div>
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
            <Row label="Email" value={contact.email} valueStyle={{ color: "var(--brand-primary)", fontSize: 12 }} />
          )}
          {isFilled(contact.cpf) && <Row label="CPF" value={contact.cpf} />}
          {isFilled(contact.rg) && <Row label="RG" value={contact.rg} />}
          {isFilled(contact.cep) && <Row label="CEP" value={contact.cep} />}
          {isFilled(contact.addressNumber) && <Row label="N Residencia" value={contact.addressNumber} />}
          {isFilled(contact.birthDate) && <Row label="Data de Nascimento" value={contact.birthDate} isLast />}
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
                {showAllPanelFields ? "Mostrar menos" : `Mostrar mais (${panelFields.length - MAX_DEAL_FIELDS_VISIBLE})`}
                <IconChevronDown size={13} className={cn("transition-transform", showAllPanelFields && "rotate-180")} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Negocios vinculados (subidos para logo apos o cartao de contato) ── */}
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

  // Segmentos reais do funil — fornecidos pelo client via prop.
  const segments = deal.funnelSegments
  const sortedSegments = segments
    ? [...segments].sort((a, b) => a.position - b.position)
    : null
  const currentSegIdx = sortedSegments
    ? sortedSegments.findIndex((s) => s.id === deal.stageId)
    : -1

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]">
      {/* Header do negocio */}
      <div className="flex items-start gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)]">
          <IconBriefcase size={16} className="text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Título + dropdown de fase na mesma linha */}
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
              {deal.title}
            </p>
            {deal.stageDropdownSlot ? (
              <div className="shrink-0">{deal.stageDropdownSlot}</div>
            ) : (
              <span className="shrink-0 font-display text-[11px] text-[var(--text-muted)]">
                {deal.stageName ?? "Sem estagio"}
              </span>
            )}
          </div>
        </div>
        {deal.value > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-bg,rgba(16,185,129,0.10))] px-2.5 py-1 font-display text-[11px] font-bold text-[var(--color-success,#059669)]">
            <IconCurrencyDollar size={12} />
            {deal.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Progresso do estagio — segmentos reais ou fallback vazio */}
      {sortedSegments && sortedSegments.length > 0 && (
        <div className="flex gap-1 px-5 pt-3">
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
