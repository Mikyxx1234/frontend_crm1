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
import { MiniFlow, type MiniFlowStep } from "./mini-flow"
import { blockKeyForStepType } from "./flow-block-icon"
import type { Automation } from "@/lib/automations-data"

const accentBar: Record<Automation["accent"], string> = {
  blue: "bg-[var(--brand-primary)]",
  purple: "bg-[var(--brand-secondary)]",
  mint: "bg-[var(--color-success)]",
  coral: "bg-[var(--color-warn)]",
  teal: "bg-[var(--color-danger)]",
}

interface AutomationCardProps {
  automation: Automation
  onToggle: (id: string) => void
}

export function AutomationCard({ automation, onToggle }: AutomationCardProps) {
  const stepTypes =
    automation.stepTypes && automation.stepTypes.length > 0
      ? automation.stepTypes
      : Array.from({ length: automation.steps }, () => "action")
  const steps: MiniFlowStep[] = [
    { blockType: "trigger" },
    ...stepTypes.map((t) => ({ blockType: blockKeyForStepType(t) })),
  ]

  return (
    <article
      className={cn(
        "group relative flex items-center gap-[18px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)] px-[22px] py-[18px] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-150 hover:-translate-y-px hover:border-[var(--brand-primary)] hover:shadow-[var(--glass-shadow)]",
      )}
    >
      <Link
        href={`/automations/${automation.id}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        aria-label={`Abrir editor de ${automation.name}`}
      >
        <span className="sr-only">Abrir editor</span>
      </Link>

      <span
        className={cn(
          "absolute bottom-0 left-0 top-0 w-[5px] rounded-full",
          accentBar[automation.accent],
        )}
        aria-hidden
      />

      <div className="relative z-10 min-w-[240px] shrink-0 pl-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              automation.active
                ? "bg-[var(--color-success)]"
                : "bg-[var(--text-muted)] opacity-45",
            )}
            aria-hidden
          />
          <h3 className="truncate font-display text-[16px] font-bold text-[var(--text-primary)]">
            {automation.name}
          </h3>
        </div>
        <div className="mt-1 flex items-center gap-1.5 pl-4">
          <IconBolt size={13} stroke={2.2} className="shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate font-body text-[12.5px] text-[var(--text-muted)]">
            {automation.trigger}
          </span>
        </div>
      </div>

      <div className="relative z-10 hidden min-w-0 flex-1 lg:block">
        <MiniFlow steps={steps} max={5} size="sm" connected={false} />
      </div>

      <div className="relative z-10 hidden shrink-0 items-center gap-[26px] md:flex">
        <RowMetric
          icon={<IconCircleCheck size={13} />}
          value={`${automation.successRate}%`}
          label="Sucesso"
        />
        <RowMetric
          icon={<IconActivity size={13} />}
          value={automation.runs.toLocaleString("pt-BR")}
          label="Execuções"
        />
        <RowMetric
          icon={<IconClock size={13} />}
          value={automation.lastRun}
          label="Última"
        />
      </div>

      <SwitchGlass
        checked={automation.active}
        onChange={() => onToggle(automation.id)}
        size="list"
        className="relative z-10 shrink-0"
        aria-label={`${automation.active ? "Desativar" : "Ativar"} ${automation.name}`}
      />
    </article>
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
    <div className="min-w-[58px] text-center">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[var(--text-muted)]">
        {icon}
      </div>
      <p className="font-display text-[15px] font-extrabold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="font-body text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  )
}
