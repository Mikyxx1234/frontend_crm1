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
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {label && (
          <span className="font-body text-[13px] text-[var(--text-muted)]">{label}</span>
        )}
        {showPerPage && (
          <div className="flex items-center gap-1.5">
            <span className="font-body text-[12px] text-[var(--text-muted)]">Por página</span>
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
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-xs font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60"
          >
            <IconChevronLeft size={14} /> Anterior
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-xs font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60"
          >
            Próxima <IconChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
