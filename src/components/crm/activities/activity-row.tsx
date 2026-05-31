"use client"

import { cn } from "@/lib/utils"
import { IconClock, IconMapPin, IconUser, IconTrash } from "@tabler/icons-react"
import { CheckboxGlass } from "@/components/crm/checkbox-glass"
import { ACTIVITY_KINDS, activityTime, type Activity } from "@/lib/activities-data"

interface ActivityRowProps {
  activity: Activity
  overdue?: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function ActivityRow({ activity, overdue, onToggle, onDelete }: ActivityRowProps) {
  const meta = ACTIVITY_KINDS[activity.kind]
  const Icon = meta.icon
  const done = activity.status === "concluida"

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3 shadow-[var(--glass-shadow-sm)] transition-all duration-150 hover:bg-[var(--glass-bg-strong)]",
        done && "opacity-65",
      )}
    >
      <div className="pt-0.5">
        <CheckboxGlass
          checked={done}
          onChange={() => onToggle(activity.id)}
          aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
        />
      </div>

      {/* Ícone do tipo */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{ backgroundColor: meta.softBg, color: meta.color }}
      >
        <Icon size={18} stroke={2} />
      </span>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={cn(
            "font-display text-[13px] font-bold leading-tight text-[var(--text-primary)]",
            done && "line-through decoration-[var(--text-muted)]",
          )}
        >
          {activity.title}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <IconClock size={13} />
            {activityTime(activity)}
            {activity.durationMin ? ` · ${activity.durationMin} min` : ""}
          </span>
          {activity.withWhom && (
            <span className="inline-flex items-center gap-1">
              <IconUser size={13} />
              {activity.withWhom}
            </span>
          )}
          {activity.location && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin size={13} />
              {activity.location}
            </span>
          )}
        </div>
      </div>

      {/* Etiqueta de tipo + ações */}
      <div className="flex shrink-0 items-center gap-2">
        {overdue && !done && (
          <span className="rounded-full border border-[var(--color-danger)]/25 bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-2 py-0.5 font-display text-[10px] font-bold text-[var(--color-danger)]">
            Atrasada
          </span>
        )}
        <span
          className="rounded-full px-2.5 py-0.5 font-display text-[10px] font-bold"
          style={{ backgroundColor: meta.softBg, color: meta.color }}
        >
          {meta.label}
        </span>
        <button
          type="button"
          onClick={() => onDelete(activity.id)}
          aria-label="Excluir atividade"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] opacity-0 transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] hover:text-[var(--color-danger)] group-hover:opacity-100"
        >
          <IconTrash size={15} />
        </button>
      </div>
    </div>
  )
}
