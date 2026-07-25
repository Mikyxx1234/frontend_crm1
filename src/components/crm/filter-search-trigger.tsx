"use client";

/**
 * Trigger canônico de busca + filtro (pill com ajustes à direita).
 *
 * Extraído do Kanban (`PipelineSearchFilterBar`) para reuso no Inbox e demais
 * barras. Ícone: `IconAdjustmentsHorizontal` (sliders horizontais).
 */

import * as React from "react";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

export type FilterSearchTriggerProps = {
  search: string;
  onSearch: (value: string) => void;
  onOpenFilters: () => void;
  /** Estado aberto do modal — destaca o botão. */
  filtersOpen?: boolean;
  activeCount?: number;
  placeholder?: string;
  ariaLabel?: string;
  /** Tooltip glass (Inbox). Sem isto, usa `title` nativo como no Kanban. */
  tooltipLabel?: string;
  className?: string;
};

export function FilterSearchTrigger({
  search,
  onSearch,
  onOpenFilters,
  filtersOpen = false,
  activeCount = 0,
  placeholder = "Pesquisar e filtrar...",
  ariaLabel,
  tooltipLabel,
  className,
}: FilterSearchTriggerProps) {
  const filterAria =
    activeCount > 0 ? `Filtros (${activeCount} ativos)` : "Filtros";
  const filterTitle =
    activeCount > 0 ? `${activeCount} filtro(s) ativo(s)` : "Filtros";

  const filterButton = (
    <button
      type="button"
      onClick={onOpenFilters}
      aria-label={filterAria}
      title={tooltipLabel ? undefined : filterTitle}
      className={cn(
        "absolute right-1.5 top-1/2 flex h-7 -translate-y-1/2 items-center justify-center gap-0.5 rounded-full transition-colors",
        activeCount > 0 ? "min-w-7 px-1.5" : "w-7",
        activeCount > 0 || filtersOpen
          ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
          : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
      )}
    >
      <IconAdjustmentsHorizontal size={15} stroke={2} />
      {activeCount > 0 && (
        <span className="font-display text-[10px] font-bold leading-none tabular-nums">
          {activeCount}
        </span>
      )}
    </button>
  );

  return (
    <div className={cn("relative w-full", className)}>
      <IconSearch
        size={15}
        className="absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      {tooltipLabel ? (
        <TooltipGlass label={tooltipLabel} side="bottom">
          {filterButton}
        </TooltipGlass>
      ) : (
        filterButton
      )}
    </div>
  );
}
