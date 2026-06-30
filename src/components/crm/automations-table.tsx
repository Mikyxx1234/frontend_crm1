"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { IconBolt } from "@tabler/icons-react"
import { Chip } from "./chip"
import { SwitchGlass } from "./switch-glass"
import { EmptyState } from "./empty-state"
import type { Automation } from "@/lib/automations-data"

interface AutomationsTableProps {
  automations: Automation[]
}

export function AutomationsTable({ automations }: AutomationsTableProps) {
  const [items, setItems] = useState(automations)

  const toggle = (id: string) =>
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--glass-bg-overlay)] backdrop-blur-md">
            <tr className="border-b border-[var(--glass-border-subtle)]">
              <th className="px-5 py-3 text-left font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Automação
              </th>
              <th className="px-3 py-3 text-left font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Gatilho
              </th>
              <th className="px-3 py-3 text-left font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Passos
              </th>
              <th className="px-3 py-3 text-left font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Atualizada
              </th>
              <th className="px-5 py-3 text-right font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Status
              </th>
            </tr>
          </thead>
          {items.length > 0 && (
            <tbody>
              {items.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--glass-border-subtle)] transition-colors hover:bg-[var(--glass-bg-subtle)]"
                >
                  {/* Nome + status dot */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          a.active ? "bg-[var(--color-online)]" : "bg-[var(--text-muted)]",
                        )}
                        aria-hidden
                      />
                      <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                        {a.name}
                      </span>
                    </div>
                  </td>

                  {/* Gatilho */}
                  <td className="px-3 py-3.5">
                    <Chip variant="ghost">{a.trigger}</Chip>
                  </td>

                  {/* Passos */}
                  <td className="px-3 py-3.5">
                    <span className="font-display text-[13px] font-semibold text-[var(--text-secondary)]">
                      {a.steps}
                    </span>
                  </td>

                  {/* Atualizada */}
                  <td className="px-3 py-3.5">
                    <span className="font-body text-[13px] text-[var(--text-muted)]">{a.updatedAt}</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <SwitchGlass
                        checked={a.active}
                        onChange={() => toggle(a.id)}
                        aria-label={`${a.active ? "Desativar" : "Ativar"} ${a.name}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {items.length === 0 && (
          <EmptyState
            icon={<IconBolt size={28} />}
            title="Nenhuma automação encontrada."
            description="Crie um fluxo para automatizar ações disparadas por eventos do CRM."
          />
        )}
      </div>
    </div>
  )
}
