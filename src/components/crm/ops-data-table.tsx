"use client"

import type { ReactNode } from "react"
import { IconDots, IconTrash } from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { ListColumnLabel } from "./sortable-header"

export type OpsStatusTone = "success" | "progress" | "scheduled" | "danger" | "muted"

const PILL_TONE: Record<OpsStatusTone, string> = {
  success:
    "bg-[color-mix(in_oklch,var(--color-success)_12%,transparent)] text-[var(--color-success-text,var(--color-success))]",
  progress: "bg-[var(--color-primary-soft,color-mix(in_oklch,var(--brand-primary)_12%,transparent))] text-[var(--brand-primary)]",
  scheduled: "bg-[var(--color-primary-soft,color-mix(in_oklch,var(--brand-primary)_12%,transparent))] text-[var(--brand-primary)]",
  danger:
    "bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] text-[var(--color-danger-text,var(--color-danger))]",
  muted: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
}

export function OpsStatusPill({
  label,
  tone,
  pulse = false,
}: {
  label: string
  tone: OpsStatusTone
  pulse?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-16 items-center justify-center gap-1 rounded-full px-2 py-0.5 font-display text-[12px] font-semibold tabular-nums",
        PILL_TONE[tone],
      )}
    >
      {pulse ? (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      ) : null}
      {label}
    </span>
  )
}

export function OpsProgress({
  value,
  active = false,
}: {
  value: number
  active?: boolean
}) {
  const pct = Math.max(0, Math.min(100, value))
  const warn = pct > 0 && pct < 75
  return (
    <div className="flex w-full min-w-0 max-w-[116px] items-center gap-2 tabular-nums">
      <span className="w-7 shrink-0 font-body text-[13px] text-[var(--text-secondary)]">
        {pct ? `${pct}%` : "—"}
      </span>
      <div className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--glass-border)]">
        <div
          className={cn(
            "h-full rounded-full",
            warn ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]",
            active && "animate-pulse",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function OpsNameCell({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft,color-mix(in_oklch,var(--brand-primary)_12%,transparent))] text-[var(--brand-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-[14px] font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        <p className="truncate font-body text-[12px] text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </div>
  )
}

export type OpsMenuItem = {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  title?: string
}

export function OpsRowMenu({
  label,
  items,
}: {
  label: string
  items: OpsMenuItem[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <IconDots size={18} stroke={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[168px]">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            title={item.title}
            className={cn(
              "font-body text-[13px]",
              item.danger && "text-[var(--color-danger-text,var(--color-danger))]",
            )}
            onClick={(e) => {
              e.stopPropagation()
              if (!item.disabled) item.onClick()
            }}
          >
            {item.danger ? <IconTrash size={15} stroke={1.8} /> : null}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function OpsTableHead({
  columns,
  gridClass,
}: {
  columns: ReactNode[]
  gridClass: string
}) {
  return (
    <div
      role="row"
      className={cn(
        "sticky top-0 z-[2] hidden items-center gap-4 border-b border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--brand-primary)_7%,var(--bg-base,transparent))] px-4 py-2.5 lg:grid",
        gridClass,
      )}
    >
      {columns.map((col, i) => (
        <div key={i} role="columnheader">
          {typeof col === "string" ? (
            <ListColumnLabel align={i === columns.length - 1 ? "right" : "left"}>
              {col || <span className="sr-only">Ações</span>}
            </ListColumnLabel>
          ) : (
            col
          )}
        </div>
      ))}
    </div>
  )
}

export function OpsTableRow({
  gridClass,
  children,
  onOpen,
  label,
}: {
  gridClass: string
  children: ReactNode
  onOpen: () => void
  label: string
}) {
  return (
    <div
      role="row"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        "group grid min-h-14 cursor-pointer items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 last:border-b-0 hover:bg-[var(--glass-bg-overlay)] focus-visible:bg-[var(--glass-bg-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary)] max-lg:grid-cols-[minmax(0,1fr)_auto_34px] lg:min-h-[62px] lg:gap-4 lg:px-4",
        gridClass,
      )}
    >
      {children}
    </div>
  )
}

export function OpsTableShell({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div
      className="min-h-0 flex-1 overflow-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] backdrop-blur-md"
      role="table"
      aria-label={label}
    >
      {children}
    </div>
  )
}
