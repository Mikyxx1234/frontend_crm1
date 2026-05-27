"use client"

import { cn } from "@/lib/utils"
import { IconAlertTriangle } from "@tabler/icons-react"

interface SessionAlertProps {
  className?: string
  onUseTemplate?: () => void
  title?: string
  body?: string
  actionLabel?: string
}

export function SessionAlert({
  className,
  onUseTemplate,
  title = "Sessão de 24h encerrada",
  body = "Para continuar, utilize um template aprovado pelo WhatsApp.",
  actionLabel = "Usar Template",
}: SessionAlertProps) {
  return (
    <div
      className={cn(
        "mx-6 mb-4 flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[#F5C2B0] bg-[#FDE8E2] px-5 py-4",
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.18] text-[var(--color-danger)]">
        <IconAlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm font-bold text-[#6B2118]">{title}</div>
        <div className="mt-px text-xs text-[#8A4034]">{body}</div>
      </div>
      <button
        type="button"
        onClick={onUseTemplate}
        className="cursor-pointer rounded-full border border-[#F5C2B0] bg-white px-[22px] py-[9px] font-display text-[13px] font-bold text-[#6B2118] transition-colors hover:bg-[#FDF5F2]"
      >
        {actionLabel}
      </button>
    </div>
  )
}
