/**
 * Barra de busca do Kanban — abre o modal canônico de filtros (B + Kommo).
 *
 * O popover tabulado anterior foi substituído pelo FilterModalThreeCol:
 * shell de Dialog central + 3 colunas (visualizações · propriedades · tags),
 * com multi-seletores fechados para listas longas. [jul/26]
 */

"use client";

import * as React from "react";
import { toast } from "sonner";

import { FilterSearchTrigger } from "@/components/crm/filter-search-trigger";

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
    <>
      <FilterSearchTrigger
        search={search}
        onSearch={onSearch}
        onOpenFilters={() => setOpen(true)}
        filtersOpen={open}
        activeCount={activeCount}
        placeholder={placeholder}
        ariaLabel="Buscar e filtrar negócios"
        className={className}
      />

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
    </>
  );
}
