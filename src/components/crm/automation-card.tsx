"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconActivity,
  IconCircleCheck,
  IconClock,
  IconTrash,
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
  /**
   * Quando definido, renderiza um botão lixeira que aparece no hover/focus
   * do card e dispara o handler com o id. O componente NÃO confirma sozinho
   * — quem chama deve usar `useConfirm()` antes de efetivar a remoção.
   * Opcional para preservar usos legados (ex.: galeria preview).
   */
  onDelete?: (id: string) => void
}

export function AutomationCard({ automation, onToggle, onDelete }: AutomationCardProps) {
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
        "group relative flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)] px-3.5 py-3.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-150 hover:-translate-y-px hover:border-[var(--brand-primary)] hover:shadow-[var(--glass-shadow)] sm:gap-4.5 sm:px-5.5 sm:py-4.5",
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

      {/* Nome flexível: trunca no mobile para o switch não ser cortado */}
      <div className="relative z-10 min-w-0 flex-1 pl-2 sm:pl-2.5 lg:min-w-[200px] lg:flex-none lg:shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              automation.active
                ? "bg-[var(--color-success)]"
                : "bg-[var(--text-muted)] opacity-45",
            )}
            aria-hidden
          />
          <h3 className="min-w-0 truncate font-display text-[14px] font-bold text-[var(--text-primary)] sm:text-[16px]">
            {automation.name}
          </h3>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-4">
          <IconBolt size={13} stroke={2.2} className="shrink-0 text-[var(--brand-primary)]" />
          <span className="min-w-0 truncate font-body text-[12px] text-[var(--text-muted)] sm:text-[12.5px]">
            {automation.trigger}
          </span>
        </div>
      </div>

      <div className="relative z-10 hidden min-w-0 flex-1 lg:block">
        <MiniFlow steps={steps} max={5} size="sm" connected={false} />
      </div>

      <div className="relative z-10 hidden shrink-0 items-center gap-6.5 md:flex">
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

      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            // O card inteiro é coberto por um <Link> em inset-0 — sem
            // stopPropagation+preventDefault, o clique navegaria pro editor.
            e.preventDefault()
            e.stopPropagation()
            onDelete(automation.id)
          }}
          aria-label={`Excluir ${automation.name}`}
          title="Excluir automação"
          className={cn(
            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
            "border border-transparent text-[var(--text-muted)] transition-all duration-150",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
            "hover:border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]/40",
          )}
        >
          <IconTrash size={15} stroke={2.2} />
        </button>
      )}
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
