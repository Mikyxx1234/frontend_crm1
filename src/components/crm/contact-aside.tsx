"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { AvatarGlass } from "./avatar-glass"
import { Chip } from "./chip"
import { TabsGlass } from "./tabs-glass"
import { StatusPill } from "./status-pill"
import { GlassCard } from "./glass-card"

interface ContactDetails {
  name: string
  initials: string
  avatarColor: 'blue' | 'teal' | 'orange' | 'purple' | 'pink' | 'coral'
  status: 'online' | 'offline' | 'none'
  contactId: string
  assignee?: string
  financialStatus: 'success' | 'lead' | 'enterprise'
  financialLabel: string
  product: string
  origin: string
  formation: string
  entry: string
  phone: string
  email: string
  cpf: string
  rg: string
  cep: string
  addressNumber: string
  birthDate: string
  createdAt: string
  tag: string
  note?: string
  activities: {
    text: string
    time: string
    color?: string
  }[]
}

interface ContactAsideProps {
  contact: ContactDetails
  className?: string
}

export function ContactAside({ contact, className }: ContactAsideProps) {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ["Perfil", "Informações", "Dados", "Notas"]

  return (
    <aside
      aria-label="Detalhes do contato"
      className={cn("flex flex-col gap-3.5 overflow-y-auto", className)}
    >
      <GlassCard className="p-[18px]">
        {/* Header */}
        <div className="mb-3.5 flex flex-col items-center gap-2 border-b border-[var(--glass-border-subtle)] pb-3.5">
          <AvatarGlass
            initials={contact.initials}
            size="lg"
            color={contact.avatarColor}
            status={contact.status}
          />
          <div className="flex flex-col items-center gap-1">
            <div className="font-display text-base font-bold text-[var(--text-primary)]">
              {contact.name}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">#{contact.contactId}</div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {contact.assignee && <Chip variant="brand">{contact.assignee}</Chip>}
            <Chip variant="ghost">+Responsável</Chip>
          </div>
        </div>

        {/* Tabs */}
        <TabsGlass
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-3.5"
        />

        {/* Status Section */}
        <SectionLabel>Status</SectionLabel>
        <DetailRow label="Financeiro">
          <StatusPill variant={contact.financialStatus} className="px-2.5 py-0.5 text-[10px]">
            {contact.financialLabel}
          </StatusPill>
        </DetailRow>
        <DetailRow label="Produto" value={contact.product} />
        <DetailRow label="Origem" value={contact.origin} />
        <DetailRow label="Formação" value={contact.formation} />
        <DetailRow label="Entrada" value={contact.entry} />

        {/* Contact Details Section */}
        <SectionLabel>Detalhes de contato</SectionLabel>
        <DetailRow label="Telefone" value={contact.phone} />
        <DetailRow label="Email" value={contact.email} valueClassName="text-[11px]" />
        <DetailRow label="CPF" value={contact.cpf} />
        <DetailRow label="RG" value={contact.rg} />
        <DetailRow label="CEP" value={contact.cep} />
        <DetailRow label="N° Residência" value={contact.addressNumber} />
        <DetailRow label="Data Nascimento" value={contact.birthDate} />
        <DetailRow label="Data Criação" value={contact.createdAt} />
        <DetailRow label="Tag" value={contact.tag} isLast />

        {/* Note */}
        {contact.note && (
          <>
            <SectionLabel>Nota</SectionLabel>
            <div className="rounded-[var(--radius-md)] border border-yellow-300/20 border-l-[3px] border-l-[var(--color-warning)] bg-yellow-50/45 px-3.5 py-3 text-[12.5px] italic leading-relaxed text-[var(--text-secondary)] backdrop-blur-sm">
              {contact.note}
            </div>
          </>
        )}

        {/* Activity */}
        <SectionLabel>Atividade recente</SectionLabel>
        {contact.activities.map((activity, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-2.5 py-2",
              index < contact.activities.length - 1 && "border-b border-white/25"
            )}
          >
            <div
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: activity.color || 'var(--brand-primary)' }}
            />
            <div className="flex-1">
              <div className="text-[12.5px] text-[var(--text-primary)]">{activity.text}</div>
              <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{activity.time}</div>
            </div>
          </div>
        ))}
      </GlassCard>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-3.5 font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </div>
  )
}

interface DetailRowProps {
  label: string
  value?: string
  valueClassName?: string
  children?: React.ReactNode
  isLast?: boolean
}

function DetailRow({ label, value, valueClassName, children, isLast }: DetailRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 py-1.5 text-[13px]",
        !isLast && "border-b border-white/25"
      )}
    >
      <span className="text-[var(--text-muted)]">{label}</span>
      {children || (
        <span className={cn("text-right font-display font-semibold text-[var(--text-primary)]", valueClassName)}>
          {value}
        </span>
      )}
    </div>
  )
}
