"use client"

import { IconBolt } from "@tabler/icons-react"
import { AutomationCard } from "./automation-card"
import { EmptyState } from "./empty-state"
import type { Automation } from "@/lib/automations-data"

interface AutomationsGalleryProps {
  automations: Automation[]
  onToggle: (id: string) => void
  onDelete?: (id: string) => void
}

export function AutomationsGallery({ automations, onToggle, onDelete }: AutomationsGalleryProps) {
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
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
      role="table"
      aria-label="Lista de automações"
    >
      <div
        className="hidden h-10 shrink-0 grid-cols-[minmax(200px,1.55fr)_minmax(132px,1fr)_72px_88px_112px_96px] items-center gap-4 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-4 font-display text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)] lg:grid"
        role="row"
      >
        <span role="columnheader">Automação / gatilho</span>
        <span role="columnheader">Fluxo</span>
        <span role="columnheader">Sucesso</span>
        <span role="columnheader">Execuções</span>
        <span role="columnheader">Última execução</span>
        <span className="text-right" role="columnheader">Status / ações</span>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1.5"
        role="rowgroup"
      >
        {automations.map((a) => (
          <AutomationCard
            key={a.id}
            automation={a}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
