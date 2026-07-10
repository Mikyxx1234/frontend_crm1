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
        "relative mx-4 mb-3 overflow-hidden rounded-[var(--radius-xl)] border border-amber-300/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-3 shadow-[0_4px_20px_rgba(245,158,11,0.18)] backdrop-blur-sm",
        className,
      )}
    >
      {/* Glow strip at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0" />

      <div className="flex items-center gap-3">
        {/* Pulsing icon */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/40 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.45)]">
            <IconAlertTriangle size={17} strokeWidth={2.5} />
          </div>
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-bold leading-tight text-amber-900">
            {title}
          </p>
          <p className="mt-0.5 font-body text-[11.5px] leading-snug text-amber-700/80">
            {body}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onUseTemplate}
          className="group relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-500 to-orange-500 px-4 py-2 font-display text-[12px] font-bold text-white shadow-[0_3px_12px_rgba(245,158,11,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(245,158,11,0.55)] active:translate-y-0"
        >
          <span className="relative flex items-center gap-1.5">
            <IconMessageCode size={13} />
            {actionLabel}
          </span>
        </button>
      </div>
    </div>
  )
}
