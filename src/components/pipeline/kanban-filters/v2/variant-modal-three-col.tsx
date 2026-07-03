/**
 * Variação D — Modal de três colunas reorganizado (DS v2).
 *
 * Mantém o modal central do filtro atual, porém maior (~1120px), com hierarquia
 * revista e tokens DS v2:
 *   Col 1 (atalhos + salvos) · Col 2 (propriedades, 2 sub-colunas) · Col 3 (tags)
 */

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";

import {
  ActiveCountBadge,
  ContactCustomFieldsSection,
  ContactSection,
  CreatedAtSection,
  DealCustomFieldsSection,
  FilterHeaderActions,
  LossReasonsSection,
  OtherDatesSection,
  OwnersSection,
  QuickFiltersList,
  SearchSection,
  SourcesSection,
  StagesSection,
  StatusSection,
  TagsSection,
  ValueSection,
  useFilterDraft,
  type SectionProps,
} from "./core";
import type { VariantProps } from "./types";

export function FilterModalThreeCol({
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

  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  const section: SectionProps = { draft, options, optionsLoading, optionsError, setDraftField, toggleArray };

  return createPortal(
    <div className="fixed inset-0 z-(--z-popover) flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onMouseDown={() => onOpenChange(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros avançados"
        className="relative flex h-[min(84vh,760px)] w-[min(1120px,100%)] flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
              <SlidersHorizontal className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">Filtros avançados</h2>
              <ActiveCountBadge draft={draft} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FilterHeaderActions
              draft={draft}
              onClear={() => {
                reset();
                onClear();
              }}
              onRequestSave={onRequestSave}
            />
            <div className="h-6 w-px bg-[var(--glass-border-subtle)]" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* 3 colunas */}
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "232px minmax(0,1fr) 300px" }}>
          {/* Col 1 — Atalhos */}
          <aside className="flex flex-col overflow-y-auto border-r border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)] p-3">
            <span className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Atalhos</span>
            <QuickFiltersList draft={draft} onApply={applyWhole} onRequestSave={onRequestSave} orientation="vertical" />
          </aside>

          {/* Col 2 — Propriedades */}
          <main className="overflow-y-auto border-r border-[var(--glass-border-subtle)] p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <SearchSection {...section} />
                <StatusSection {...section} />
                <LossReasonsSection {...section} />
                <StagesSection {...section} />
                <SourcesSection {...section} />
                <ValueSection {...section} />
              </div>
              <div className="space-y-3">
                <OwnersSection {...section} />
                <ContactSection {...section} />
                <CreatedAtSection {...section} />
                <OtherDatesSection {...section} />
                <DealCustomFieldsSection {...section} />
                <ContactCustomFieldsSection {...section} />
              </div>
            </div>
          </main>

          {/* Col 3 — Tags */}
          <aside className="overflow-y-auto p-4">
            <TagsSection {...section} />
          </aside>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t border-[var(--glass-border-subtle)] px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
          >
            Aplicar filtros
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
