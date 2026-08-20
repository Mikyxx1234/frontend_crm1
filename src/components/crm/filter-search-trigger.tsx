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
        // Botão foi de "ícone quadrado" pra pill com texto "Filtrar" —
        // operadores relatavam que o ícone de sliders sozinho era pequeno
        // demais e passava despercebido. `gap-1.5` separa o ícone do
        // rótulo; `px-2.5`/`h-7` mantém a altura casada com o input.
        "absolute right-1.5 top-1/2 flex h-7 -translate-y-1/2 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors",
        activeCount > 0 || filtersOpen
          ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
          : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
      )}
    >
      <IconAdjustmentsHorizontal size={15} stroke={2} />
      <span className="font-display text-[11px] font-semibold leading-none">
        Filtrar
      </span>
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
        // pr-24 (~96px) reserva espaço pro pill "Filtrar" (com contador
        // quando ativo). Antes era pr-11 pro ícone-quadrado — sem esse
        // ajuste o placeholder ficava por trás do botão.
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--chat-field)] pl-9 pr-24 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
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
