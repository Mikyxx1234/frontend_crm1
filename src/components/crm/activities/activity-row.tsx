"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  IconClock,
  IconMapPin,
  IconUser,
  IconTrash,
  IconDotsVertical,
  IconCircleCheck,
  IconRotateClockwise,
} from "@tabler/icons-react"
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

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [menuOpen])

  const accentColor = done
    ? "var(--glass-border)"
    : overdue
      ? "var(--color-danger)"
      : meta.color

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] border-l-4 bg-[var(--glass-bg-overlay)] p-4 shadow-[var(--glass-shadow-sm)] transition-all duration-150 hover:translate-x-0.5 hover:bg-[var(--glass-bg-strong)]",
        done && "opacity-65",
      )}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="pt-0.5">
        <CheckboxGlass
          checked={done}
          onChange={() => onToggle(activity.id)}
          aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
        />
      </div>

      {/* Ícone do tipo (circular) */}
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: meta.softBg, color: meta.color }}
      >
        <Icon size={20} stroke={2} />
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

      {/* Etiqueta de status/tipo + menu */}
      <div className="flex shrink-0 items-center gap-2">
        {overdue && !done && (
          <span className="rounded-full border border-[var(--color-danger)]/25 bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-2 py-0.5 font-display text-[10px] font-bold text-[var(--color-danger)]">
            Atrasada
          </span>
        )}
        {done ? (
          <span
            className="rounded-full px-2.5 py-0.5 font-display text-[10px] font-bold"
            style={{
              backgroundColor: ACTIVITY_KINDS.ligacao.softBg,
              color: ACTIVITY_KINDS.ligacao.color,
            }}
          >
            Concluído
          </span>
        ) : (
          <span
            className="rounded-full px-2.5 py-0.5 font-display text-[10px] font-bold"
            style={{ backgroundColor: meta.softBg, color: meta.color }}
          >
            {meta.label}
          </span>
        )}

        {/* Menu kebab (⋮) */}
        <div ref={menuRef} className="relative inline-flex">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Mais ações"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
          >
            <IconDotsVertical size={16} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-1 w-48 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggle(activity.id)
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left font-display text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
              >
                {done ? (
                  <>
                    <IconRotateClockwise size={15} className="text-[var(--text-muted)]" />
                    Reabrir
                  </>
                ) : (
                  <>
                    <IconCircleCheck size={15} className="text-[var(--color-success,#10b981)]" />
                    Marcar como concluída
                  </>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDelete(activity.id)
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left font-display text-[12px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)]"
              >
                <IconTrash size={15} />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
