"use client"

import { useRef } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconCurrencyReal,
  IconBriefcase,
  IconTrophy,
  IconReceipt,
  IconArrowDownRight,
  IconArrowUpRight,
  IconCircleX,
  IconSparkles,
} from "@tabler/icons-react"
import { StatCard } from "@/components/crm/stat-card"
import { ButtonGlass } from "@/components/crm/button-glass"
import { HoverEffectGroup, HoverEffectItem } from "@/components/crm/dashboard/card-hover-effect"
import { formatCurrency } from "@/features/dashboard-v2/format"
import type { DealsOverview as DealsOverviewData } from "@/features/dashboard-v2/api"

const EMPTY_SUMMARY: DealsOverviewData["summary"] = {
  totalValue: 0,
  totalDeals: 0,
  winRate: 0,
  avgTicket: 0,
  deltas: { winRate: 0, avgTicket: 0 },
}

export function DealsOverview({ data }: { data: DealsOverviewData }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stages = data?.stages ?? []
  const summary = data?.summary ?? EMPTY_SUMMARY
  const newInPeriod = data?.newInPeriod ?? { count: 0, value: 0 }

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" })
  }

  const maxCount = Math.max(1, ...stages.map((s) => s.count))

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <HoverEffectGroup>
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <HoverEffectItem itemKey="kpi-valor" className="h-full">
            <StatCard
              icon={<IconCurrencyReal size={18} />}
              label="Valor total"
              value={formatCurrency(summary.totalValue)}
              accent="brand"
              caption="no funil ativo"
            />
          </HoverEffectItem>
          <HoverEffectItem itemKey="kpi-negocios" className="h-full">
            <StatCard
              icon={<IconBriefcase size={18} />}
              label="Negócios"
              value={String(summary.totalDeals)}
              accent="teal"
              caption="em andamento"
            />
          </HoverEffectItem>
          <HoverEffectItem itemKey="kpi-taxa" className="h-full">
            <StatCard
              icon={<IconTrophy size={18} />}
              label="Taxa de ganho"
              value={`${summary.winRate}%`}
              delta={summary.deltas.winRate}
              accent="success"
              caption="vs. período anterior"
            />
          </HoverEffectItem>
          <HoverEffectItem itemKey="kpi-ticket" className="h-full">
            <StatCard
              icon={<IconReceipt size={18} />}
              label="Ticket médio"
              value={formatCurrency(summary.avgTicket)}
              delta={summary.deltas.avgTicket}
              accent="purple"
              caption="por negócio ganho"
            />
          </HoverEffectItem>
        </div>
      </HoverEffectGroup>

      {/* Carrossel de etapas */}
      <section className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md shadow-[var(--glass-shadow-sm)]">
        <header className="mb-3.5 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
              Etapas do funil
            </h3>
            <p className="font-body text-[11px] text-[var(--text-muted)]">
              Movimentação por etapa no período selecionado.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ButtonGlass variant="icon" size="icon" aria-label="Anterior" onClick={() => scroll("left")}>
              <IconChevronLeft size={18} />
            </ButtonGlass>
            <ButtonGlass variant="icon" size="icon" aria-label="Próximo" onClick={() => scroll("right")}>
              <IconChevronRight size={18} />
            </ButtonGlass>
          </div>
        </header>

        {stages.length === 0 ? (
          <p className="py-8 text-center font-body text-[13px] text-[var(--text-muted)]">
            Nenhuma etapa encontrada para o pipeline selecionado.
          </p>
        ) : (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
           <HoverEffectGroup>
            {/* Card fixo "Novos do período" — pessoas (contatos) que entraram
                no CRM na janela selecionada. Escopo: organização inteira
                (não depende do pipeline). Respeita o range do calendário. */}
            <HoverEffectItem itemKey="novos-periodo" className="shrink-0">
            <article className="flex h-full w-[200px] flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/35 bg-[color-mix(in_srgb,var(--brand-primary)_9%,var(--glass-bg-overlay))] p-3.5 shadow-[var(--glass-shadow-sm)]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]">
                  <IconSparkles size={15} />
                </span>
                <h4 className="font-display text-[13px] font-bold leading-tight text-[var(--text-primary)]">
                  Novos do período
                </h4>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[28px] font-extrabold leading-none tracking-tight text-[var(--brand-primary)]">
                  {newInPeriod.count}
                </span>
                <span className="mt-1 font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  novos contatos
                </span>
              </div>
              <span className="font-display text-[13px] font-bold text-[var(--text-secondary)]">
                {formatCurrency(newInPeriod.value)}
              </span>
            </article>
            </HoverEffectItem>

            {stages.map((stage) => (
              <HoverEffectItem key={stage.id} itemKey={stage.id} className="shrink-0">
              <article
                className="flex h-full w-[252px] flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3.5 shadow-[var(--glass-shadow-sm)]"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color }} />
                    <h4 className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                      {stage.name}
                    </h4>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(stage.count / maxCount) * 100}%`, background: stage.color }}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-display text-[20px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
                      {stage.count}
                    </span>
                    <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                      negócios
                    </span>
                  </div>
                  <span className="font-display text-[13px] font-bold text-[var(--text-secondary)]">
                    {formatCurrency(stage.value)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--glass-border-subtle)] pt-2.5">
                  <Metric icon={<IconArrowDownRight size={13} />} value={stage.entered} label="Entraram" tone="success" />
                  <Metric icon={<IconArrowUpRight size={13} />} value={stage.exited} label="Avançaram" tone="brand" />
                  <Metric icon={<IconCircleX size={13} />} value={stage.lost} label="Perdidos" tone="danger" />
                </div>
              </article>
              </HoverEffectItem>
            ))}
           </HoverEffectGroup>
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone: "success" | "brand" | "danger"
}) {
  const toneClass = {
    success: "text-[var(--color-success)]",
    brand: "text-[var(--brand-primary)]",
    danger: "text-[var(--color-danger)]",
  }[tone]

  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className={`flex items-center gap-0.5 font-display text-[13px] font-bold ${toneClass}`}>
        {icon}
        {value}
      </span>
      <span className="font-body text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
    </div>
  )
}
