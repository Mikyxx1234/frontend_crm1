"use client"

import { IconCalendar, IconFilter, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass"
import type { PipelineOption } from "@/features/dashboard-v2/api"

export type PeriodPreset = "hoje" | "7d" | "30d" | "90d" | "mes"

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
]

/** Calcula o intervalo {from,to} ISO a partir do preset. */
export function computePeriod(preset: PeriodPreset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  switch (preset) {
    case "hoje":
      from.setHours(0, 0, 0, 0)
      break
    case "7d":
      from.setDate(from.getDate() - 7)
      break
    case "30d":
      from.setDate(from.getDate() - 30)
      break
    case "90d":
      from.setDate(from.getDate() - 90)
      break
    case "mes":
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      break
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Intervalo selecionado por calendário (dois dias yyyy-mm-dd). */
export interface CustomRange {
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
}

/** Converte um range de dias (yyyy-mm-dd) num período ISO de dia inteiro. */
export function rangeToPeriod(range: CustomRange): { from: string; to: string } {
  const from = new Date(`${range.from}T00:00:00`)
  const to = new Date(`${range.to}T23:59:59.999`)
  return { from: from.toISOString(), to: to.toISOString() }
}

interface FilterBarProps {
  preset: PeriodPreset
  onPresetChange: (preset: PeriodPreset) => void
  /** Range de calendário ativo (tem prioridade sobre o preset). */
  customRange: CustomRange | null
  onCustomRangeChange: (range: CustomRange | null) => void
  pipelines: PipelineOption[]
  pipelineId?: string
  onPipelineChange: (id: string) => void
  showPipeline: boolean
}

export function FilterBar({
  preset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  pipelines,
  pipelineId,
  onPipelineChange,
  showPipeline,
}: FilterBarProps) {
  const periodOptions: DropdownOption[] = PERIOD_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    icon: <IconCalendar size={15} />,
  }))

  const pipelineOptions: DropdownOption[] = pipelines.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <IconFilter size={15} />,
  }))

  // Datas exibidas no calendário: range customizado tem prioridade;
  // senão deriva do preset ativo (para o usuário ver o intervalo atual).
  const fallback = computePeriod(preset)
  const fromDay = (customRange?.from ?? fallback.from).split("T")[0]
  const toDay = (customRange?.to ?? fallback.to).split("T")[0]
  const isCustom = customRange != null

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <DropdownGlass
        options={periodOptions}
        // Quando há range customizado, nenhum preset fica "ativo".
        value={isCustom ? "" : preset}
        onValueChange={(v) => onPresetChange(v as PeriodPreset)}
        placeholder={isCustom ? "Personalizado" : undefined}
        menuLabel="Período"
        triggerClassName="min-w-[170px]"
      />

      {/* Calendário de range — editar qualquer data cria um range custom. */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-[var(--radius-md)] border bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-sm transition-colors",
          isCustom
            ? "border-[var(--brand-primary)]/50 ring-1 ring-[var(--brand-primary)]/30"
            : "border-[var(--glass-border)]",
        )}
      >
        <IconCalendar size={15} className="shrink-0 text-[var(--text-muted)]" />
        <input
          type="date"
          value={fromDay}
          max={toDay}
          onChange={(e) =>
            onCustomRangeChange({ from: e.target.value, to: toDay })
          }
          className="h-6 border-0 bg-transparent font-display text-[12px] font-semibold text-[var(--text-primary)] outline-none"
        />
        <span className="text-[12px] text-[var(--text-muted)]">—</span>
        <input
          type="date"
          value={toDay}
          min={fromDay}
          onChange={(e) =>
            onCustomRangeChange({ from: fromDay, to: e.target.value })
          }
          className="h-6 border-0 bg-transparent font-display text-[12px] font-semibold text-[var(--text-primary)] outline-none"
        />
        {isCustom && (
          <button
            type="button"
            onClick={() => onCustomRangeChange(null)}
            title="Limpar range"
            aria-label="Limpar range"
            className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
          >
            <IconX size={13} />
          </button>
        )}
      </div>

      {showPipeline && pipelineOptions.length > 0 && (
        <DropdownGlass
          options={pipelineOptions}
          value={pipelineId}
          onValueChange={onPipelineChange}
          placeholder="Pipeline"
          menuLabel="Pipeline"
          triggerClassName="min-w-[170px]"
        />
      )}
    </div>
  )
}
