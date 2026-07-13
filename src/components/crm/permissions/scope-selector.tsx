"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

/**
 * ScopeSelector — seletor de escopo único (segmented pill) para uma linha
 * de permissão. Substitui os checkboxes soltos e grupos de botões
 * cinza/azul espalhados pelas telas de permissão.
 *
 * Acessível: `role="radiogroup"` + `role="radio"` com roving tabindex e
 * navegação por setas (← →, Home/End). Estado selecionado = fill por tom;
 * opções indisponíveis (ex.: "Equipe em breve") = disabled com tooltip.
 *
 * Genérico sobre o tipo do valor (número p/ níveis 0–3 ou string p/ escopos
 * de canal). Os presets abaixo cobrem as três escalas do app.
 */

export type ScopeTone = "neutral" | "brand" | "warn" | "danger";

export interface ScopeOption<T extends string | number = string | number> {
  value: T;
  label: string;
  /** Tooltip (ex.: explicar "Apenas responsável" ou "Em breve"). */
  hint?: string;
  /** Opção visível porém indisponível (ex.: "Equipe" em breve). */
  disabled?: boolean;
  /** Cor de preenchimento quando ativo. Default: "brand". */
  tone?: ScopeTone;
}

const TONE_ACTIVE: Record<ScopeTone, string> = {
  neutral:
    "bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] shadow-[var(--glass-shadow-sm)]",
  brand: "bg-[var(--brand-primary)] text-white shadow-[var(--glass-shadow-sm)]",
  warn: "bg-[var(--color-warn)] text-white shadow-[var(--glass-shadow-sm)]",
  danger: "bg-[var(--color-danger)] text-white shadow-[var(--glass-shadow-sm)]",
};

interface ScopeSelectorProps<T extends string | number> {
  options: readonly ScopeOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  size?: "sm" | "md";
  /** Desabilita o seletor inteiro. */
  disabled?: boolean;
  className?: string;
}

export function ScopeSelector<T extends string | number>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  size = "md",
  disabled,
  className,
}: ScopeSelectorProps<T>) {
  const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const enabledIndexes = options
    .map((o, i) => (o.disabled || disabled ? -1 : i))
    .filter((i) => i >= 0);

  const moveFocus = (fromIdx: number, dir: 1 | -1 | "home" | "end") => {
    if (enabledIndexes.length === 0) return;
    let target: number;
    if (dir === "home") target = enabledIndexes[0];
    else if (dir === "end") target = enabledIndexes[enabledIndexes.length - 1];
    else {
      const pos = enabledIndexes.indexOf(fromIdx);
      const nextPos =
        pos < 0
          ? 0
          : (pos + (dir === 1 ? 1 : -1) + enabledIndexes.length) %
            enabledIndexes.length;
      target = enabledIndexes[nextPos];
    }
    const opt = options[target];
    onChange(opt.value);
    btnRefs.current[target]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-0.5",
        disabled && "opacity-50",
        className,
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        const tone = opt.tone ?? "brand";
        const isDisabled = disabled || opt.disabled;
        const btn = (
          <button
            key={String(opt.value)}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            disabled={isDisabled}
            tabIndex={active ? 0 : -1}
            onClick={() => !isDisabled && onChange(opt.value)}
            onKeyDown={(e) => {
              if (isDisabled) return;
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                moveFocus(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                moveFocus(i, -1);
              } else if (e.key === "Home") {
                e.preventDefault();
                moveFocus(i, "home");
              } else if (e.key === "End") {
                e.preventDefault();
                moveFocus(i, "end");
              }
            }}
            className={cn(
              "cursor-pointer rounded-full font-display font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1",
              size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-[12px]",
              active
                ? TONE_ACTIVE[tone]
                : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              isDisabled && "cursor-not-allowed opacity-50 hover:text-[var(--text-muted)]",
            )}
          >
            {opt.label}
          </button>
        );

        return opt.hint ? (
          <TooltipGlass key={String(opt.value)} label={opt.hint} side="top">
            {btn}
          </TooltipGlass>
        ) : (
          btn
        );
      })}
    </div>
  );
}

/* ── Presets das três escalas do app ──────────────────────────────────── */

/** Módulos RBAC: Nenhum → Ver → Operar → Total (níveis 0–3). */
export const MODULE_SCOPE_OPTIONS: readonly ScopeOption<number>[] = [
  { value: 0, label: "Nenhum", tone: "neutral" },
  { value: 1, label: "Ver", tone: "brand" },
  { value: 2, label: "Operar", tone: "brand" },
  { value: 3, label: "Total", tone: "brand" },
];

/** Registros por dono: Negado → Apenas responsável → Equipe → Todos. */
export const OWNER_SCOPE_OPTIONS: readonly ScopeOption<string>[] = [
  { value: "none", label: "Negado", tone: "neutral" },
  {
    value: "own",
    label: "Resp.",
    hint: "Apenas os próprios registros",
    tone: "warn",
  },
  {
    value: "team",
    label: "Equipe",
    hint: "Em breve",
    disabled: true,
    tone: "brand",
  },
  { value: "all", label: "Todos", tone: "brand" },
];

/** Canais: Negado → Ver → Responder → Total (administrar). */
export const CHANNEL_SCOPE_OPTIONS: readonly ScopeOption<string>[] = [
  { value: "none", label: "Negado", tone: "neutral" },
  { value: "view", label: "Ver", tone: "brand" },
  { value: "reply", label: "Responder", tone: "brand" },
  {
    value: "manage",
    label: "Total",
    hint: "Administrar o canal",
    tone: "brand",
  },
];
