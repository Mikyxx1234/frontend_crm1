"use client"

import { cn } from "@/lib/utils"
import { getBlockMeta, blockPalette } from "./flow-block-icon"

interface BlockPillProps {
  type: string
  /** Sobrescreve o rótulo do catálogo, se necessário */
  label?: string
  onClick?: () => void
  /** Habilita arraste nativo (para soltar no canvas) */
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  size?: "sm" | "md"
  className?: string
}

/**
 * Pílula de bloco da paleta de automações (DS).
 * Cápsula branca translúcida com ícone colorido em círculo e rótulo em negrito.
 */
export function BlockPill({
  type,
  label,
  onClick,
  draggable,
  onDragStart,
  size = "md",
  className,
}: BlockPillProps) {
  const meta = getBlockMeta(type)
  const Icon = meta.Icon
  const p = blockPalette[meta.color]

  const dims =
    size === "sm"
      ? { pad: "py-2 pl-2 pr-3 gap-2.5", ring: "h-7 w-7", icon: 15, text: "text-[12px]" }
      : { pad: "py-2.5 pl-2.5 pr-3.5 gap-3", ring: "h-9 w-9", icon: 18, text: "text-[13px]" }

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        "group flex w-full items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-left backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all duration-150",
        "hover:-translate-y-0.5 hover:border-[color:var(--accent)]/40 hover:shadow-[var(--glass-shadow)] active:scale-[0.99]",
        draggable && "cursor-grab active:cursor-grabbing",
        dims.pad,
        className,
      )}
      style={{ ["--accent" as string]: p.fg }}
      title={label ?? meta.label}
    >
      <span
        className={cn("flex shrink-0 items-center justify-center rounded-full border", dims.ring)}
        style={{ color: p.fg, backgroundColor: p.bg, borderColor: `${p.fg}33` }}
      >
        <Icon size={dims.icon} stroke={2} />
      </span>
      <span className={cn("min-w-0 flex-1 truncate font-display font-bold text-[var(--text-primary)]", dims.text)}>
        {label ?? meta.label}
      </span>
    </button>
  )
}
