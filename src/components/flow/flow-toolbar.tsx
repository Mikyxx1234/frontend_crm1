"use client"

import {
  Network,
  Eye,
  EyeOff,
  Maximize,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react"
import type { LayoutDirection } from "@/lib/layout"

interface Props {
  direction: LayoutDirection
  showErrors: boolean
  onDirectionChange: (dir: LayoutDirection) => void
  onToggleErrors: () => void
  onAutoLayout: () => void
  onFit: () => void
}

export function FlowToolbar({
  direction,
  showErrors,
  onDirectionChange,
  onToggleErrors,
  onAutoLayout,
  onFit,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-start gap-3 p-4">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-[var(--color-bg-card)] p-1.5 shadow-sm">
        {/* Direção */}
        <div className="flex items-center rounded-lg bg-muted p-0.5">
          <button
            type="button"
            onClick={() => onDirectionChange("LR")}
            aria-pressed={direction === "LR"}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors aria-pressed:bg-card aria-pressed:text-card-foreground aria-pressed:shadow-sm"
          >
            <MoveHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Horizontal</span>
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange("TB")}
            aria-pressed={direction === "TB"}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors aria-pressed:bg-card aria-pressed:text-card-foreground aria-pressed:shadow-sm"
          >
            <MoveVertical className="h-4 w-4" />
            <span className="hidden sm:inline">Vertical</span>
          </button>
        </div>

        <ToolButton onClick={onAutoLayout} icon={<Network className="h-4 w-4" />} label="Auto alinhar" />
        <ToolButton
          onClick={onToggleErrors}
          icon={showErrors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          label={showErrors ? "Ocultar erros" : "Mostrar erros"}
          active={showErrors}
        />
        <ToolButton onClick={onFit} icon={<Maximize className="h-4 w-4" />} label="Ajustar" />
      </div>
    </div>
  )
}

function ToolButton({
  onClick,
  icon,
  label,
  active,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground aria-pressed:bg-brand aria-pressed:text-brand-foreground"
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}
