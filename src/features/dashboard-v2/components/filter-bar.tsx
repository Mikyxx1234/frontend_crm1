"use client"

import { IconCalendar, IconFilter } from "@tabler/icons-react"
import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass"
import type { PipelineOption } from "@/features/dashboard-v2/api"

export type PeriodPreset = "7d" | "30d" | "90d" | "mes"

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
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

interface FilterBarProps {
  preset: PeriodPreset
  onPresetChange: (preset: PeriodPreset) => void
  pipelines: PipelineOption[]
  pipelineId?: string
  onPipelineChange: (id: string) => void
  showPipeline: boolean
}

export function FilterBar({
  preset,
  onPresetChange,
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

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <DropdownGlass
        options={periodOptions}
        value={preset}
        onValueChange={(v) => onPresetChange(v as PeriodPreset)}
        menuLabel="Período"
        triggerClassName="min-w-[180px]"
      />

      {showPipeline && pipelineOptions.length > 0 && (
        <DropdownGlass
          options={pipelineOptions}
          value={pipelineId}
          onValueChange={onPipelineChange}
          placeholder="Pipeline"
          menuLabel="Pipeline"
          triggerClassName="min-w-[180px]"
        />
      )}
    </div>
  )
}
