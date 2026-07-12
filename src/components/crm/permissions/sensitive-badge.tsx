"use client";

import * as React from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * SensitiveBadge — selo padronizado para ações sensíveis/destrutivas
 * (ex.: excluir funil, excluir contato). Substitui os spans "sensível"
 * duplicados nos editores de papel e grupo.
 */
export function SensitiveBadge({
  children = "Sensível",
  tone = "danger",
  withIcon = false,
  className,
}: {
  children?: React.ReactNode;
  tone?: "danger" | "warn";
  withIcon?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-wide",
        tone === "danger"
          ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
          : "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
        className,
      )}
    >
      {withIcon && <IconAlertTriangle size={9} stroke={2.5} />}
      {children}
    </span>
  );
}
