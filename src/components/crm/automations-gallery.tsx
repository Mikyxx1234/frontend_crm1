"use client"

import { IconBolt } from "@tabler/icons-react"
import { AutomationCard } from "./automation-card"
import { EmptyState } from "./empty-state"
import type { Automation } from "@/lib/automations-data"

interface AutomationsGalleryProps {
  automations: Automation[]
  onToggle: (id: string) => void
}

export function AutomationsGallery({ automations, onToggle }: AutomationsGalleryProps) {
  if (automations.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md">
        <EmptyState
          icon={<IconBolt size={28} />}
          title="Nenhuma automação encontrada."
          description="Ajuste a busca ou o filtro para ver outros fluxos."
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-0.5 pb-2">
      {automations.map((a) => (
        <AutomationCard key={a.id} automation={a} onToggle={onToggle} />
      ))}
    </div>
  )
}
