"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { SensitiveBadge } from "./sensitive-badge";

/**
 * PermissionRow — linha densa de permissão com divider hairline (não card).
 * Rótulo (+ badge SENSÍVEL opcional + descrição secundária) à esquerda e um
 * controle (ScopeSelector, Switch…) alinhado à direita.
 */
export function PermissionRow({
  label,
  description,
  icon,
  sensitive,
  control,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  sensitive?: boolean;
  /** Controle à direita (ScopeSelector, SwitchGlass, etc.). */
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-0 hover:bg-[var(--glass-bg-overlay)]",
        className,
      )}
    >
      {icon && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {label}
          </span>
          {sensitive && <SensitiveBadge />}
        </div>
        {description && (
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
