/**
 * Barra de busca do Kanban — abre o modal canônico de filtros (B + Kommo).
 *
 * O popover tabulado anterior foi substituído pelo FilterModalThreeCol:
 * shell de Dialog central + 3 colunas (visualizações · propriedades · tags),
 * com multi-seletores fechados para listas longas. [jul/26]
 */

"use client";

import * as React from "react";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { countActiveFilters, type AdvancedDealFilters } from "../types";
import { createSavedFilter } from "../api";
import {
  FilterModalThreeCol,
  type PipelineSortKey,
} from "./variant-modal-three-col";
import type { FilterOptionsResponse } from "../types";

export type { PipelineSortKey };

interface PipelineSearchFilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  filters: AdvancedDealFilters;
  onApplyFilters: (next: AdvancedDealFilters) => void;
  onClearFilters: () => void;
  options: FilterOptionsResponse | null;
  optionsLoading: boolean;
  optionsError?: string | null;
  sortKey?: PipelineSortKey;
  onSortKeyChange?: (key: PipelineSortKey) => void;
  placeholder?: string;
  className?: string;
}

export function PipelineSearchFilterBar({
  search,
  onSearch,
  filters,
  onApplyFilters,
  onClearFilters,
  options,
  optionsLoading,
  optionsError,
  sortKey = "default",
  onSortKeyChange,
  placeholder = "Pesquisar e filtrar...",
  className,
}: PipelineSearchFilterBarProps) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const activeCount = countActiveFilters(filters) + (search.trim() ? 1 : 0);

  async function handleSave(current: AdvancedDealFilters) {
    if (saving) return;
    const name = window.prompt("Nome do filtro salvo:");
    if (!name?.trim()) return;
    setSaving(true);
    try {
      await createSavedFilter({
        name: name.trim(),
        entityType: "kanban_deals",
        filterConfig: current,
        isShared: false,
      });
      toast.success("Filtro salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o filtro.");
    } finally {
      setSaving(false);
    }
  }

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
        aria-label="Buscar e filtrar negócios"
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={activeCount > 0 ? `Filtros (${activeCount} ativos)` : "Filtros"}
        title={activeCount > 0 ? `${activeCount} filtro(s) ativo(s)` : "Filtros"}
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 -translate-y-1/2 items-center justify-center gap-0.5 rounded-full transition-colors",
          activeCount > 0 ? "min-w-7 px-1.5" : "w-7",
          activeCount > 0 || open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
        )}
      >
        <IconAdjustmentsHorizontal size={15} />
        {activeCount > 0 && (
          <span className="font-display text-[10px] font-bold leading-none tabular-nums">
            {activeCount}
          </span>
        )}
      </button>

      <FilterModalThreeCol
        open={open}
        onOpenChange={setOpen}
        value={filters}
        options={options}
        optionsLoading={optionsLoading}
        optionsError={optionsError ?? null}
        onApply={onApplyFilters}
        onClear={onClearFilters}
        onRequestSave={handleSave}
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
      />
    </div>
  );
}
