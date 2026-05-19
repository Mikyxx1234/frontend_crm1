/**
 * Painel lateral (Sheet) com filtros avancados do Kanban.
 *
 * Wrapper fino sobre `FilterPanelBody` — mantido por retrocompatibilidade
 * com call-sites que ainda usam o sheet. O Kanban hoje usa
 * `FilterDropdown` ancorado no input "Buscar".
 */

"use client";

import * as React from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { FilterPanelBody } from "./filter-panel-body";
import { isEmptyFilters } from "./types";
import type { AdvancedDealFilters, FilterOptionsResponse } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: AdvancedDealFilters;
  options: FilterOptionsResponse | null;
  optionsLoading: boolean;
  onApply: (next: AdvancedDealFilters) => void;
  onClear: () => void;
  onRequestSave?: (current: AdvancedDealFilters) => void;
};

export function FilterPanel({
  open,
  onOpenChange,
  value,
  options,
  optionsLoading,
  onApply,
  onClear,
  onRequestSave,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md! flex flex-col gap-0 p-0">
        <SheetClose />
        <SheetHeader className="border-b border-zinc-200 px-5 py-4 text-start">
          <SheetTitle className="text-base">Filtros avançados</SheetTitle>
          <SheetDescription>
            Combine critérios para refinar o Kanban. Aplique para atualizar a visão.
          </SheetDescription>
        </SheetHeader>
        <FilterPanelBody
          value={value}
          options={options}
          optionsLoading={optionsLoading}
          onApply={onApply}
          onClear={onClear}
          onRequestSave={onRequestSave}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

export { isEmptyFilters };
