import { cn } from "@/lib/utils"
import { IconClockOff, IconTemplate } from "@tabler/icons-react"
import { ButtonGlass } from "./button-glass"

interface SessionAlertProps {
  className?: string
  onUseTemplate?: () => void
}

export function SessionAlert({ className, onUseTemplate }: SessionAlertProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-[420px] flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-danger)]/20 bg-red-100/50 px-[18px] py-3.5 text-center backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-1.5 font-display text-[13px] font-bold text-[var(--color-danger-text)]">
        <IconClockOff size={16} />
        Sessão de 24h encerrada
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Para continuar, utilize um template aprovado pelo WhatsApp.
      </p>
      <ButtonGlass variant="primary" size="sm" onClick={onUseTemplate}>
        <IconTemplate size={16} />
        Usar Template
      </ButtonGlass>
    </div>
  )
}
