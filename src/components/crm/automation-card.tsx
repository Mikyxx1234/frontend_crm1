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
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] px-4 py-3.5 shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--glass-border-strong)] hover:shadow-[var(--glass-shadow)]">
      {/* Link expandido sobre toda a linha (stretched link) */}
      <Link
        href={`/automations/${automation.id}`}
        className="absolute inset-0 z-0 rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        aria-label={`Abrir editor de ${automation.name}`}
      >
        <span className="sr-only">Abrir editor</span>
      </Link>

      {/* Faixa de acento vertical */}
      <span className={cn("h-11 w-1 shrink-0 rounded-full", accentBar[automation.accent])} aria-hidden />

      {/* Identidade: status + nome + gatilho */}
      <div className="flex min-w-0 flex-[1.4] flex-col gap-1">
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
        <span className="flex min-w-0 items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <IconBolt size={12} className="shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate">{automation.trigger}</span>
        </span>
      </div>

      {/* Mini-fluxo */}
      <div className="hidden shrink-0 md:block">
        <MiniFlow steps={steps} max={5} size="sm" />
      </div>

      {/* Métricas (revelação progressiva: sucesso → execuções → última) */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-6">
        <Metric
          className="flex"
          icon={<IconCircleCheck size={14} />}
          value={`${automation.successRate}%`}
          label="sucesso"
        />
        <Metric
          className="hidden md:flex"
          icon={<IconActivity size={14} />}
          value={automation.runs.toLocaleString("pt-BR")}
          label="execuções"
        />
        <Metric
          className="hidden lg:flex"
          icon={<IconClock size={14} />}
          value={automation.lastRun}
          label="última"
        />
      </div>

      {/* Ação de edição (desktop) */}
      <span className="hidden shrink-0 items-center gap-1 font-display text-[12px] font-bold text-[var(--brand-primary)] transition-transform duration-200 group-hover:translate-x-0.5 xl:flex">
        Abrir <IconArrowRight size={14} />
      </span>

      {/* Switch */}
      <SwitchGlass
        checked={automation.active}
        onChange={() => onToggle(automation.id)}
        className="relative z-10 shrink-0"
        aria-label={`${automation.active ? "Desativar" : "Ativar"} ${automation.name}`}
      />
    </div>
  )
}

function Metric({
  icon,
  value,
  label,
  className,
}: {
  icon: React.ReactNode
  value: string
  label: string
  className?: string
}) {
  return (
    <div className={cn("min-w-[56px] flex-col gap-0.5 lg:min-w-[64px]", className)}>
      <span className="flex items-center gap-1 text-[var(--text-muted)]">{icon}</span>
      <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">{value}</span>
      <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
    </div>
  )
}
