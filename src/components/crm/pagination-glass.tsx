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
}

export function PaginationGlass({
  label,
  canPrev = false,
  canNext = false,
  onPrev,
  onNext,
  className,
}: PaginationGlassProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {label && <span className="font-body text-[13px] text-[var(--text-muted)]">{label}</span>}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-xs font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60"
        >
          <IconChevronLeft size={14} /> Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-xs font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60"
        >
          Próxima <IconChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
