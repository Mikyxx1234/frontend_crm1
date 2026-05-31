import { cn } from "@/lib/utils"
import { getBlockMeta, blockChipStyle } from "./flow-block-icon"

export interface MiniFlowStep {
  blockType: string
}

interface MiniFlowProps {
  steps: MiniFlowStep[]
  /** Limita a quantidade visível; o excedente vira um "+N" */
  max?: number
  size?: "sm" | "md"
  className?: string
}

/**
 * Visualização compacta de um fluxo: ícones por etapa conectados por traços.
 * Usada nos cards da galeria de automações.
 */
export function MiniFlow({ steps, max = 5, size = "md", className }: MiniFlowProps) {
  const dims =
    size === "sm"
      ? { node: "h-7 w-7", icon: 14, gap: "gap-0", line: "w-3" }
      : { node: "h-8 w-8", icon: 16, gap: "gap-0", line: "w-4" }

  const visible = steps.slice(0, max)
  const overflow = steps.length - visible.length

  return (
    <div className={cn("flex items-center", dims.gap, className)}>
      {visible.map((step, i) => {
        const meta = getBlockMeta(step.blockType)
        const Icon = meta.Icon
        return (
          <div key={i} className="flex items-center">
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
                dims.node,
                step.blockType === "trigger" && "bg-[var(--brand-primary)] text-white",
              )}
              style={step.blockType === "trigger" ? undefined : blockChipStyle(step.blockType)}
              title={meta.label}
            >
              <Icon size={dims.icon} />
            </span>
            {i < visible.length - 1 && (
              <span
                className={cn(
                  "h-px shrink-0 bg-gradient-to-r from-[var(--brand-primary)]/40 to-[var(--brand-secondary)]/40",
                  dims.line,
                )}
                aria-hidden
              />
            )}
          </div>
        )
      })}

      {overflow > 0 && (
        <>
          <span className={cn("h-px shrink-0 bg-[var(--glass-border)]", dims.line)} aria-hidden />
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] font-display text-[11px] font-bold text-[var(--text-muted)]",
              dims.node,
            )}
          >
            +{overflow}
          </span>
        </>
      )}
    </div>
  )
}
