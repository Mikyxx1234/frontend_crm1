"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconActivity,
  IconCircleCheck,
  IconClock,
  IconArrowRight,
} from "@tabler/icons-react"
import { SwitchGlass } from "./switch-glass"
import { MiniFlow } from "./mini-flow"
import { getFlow } from "@/lib/automation-flow"
import type { Automation } from "@/lib/automations-data"

const accentBar: Record<Automation["accent"], string> = {
  blue: "av-blue",
  purple: "av-purple",
  mint: "av-mint",
  coral: "av-coral",
  teal: "av-teal",
}

interface AutomationCardProps {
  automation: Automation
  onToggle: (id: string) => void
}

export function AutomationCard({ automation, onToggle }: AutomationCardProps) {
  const flow = getFlow(automation.id)
  const steps = flow.map((n) => ({ blockType: n.blockType }))

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--glass-shadow)]">
      {/* Link expandido sobre todo o card (stretched link) */}
      <Link
        href={`/automations/${automation.id}`}
        className="absolute inset-0 z-0 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        aria-label={`Abrir editor de ${automation.name}`}
      >
        <span className="sr-only">Abrir editor</span>
      </Link>

      {/* Faixa de acento superior */}
      <span className={cn("h-1 w-full", accentBar[automation.accent])} aria-hidden />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={cn(
                  "relative flex h-2 w-2 shrink-0 items-center justify-center rounded-full",
                  automation.active ? "bg-[var(--color-online)]" : "bg-[var(--color-offline)]",
                )}
                aria-hidden
              >
                {automation.active && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-online)] opacity-60" />
                )}
              </span>
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                {automation.active ? "Ativa" : "Pausada"}
              </span>
            </div>
            <h3 className="truncate font-display text-[16px] font-bold text-[var(--text-primary)]">
              {automation.name}
            </h3>
          </div>

          <SwitchGlass
            checked={automation.active}
            onChange={() => onToggle(automation.id)}
            className="relative z-10"
            aria-label={`${automation.active ? "Desativar" : "Ativar"} ${automation.name}`}
          />
        </div>

        {/* Descrição */}
        <p className="line-clamp-2 font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {automation.description}
        </p>

        {/* Gatilho + mini-fluxo */}
        <div className="rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5">
            <IconBolt size={13} className="text-[var(--brand-primary)]" />
            <span className="font-display text-[11px] font-semibold text-[var(--text-secondary)]">
              {automation.trigger}
            </span>
          </div>
          <MiniFlow steps={steps} max={5} />
        </div>

        {/* Métricas */}
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[var(--glass-border-subtle)] pt-4">
          <Metric icon={<IconActivity size={14} />} value={automation.runs.toLocaleString("pt-BR")} label="execuções" />
          <Metric icon={<IconCircleCheck size={14} />} value={`${automation.successRate}%`} label="sucesso" />
          <Metric icon={<IconClock size={14} />} value={automation.lastRun} label="última" />
        </div>
      </div>

      {/* Rodapé / call-to-edit */}
      <div className="flex items-center justify-between border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-5 py-2.5">
        <span className="font-body text-[12px] text-[var(--text-muted)]">
          {automation.steps} passos · {automation.runsToday} hoje
        </span>
        <span className="flex items-center gap-1 font-display text-[12px] font-bold text-[var(--brand-primary)] transition-transform duration-200 group-hover:translate-x-0.5">
          Abrir editor <IconArrowRight size={14} />
        </span>
      </div>
    </div>
  )
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[var(--text-muted)]">{icon}</span>
      <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">{value}</span>
      <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
    </div>
  )
}
