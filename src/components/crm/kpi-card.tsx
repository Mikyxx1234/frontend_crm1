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
            "flex min-w-0 items-baseline gap-1.5 font-display text-[24px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]",
            "max-sm:text-[20px]",
            compact && "text-[20px]",
          )}
        >
          <span className="min-w-0 truncate">{value}</span>
          {hint && (
            <small className="shrink-0 text-[13px] font-semibold text-[var(--text-muted)]">
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

export type KpiSquareItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  /** Tom do ícone (padrão Contatos/Empresas). */
  tone?: KpiTone;
  /** Cor CSS alternativa ao tone (padrão Logs/Distribuição). */
  accent?: string;
  percent?: number;
  active?: boolean;
  onClick?: () => void;
};

const KPI_SQUARE_SCROLL_CLASS =
  "-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden lg:hidden";

/**
 * Faixa mobile/APK: KPIs em quadrados com h-scroll (libera altura de tela).
 * Em `lg+` não renderiza — o caller mantém o grid/desktop separado.
 */
export function KpiSquareScroll({
  items,
  className,
}: {
  items: readonly KpiSquareItem[];
  className?: string;
}) {
  return (
    <div className={cn(KPI_SQUARE_SCROLL_CLASS, className)}>
      {items.map((item) => {
        const classNames = cn(
          "flex aspect-square w-[104px] shrink-0 flex-col justify-between rounded-[var(--radius-xl)] border p-2.5 text-left shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-colors",
          item.active
            ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-base)]",
          item.onClick && !item.active && "cursor-pointer",
        );

        const iconWrap = item.tone ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-[var(--radius-md)] [&>svg]:size-4",
              KPI_TONES[item.tone],
            )}
          >
            {item.icon}
          </span>
        ) : (
          <span
            className="flex size-7 items-center justify-center rounded-full"
            style={
              item.accent
                ? {
                    background: `color-mix(in srgb, ${item.accent} 14%, transparent)`,
                    color: item.accent,
                  }
                : undefined
            }
          >
            {item.icon}
          </span>
        );

        const body = (
          <>
            {iconWrap}
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <p className="truncate font-display text-[18px] font-extrabold leading-none tabular-nums text-[var(--text-primary)]">
                  {item.value}
                </p>
                {item.percent !== undefined && (
                  <span
                    className="font-display text-[10px] font-bold tabular-nums"
                    style={item.accent ? { color: item.accent } : undefined}
                  >
                    {item.percent}%
                  </span>
                )}
              </div>
              <p className="mt-1 truncate font-display text-[10px] font-semibold uppercase leading-tight tracking-[0.02em] text-[var(--text-muted)]">
                {item.label}
              </p>
            </div>
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.active}
              onClick={item.onClick}
              className={classNames}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={item.key} className={classNames}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
