"use client";

import * as React from "react";
import { IconAlertTriangle, IconShield } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * SensitiveBadge — selo padronizado para ações sensíveis/destrutivas.
 * Tom `warn` (âmbar + escudo) segue o DS de permissions; `danger` mantém
 * o vermelho legado.
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
  const Icon = tone === "warn" ? IconShield : IconAlertTriangle;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wide",
        tone === "danger"
          ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
          : "bg-amber-100 text-amber-700 v2-dark:bg-amber-500/20 v2-dark:text-amber-300",
        className,
      )}
    >
      {withIcon && <Icon size={11} stroke={2.5} />}
      {children}
    </span>
  );
}
