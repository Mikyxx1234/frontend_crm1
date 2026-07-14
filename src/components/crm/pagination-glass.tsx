"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

interface PaginationGlassProps {
  label?: string;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
  /** Valor atual de itens por página. Quando definido junto de `onPerPageChange`, renderiza o seletor. */
  perPage?: number;
  onPerPageChange?: (value: number) => void;
  /** Opções do seletor de itens por página. Default: 25, 50, 100. */
  perPageOptions?: readonly number[];
  /** Esconde os botões Anterior/Próxima (ex.: listas com scroll infinito). */
  showNav?: boolean;
}

const DEFAULT_PER_PAGE_OPTIONS = [25, 50, 100] as const;

export function PaginationGlass({
  label,
  canPrev = false,
  canNext = false,
  onPrev,
  onNext,
  className,
  perPage,
  onPerPageChange,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
  showNav = true,
}: PaginationGlassProps) {
  const showPerPage = perPage !== undefined && onPerPageChange !== undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {label && (
          <span className="shrink-0 font-body text-[12px] leading-snug text-[var(--text-muted)] sm:text-[13px]">
            {label}
          </span>
        )}
        {showPerPage && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 font-body text-[12px] text-[var(--text-muted)]">
              Por página
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
              {perPageOptions.map((opt) => {
                const active = opt === perPage;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onPerPageChange?.(opt)}
                    aria-pressed={active}
                    className={cn(
                      "cursor-pointer rounded-full px-2.5 py-1 font-display text-[12px] font-bold tabular-nums transition-colors",
                      active
                        ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.30)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showNav && (
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 font-display text-xs font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60 sm:flex-none sm:px-3.5"
          >
            <IconChevronLeft size={14} className="shrink-0" />
            Anterior
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 font-display text-xs font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60 sm:flex-none sm:px-3.5"
          >
            Próxima
            <IconChevronRight size={14} className="shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
