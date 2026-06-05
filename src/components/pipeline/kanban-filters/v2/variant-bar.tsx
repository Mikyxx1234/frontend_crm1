/**
 * Variação B — Barra + mega-painel (DS v2).
 *
 * Filtros como chips/atalhos numa barra horizontal sob o header. Um botão
 * "Filtros avançados" expande um painel full-width logo abaixo, com todas as
 * seções organizadas num grid responsivo. Inline (sem portal).
 */

"use client";

import * as React from "react";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  ActiveCountBadge,
  ContactCustomFieldsSection,
  ContactSection,
  CreatedAtSection,
  DealCustomFieldsSection,
  OtherDatesSection,
  OwnersSection,
  QuickFiltersList,
  SearchSection,
  SourcesSection,
  StagesSection,
  StatusSection,
  TagsSection,
  ValueSection,
  countActiveFilters,
  useFilterDraft,
  type SectionProps,
} from "./core";
import type { VariantProps } from "./types";

export function FilterBar({
  open,
  onOpenChange,
  value,
  options,
  optionsLoading,
  optionsError,
  onApply,
  onClear,
  onRequestSave,
}: VariantProps) {
  const { draft, setDraftField, applyWhole, toggleArray, reset } = useFilterDraft(value, onApply);
  const section: SectionProps = { draft, options, optionsLoading, optionsError, setDraftField, toggleArray };
  const activeCount = countActiveFilters(draft);

  return (
    <div className="rounded-2xl border border-black/6 bg-white">
      {/* Barra */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors",
            open || activeCount > 0
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filtros avançados
          {activeCount > 0 && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                open || activeCount > 0 ? "bg-white/25 text-white" : "bg-blue-600 text-white",
              )}
            >
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <QuickFiltersList draft={draft} onApply={applyWhole} orientation="horizontal" />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              reset();
              onClear();
            }}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-3.5" />
            Limpar ({activeCount})
          </button>
        )}
      </div>

      {/* Mega-painel */}
      {open && (
        <div className="border-t border-black/6 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-3">
              <SearchSection {...section} />
              <StatusSection {...section} />
              <SourcesSection {...section} />
            </div>
            <div className="space-y-3">
              <StagesSection {...section} />
              <ValueSection {...section} />
              <DealCustomFieldsSection {...section} />
            </div>
            <div className="space-y-3">
              <OwnersSection {...section} />
              <ContactSection {...section} />
              <ContactCustomFieldsSection {...section} />
            </div>
            <div className="space-y-3">
              <CreatedAtSection {...section} />
              <OtherDatesSection {...section} />
              <TagsSection {...section} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-black/6 pt-3">
            <span className="inline-flex items-center gap-2 text-[12px] text-slate-500">
              <ActiveCountBadge draft={draft} />
              {activeCount === 0 ? "Nenhum filtro ativo" : `${activeCount} ${activeCount === 1 ? "filtro ativo" : "filtros ativos"}`}
            </span>
            <div className="flex items-center gap-2">
              {onRequestSave && (
                <button
                  type="button"
                  onClick={() => onRequestSave(draft)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Salvar filtro
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
