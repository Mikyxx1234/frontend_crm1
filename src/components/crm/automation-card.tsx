"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconActivity,
  IconCircleCheck,
  IconClock,
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
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--card)] py-3.5 pl-5 pr-4 shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:shadow-[var(--glass-shadow)]">
      {/* Link expandido sobre toda a linha (stretched link) */}
      <Link
        href={`/automations/${automation.id}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        aria-label={`Abrir editor de ${automation.name}`}
      >
        <span className="sr-only">Abrir editor</span>
      </Link>

      {/* Faixa de acento vertical */}
      <span
        className={cn("absolute left-0 top-0 h-full w-1", accentBar[automation.accent])}
        aria-hidden
      />

      {/* Status + nome + gatilho */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
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
          <h3 className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
            {automation.name}
          </h3>
        </div>
        <div className="mt-1 flex items-center gap-1.5 pl-4">
          <IconBolt size={13} className="shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate font-display text-[12px] font-semibold text-[var(--text-secondary)]">
            {automation.trigger}
          </span>
        </div>
      </div>

      {/* Mini-fluxo (oculto em telas estreitas) */}
      <div className="relative z-10 hidden shrink-0 lg:block">
        <MiniFlow steps={steps} max={5} size="sm" />
      </div>

      {/* Métricas reais */}
      <div className="hidden shrink-0 items-center gap-5 sm:flex">
        <RowMetric
          icon={<IconCircleCheck size={15} />}
          value={`${automation.successRate}%`}
          label="Sucesso"
        />
        <RowMetric
          icon={<IconActivity size={15} />}
          value={automation.runs.toLocaleString("pt-BR")}
          label="Execuções"
        />
        <RowMetric
          icon={<IconClock size={15} />}
          value={automation.lastRun}
          label="Última"
        />
      </div>

      {/* Toggle ativar/pausar */}
      <SwitchGlass
        checked={automation.active}
        onChange={() => onToggle(automation.id)}
        className="relative z-10 shrink-0"
        aria-label={`${automation.active ? "Desativar" : "Ativar"} ${automation.name}`}
      />
    </div>
  )
}

function RowMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex w-[68px] flex-col items-center gap-0.5 text-center">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span className="max-w-full truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
        {value}
      </span>
      <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  )
}
