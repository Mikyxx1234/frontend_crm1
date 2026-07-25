"use client";

import * as React from "react";

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
        "inline-flex max-w-full items-center gap-1 border font-display font-semibold transition-all",
        size === "md"
          ? "rounded-[8px] px-2.5 py-1 text-[12.5px]"
          : "rounded-[7px] px-2 py-1 text-[11.5px]",
        selected ? "text-white shadow-sm" : "hover:-translate-y-px",
        onClick && "cursor-pointer",
        className,
      )}
      style={
        selected
          ? { background: chipColor, borderColor: chipColor }
          : {
              background: `color-mix(in srgb, ${chipColor} 15%, white)`,
              borderColor: `color-mix(in srgb, ${chipColor} 45%, #d9dfeb)`,
              color: "#35405b",
            }
      }
    >
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
