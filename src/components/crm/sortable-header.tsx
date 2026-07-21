"use client";

import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc" | null;

/** Faixa de cabeçalho de colunas — referência: `/logs` (Feed).
 *  Default `grid`; passe a classe `flex` para tabelas com scroll-X (contatos). */
export function listTableHeadRowClass(className?: string) {
  const usesFlex = /(^|\s)flex(\s|$)/.test(className ?? "");
  return cn(
    "items-center gap-3.5 rounded-[var(--radius-md)] border-b border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-3.5 py-2.5",
    !usesFlex && "grid",
    className,
  );
}

/** Rótulo estático de coluna (sem ordenação). Mesma tipografia do SortableHeader. */
export function ListColumnLabel({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "font-display text-[13px] font-semibold tracking-normal text-[var(--text-muted)]",
        align === "right" && "block text-right",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SortableHeaderProps {
  label: string;
  sort?: SortDir;
  onSort?: () => void;
  align?: "left" | "right";
  className?: string;
}

/**
 * Cabeçalho de coluna ordenável — padrão canônico de listas (referência: Logs).
 * Sentence case, 13px, ícones de sort; sem caixa alta.
 */
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
        "group inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-display text-[13px] font-semibold tracking-normal transition-colors",
        sort
          ? "text-[var(--brand-primary)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        align === "right" && "flex-row-reverse justify-end",
        className,
      )}
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {sort === "asc" ? (
        <IconChevronUp size={12} strokeWidth={2.5} />
      ) : sort === "desc" ? (
        <IconChevronDown size={12} strokeWidth={2.5} />
      ) : (
        <IconSelector size={12} className="opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}
