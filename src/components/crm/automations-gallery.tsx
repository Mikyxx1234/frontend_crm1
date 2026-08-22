"use client"

import { useRouter } from "next/navigation"
import {
  IconBell,
  IconBrandWhatsapp,
  IconClock,
  IconMessage,
  IconPhone,
  IconRobot,
  IconSparkles,
  IconTag,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"

import { EmptyState } from "./empty-state"
import {
  OpsNameCell,
  OpsProgress,
  OpsRowMenu,
  OpsStatusPill,
  OpsTableHead,
  OpsTableRow,
  OpsTableShell,
} from "./ops-data-table"
import { SwitchGlass } from "./switch-glass"
import type { Automation } from "@/lib/automations-data"

interface AutomationsGalleryProps {
  automations: Automation[]
  onToggle: (id: string) => void
  onDelete?: (id: string) => void
}

const GRID =
  "lg:grid-cols-[minmax(0,2fr)_minmax(150px,0.9fr)_minmax(120px,0.75fr)_minmax(88px,0.55fr)_minmax(120px,0.75fr)_40px]"

const TRIGGER_ICON: Record<string, Icon> = {
  "Contato criado": IconSparkles,
  "Conversa criada": IconUsers,
  "Mensagem recebida": IconMessage,
  "Mensagem enviada": IconBrandWhatsapp,
  "Estágio alterado": IconRobot,
  "Negócio criado": IconSparkles,
  "Negócio ganho": IconSparkles,
  "Negócio perdido": IconSparkles,
  "Tag adicionada": IconTag,
  "Lead score atingido": IconBell,
  "Ciclo de vida alterado": IconClock,
  "Agente alterado": IconUsers,
  Manual: IconRobot,
  "Ligação recebida": IconPhone,
  "Ligação realizada": IconPhone,
}

function triggerIcon(trigger: string): Icon {
  return TRIGGER_ICON[trigger] ?? IconRobot
}

export function AutomationsGallery({
  automations,
  onToggle,
  onDelete,
}: AutomationsGalleryProps) {
  const router = useRouter()

  if (automations.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
        <EmptyState
          icon={<IconRobot size={28} />}
          title="Nenhuma automação encontrada."
          description="Ajuste a busca ou o filtro para ver outros fluxos."
        />
      </div>
    )
  }

  return (
    <OpsTableShell label="Lista de automações">
      <OpsTableHead
        gridClass={GRID}
        columns={["Automação", "Status", "Sucesso", "Execuções", "Última execução", ""]}
      />
      <div role="rowgroup">
        {automations.map((a) => {
          const Icon = triggerIcon(a.trigger)
          const href = `/automations/${a.id}`
          const last = !a.lastRun || a.lastRun === "—" ? "Nunca" : a.lastRun
          return (
            <OpsTableRow
              key={a.id}
              gridClass={GRID}
              label={`Abrir ${a.name}`}
              onOpen={() => router.push(href)}
            >
              <div role="cell">
                <OpsNameCell
                  icon={<Icon size={17} stroke={1.8} />}
                  title={a.name}
                  subtitle={a.trigger}
                />
              </div>
              <div role="cell" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <OpsStatusPill
                  label={a.active ? "Ativa" : "Pausada"}
                  tone={a.active ? "success" : "muted"}
                />
                <SwitchGlass
                  checked={a.active}
                  onChange={() => onToggle(a.id)}
                  size="sm"
                  className="max-lg:hidden"
                  aria-label={`${a.active ? "Pausar" : "Ativar"} ${a.name}`}
                />
              </div>
              <div role="cell" className="max-lg:hidden">
                <OpsProgress value={a.successRate} />
              </div>
              <div role="cell" className="max-lg:hidden">
                <div className="flex flex-col">
                  <span className="font-display text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {a.runs.toLocaleString("pt-BR")}
                  </span>
                  {a.runsToday > 0 ? (
                    <span className="font-body text-[12px] text-[var(--text-muted)]">hoje</span>
                  ) : null}
                </div>
              </div>
              <div
                role="cell"
                className={`max-lg:hidden font-body text-[13px] ${last === "Nunca" ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"}`}
              >
                {last}
              </div>
              <div
                role="cell"
                className="flex justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <OpsRowMenu
                  label={`Ações de ${a.name}`}
                  items={[
                    { label: "Abrir", onClick: () => router.push(href) },
                    ...(onDelete
                      ? [
                          {
                            label: "Excluir",
                            danger: true,
                            onClick: () => onDelete(a.id),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </OpsTableRow>
          )
        })}
      </div>
    </OpsTableShell>
  )
}
