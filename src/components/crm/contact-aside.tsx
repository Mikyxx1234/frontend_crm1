"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Chip } from "./chip"
import { BadgeGlass } from "./badge-glass"
import { IconChevronDown } from "@tabler/icons-react"

/**
 * Shape estendido — combina os campos exibidos no NOVO design (zip v2)
 * com os campos legados produzidos pelo `toContactAside` do
 * `inbox-v2/adapters.ts` para garantir retrocompat sem perder dados.
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

  // Novos campos visuais
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

  // Campos legados aceitos para retrocompat (toContactAside).
  // Quando `statusBadge` nao for fornecido, derivamos de financialStatus.
  financialStatus?: "success" | "lead" | "enterprise"
  financialLabel?: string
  product?: string
  origin?: string
  createdAt?: string
  tag?: string
  // Campos visuais antigos — ignorados pelo render novo
  initials?: string
  avatarColor?: string
  status?: string
  activities?: { text: string; time: string; color?: string }[]
}

interface ContactAsideProps {
  contact: ContactDetails
  className?: string
  /**
   * Slot opcional que substitui INTEIRAMENTE a linha "Responsável"
   * no header — use para plugar o `AssigneePopover` real.
   */
  headerActionsNode?: React.ReactNode
  /**
   * Slot opcional para exibir tags + popover de gerenciamento
   * em uma linha separada "Tags".
   */
  tagsNode?: React.ReactNode
}

const PLACEHOLDER = "—"
const isFilled = (v: string | undefined | null): v is string =>
  !!v && v !== PLACEHOLDER

export function ContactAside({ contact, className, headerActionsNode, tagsNode }: ContactAsideProps) {
  const [activeView, setActiveView] = useState<"produto" | "perfil">("perfil")
  const [activeTab, setActiveTab] = useState<"informacoes" | "dados">("informacoes")

  const segs = contact.stageSegments ?? 5
  const activeIdx = contact.stageActiveIndex ?? 0

  // Deriva o badge a partir do shape legado quando o novo nao foi
  // explicitamente fornecido.
  const badge =
    contact.statusBadge ??
    (contact.financialStatus && contact.financialLabel
      ? { variant: contact.financialStatus, label: contact.financialLabel }
      : undefined)

  const course = contact.course ?? contact.product

  return (
    <aside
      aria-label="Detalhes do contato"
      className={cn("flex flex-col gap-3.5 overflow-y-auto pr-0.5", className)}
    >
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

        {/* Responsável */}
        <Row label="Responsável" className="mt-3.5">
          {headerActionsNode ?? (
            contact.assignee ? (
              <Chip variant="brand">{contact.assignee}</Chip>
            ) : (
              <Chip variant="ghost">+Responsável</Chip>
            )
          )}
        </Row>

        {/* Tags */}
        {tagsNode && (
          <Row label="Tags">
            {tagsNode}
          </Row>
        )}

        {/* Status */}
        {badge && (
          <Row label="Status">
            <BadgeGlass variant={badge.variant}>{badge.label}</BadgeGlass>
          </Row>
        )}

        {/* Stage progress bar laranja */}
        <div className="mt-3 flex gap-1">
          {Array.from({ length: segs }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] flex-1 rounded-full",
                i <= activeIdx ? "bg-[var(--color-lead)]" : "bg-black/[0.12]",
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
                  : "border-black/[0.06] bg-white text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-strong)]",
              )}
            >
              {view === "produto" ? "Produto" : "Perfil"}
            </button>
          ))}
        </div>

        {/* Tabs underline */}
        <div className="mb-3.5 mt-4 flex gap-1.5 border-b border-black/[0.06]">
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
              {tab === "informacoes" ? "INFORMAÇÕES" : "DADOS"}
            </button>
          ))}
        </div>

        {/* Nota */}
        {contact.note && (
          <div className="rounded-[var(--radius-lg)] border border-black/[0.04] bg-[var(--glass-bg-overlay)] p-4">
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
            {isFilled(contact.formation) && <Row label="Formação" value={contact.formation} />}
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
        <div className="rounded-[var(--radius-lg)] border border-black/[0.04] bg-white px-[18px] py-3.5">
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
            <Row label="N° Residência" value={contact.addressNumber} />
          )}
          {isFilled(contact.birthDate) && (
            <Row label="Data de Nascimento" value={contact.birthDate} isLast />
          )}
        </div>
      </div>
    </aside>
  )
}

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
        !isLast && "border-b border-black/[0.05]",
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
