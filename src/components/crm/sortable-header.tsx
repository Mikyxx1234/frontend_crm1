"use client";

import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc" | null;

interface SortableHeaderProps {
  label: string;
  sort?: SortDir;
  onSort?: () => void;
  align?: "left" | "right";
  className?: string;
}

/** Cabeçalho de coluna ordenável usado nas visões em tabela do V2. */
export function SortableHeader({
  label,
  sort = null,
  onSort,
  align = "left",
  className,
}: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        "group inline-flex cursor-pointer items-center gap-1 font-display text-[11px] font-bold uppercase tracking-[0.06em] transition-colors",
        sort
          ? "text-[var(--brand-primary)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        align === "right" && "flex-row-reverse",
        className,
      )}
    >
      {label}
      {sort === "asc" ? (
        <IconChevronUp size={13} strokeWidth={2.5} />
      ) : sort === "desc" ? (
        <IconChevronDown size={13} strokeWidth={2.5} />
      ) : (
        <IconSelector size={13} className="opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}
