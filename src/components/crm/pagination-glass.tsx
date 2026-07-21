"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

interface PaginationGlassProps {
  /** Texto legado à esquerda (quando não há `total` estruturado). */
  label?: string;
  /** Total de itens — renderiza badge + "{entityLabel} · página X de Y". */
  total?: number;
  entityLabel?: string;
  page?: number;
  lastPage?: number;
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
  total,
  entityLabel = "itens",
  page,
  lastPage,
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
  const structured =
    typeof total === "number" &&
    typeof page === "number" &&
    typeof lastPage === "number";

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
        className,
      )}
    >
      {/* Esquerda: badge + resumo */}
      <div className="flex min-w-0 items-center gap-2.5">
        {structured ? (
          <>
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] px-3 font-display text-[13px] font-bold tabular-nums text-[var(--brand-primary)]">
              {total.toLocaleString("pt-BR")}
            </span>
            <span className="font-body text-[13px] text-[var(--text-muted)]">
              {entityLabel} · página{" "}
              <span className="font-semibold text-[var(--text-secondary)]">{page}</span>
              {" "}de{" "}
              <span className="font-semibold text-[var(--text-secondary)]">{lastPage}</span>
            </span>
          </>
        ) : label ? (
          <span className="shrink-0 font-body text-[12px] leading-snug text-[var(--text-muted)] sm:text-[13px]">
            {label}
          </span>
        ) : null}
      </div>

      {/* Direita: por página + navegação */}
      <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
        {showPerPage && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Por página
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-full bg-[var(--glass-bg-strong)] p-0.5">
              {perPageOptions.map((opt) => {
                const active = opt === perPage;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onPerPageChange?.(opt)}
                    aria-pressed={active}
                    className={cn(
                      "cursor-pointer rounded-[10px] px-2.5 py-1 font-display text-[12px] font-bold tabular-nums transition-colors",
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

        {showNav && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] px-3.5 font-display text-[12px] font-bold transition-colors",
                canPrev
                  ? "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
                  : "cursor-not-allowed text-[var(--text-muted)] opacity-50",
              )}
            >
              <IconChevronLeft size={14} className="shrink-0" />
              Anterior
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 font-display text-[12px] font-bold transition-all",
                canNext
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
                  : "cursor-not-allowed bg-[var(--glass-bg-strong)] text-[var(--text-muted)] opacity-60",
              )}
            >
              Próxima
              <IconChevronRight size={14} className="shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
