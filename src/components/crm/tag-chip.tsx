"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type TagChipProps = {
  name: string;
  color?: string | null;
  /** Contador auxiliar (ex.: uso em deals) exibido à direita do nome. */
  count?: number | null;
  selected?: boolean;
  size?: "sm" | "md";
  className?: string;
  title?: string;
  onClick?: () => void;
  "aria-pressed"?: boolean;
};

/**
 * Chip canônico de tag — mesmo visual dos filtros do funil/inbox:
 * fundo suave da cor + borda; estado selecionado = preenchimento sólido.
 */
export function TagChip({
  name,
  color,
  count,
  selected = false,
  size = "sm",
  className,
  title,
  onClick,
  "aria-pressed": ariaPressed,
}: TagChipProps) {
  const chipColor = color || "#6366f1";
  const Comp = onClick ? "button" : "span";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={ariaPressed ?? (onClick ? selected : undefined)}
      title={title ?? name}
      className={cn(
        "inline-flex max-w-full items-center gap-1 border font-display font-semibold leading-tight transition-all",
        size === "md"
          ? "rounded-[8px] px-2.5 py-1 text-[12.5px]"
          : "rounded-[6px] px-2 py-0.5 text-[11px]",
        selected ? "text-white shadow-sm" : "hover:-translate-y-px",
        onClick && "cursor-pointer",
        className,
      )}
      style={
        selected
          ? {
              background: chipColor,
              borderColor: chipColor,
              boxShadow: `0 0 0 2px color-mix(in srgb, ${chipColor} 25%, transparent)`,
            }
          : {
              background: `color-mix(in srgb, ${chipColor} 10%, white)`,
              borderColor: `color-mix(in srgb, ${chipColor} 35%, #d1d8e6)`,
              color: `color-mix(in srgb, ${chipColor} 58%, #1a2338)`,
            }
      }
    >
      {/* Reserva espaço do check sempre — evita reflow em flex-wrap
          quando selected muda no meio de um gesto de clique (ghost click
          em outra chip). */}
      <IconCheck
        size={size === "md" ? 12 : 10}
        stroke={3}
        className={cn("shrink-0", !selected && "invisible")}
        aria-hidden={!selected}
      />
      <span className="truncate">{name}</span>
      {count != null && (
        <small
          className={cn(
            "tabular-nums",
            selected ? "opacity-80" : "opacity-65",
          )}
        >
          {count.toLocaleString("pt-BR")}
        </small>
      )}
    </Comp>
  );
}
