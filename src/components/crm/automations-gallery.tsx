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
          description="Crie um fluxo para automatizar ações disparadas por eventos do CRM."
        />
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto pb-2">
      <div className="flex flex-col gap-3">
        {automations.map((a) => (
          <AutomationCard key={a.id} automation={a} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}
