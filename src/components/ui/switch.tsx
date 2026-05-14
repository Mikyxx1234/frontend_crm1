"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Switch
 * ──────
 * Toggle minimalista para estados booleanos (ex.: "Mensagem de finalização
 * de conversa" no `/settings/profile`). Sem dependência de Radix — é um
 * `<button role="switch" aria-checked>` com pista + thumb, animado via
 * `translate-x`.
 *
 * Paleta segue o EduIT Premium Core:
 *  - off: pista `bg-slate-300`
 *  - on:  pista `bg-primary` (primary)
 *  - thumb: `bg-white` com sombra sutil.
 */

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  ...rest
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      aria-labelledby={rest["aria-labelledby"]}
      onClick={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40",
        checked ? "bg-primary" : "bg-slate-300",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
