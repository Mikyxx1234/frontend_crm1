"use client";

import { cn } from "@/lib/utils";

export const KPI_TONES = {
  brand: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  violet: "bg-[rgba(167,139,250,0.18)] text-[var(--brand-secondary)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  warning: "bg-[var(--color-lead-bg)] text-[var(--color-warning)]",
  neutral: "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
} as const;

export type KpiTone = keyof typeof KPI_TONES;

type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  /** Texto auxiliar ao lado do valor (ex.: "de 5"). */
  hint?: string;
  icon: React.ReactNode;
  tone?: KpiTone;
  /** Quando true, destaca o card (filtro/segmento ativo). */
  active?: boolean;
  /** Se passado, o card vira botão acionável. */
  onClick?: () => void;
  className?: string;
  /** Força o layout compacto (padding/ícone/valor menores) em qualquer breakpoint. */
  compact?: boolean;
};

/**
 * Mini-KPI do padrão Automações: ícone à esquerda + label uppercase + valor.
 * Usado em Automações, Contatos e Empresas.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  active = false,
  onClick,
  className,
  compact = false,
}: KpiCardProps) {
  const classNames = cn(
    "flex items-center gap-3.5 rounded-[var(--radius-xl)] border px-4.5 py-4 text-left shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all",
    "max-sm:gap-2.5 max-sm:px-3 max-sm:py-3",
    compact && "gap-2.5 px-3 py-3",
    active
      ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] shadow-[0_8px_24px_rgba(91,111,245,0.12)]"
      : "border-[var(--glass-border)] bg-[var(--glass-bg-base)]",
    onClick &&
      !active &&
      "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--brand-primary)]/30 hover:shadow-[var(--glass-shadow)]",
    className,
  );

  const body = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          "max-sm:h-9 max-sm:w-9",
          compact && "h-9 w-9",
          KPI_TONES[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
          {label}
        </p>
        <p
          className={cn(
            "font-display text-[24px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]",
            "max-sm:text-[20px]",
            compact && "text-[20px]",
          )}
        >
          {value}
          {hint && (
            <small className="ml-1.5 text-[13px] font-semibold text-[var(--text-muted)]">
              {hint}
            </small>
          )}
        </p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={classNames}
      >
        {body}
      </button>
    );
  }

  return <div className={classNames}>{body}</div>;
}
