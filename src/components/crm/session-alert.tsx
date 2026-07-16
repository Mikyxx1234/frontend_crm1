"use client"

import { cn } from "@/lib/utils"
import { IconAlertTriangle, IconMessageCode } from "@tabler/icons-react"

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
        "relative mx-2 mb-1.5 overflow-hidden rounded-[var(--radius-lg)] border border-rose-200/70 bg-gradient-to-r from-white via-rose-50/60 to-white px-2.5 py-1.5 shadow-[0_2px_10px_rgba(244,63,94,0.10)] backdrop-blur-sm sm:mx-3 sm:px-3 sm:py-2",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-rose-400/0 via-rose-500 to-rose-400/0" />

      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-rose-300/50 bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-sm sm:size-7">
          <IconAlertTriangle size={13} strokeWidth={2.5} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-[11.5px] font-bold leading-tight text-rose-700 sm:text-[12.5px]">
            {title}
          </p>
          <p className="mt-px line-clamp-2 font-body text-[10.5px] leading-snug text-rose-500/90 sm:text-[11px]">
            {body}
          </p>
        </div>

        <button
          type="button"
          onClick={onUseTemplate}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-2.5 py-1 font-display text-[10.5px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11.5px]"
        >
          <IconMessageCode size={12} className="shrink-0" />
          <span className="whitespace-nowrap">{actionLabel}</span>
        </button>
      </div>
    </div>
  )
}
