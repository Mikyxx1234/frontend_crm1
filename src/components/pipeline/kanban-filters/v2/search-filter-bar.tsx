/**
 * Barra de busca + painel de filtros segmentado — padrão Contatos.
 *
 * Input redondo com botão de ajustes que abre um popover com abas
 * (Atalhos · Negócio · Pessoas · Datas · Tags · Personalizados),
 * reutilizando as seções e o `useFilterDraft` de `./core.tsx`.
 */

"use client";

import * as React from "react";
import {
  IconAdjustmentsHorizontal,
  IconArrowsSort,
  IconBolt,
  IconBriefcase,
  IconCalendarStats,
  IconCheck,
  IconRotateClockwise,
  IconSearch,
  IconTag,
  IconUsers,
  IconWand,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import {
  ContactCustomFieldsSection,
  ContactSection,
  CreatedAtSection,
  DealCustomFieldsSection,
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
  type SetDraftField,
} from "./core";
import type { AdvancedDealFilters, FilterOptionsResponse } from "../types";
import { countActiveFilters } from "../types";

export type PipelineSortKey =
  | "default"
  | "interaction_newest"
  | "interaction_oldest"
  | "name_az"
  | "name_za"
  | "created_newest"
  | "created_oldest";

const SORT_OPTIONS: { key: PipelineSortKey; label: string }[] = [
  { key: "default", label: "Padrão (posição)" },
  { key: "interaction_newest", label: "Última interação: mais recente" },
  { key: "interaction_oldest", label: "Última interação: mais antiga" },
  { key: "name_az", label: "Nome: A → Z" },
  { key: "name_za", label: "Nome: Z → A" },
  { key: "created_newest", label: "Criação: mais recente" },
  { key: "created_oldest", label: "Criação: mais antiga" },
];

type TabId =
  | "ordenar"
  | "atalhos"
  | "negocio"
  | "pessoas"
  | "datas"
  | "tags"
  | "custom";

const BASE_TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "ordenar", label: "Ordenar", icon: <IconArrowsSort size={13} stroke={2.2} /> },
  { id: "atalhos", label: "Atalhos", icon: <IconBolt size={13} stroke={2.2} /> },
  { id: "negocio", label: "Negócio", icon: <IconBriefcase size={13} stroke={2.2} /> },
  { id: "pessoas", label: "Pessoas", icon: <IconUsers size={13} stroke={2.2} /> },
  { id: "datas", label: "Datas", icon: <IconCalendarStats size={13} stroke={2.2} /> },
  { id: "tags", label: "Tags", icon: <IconTag size={13} stroke={2.2} /> },
  { id: "custom", label: "Custom", icon: <IconWand size={13} stroke={2.2} /> },
];

function tabCount(id: TabId, f: AdvancedDealFilters): number {
  switch (id) {
    case "negocio": {
      let n = 0;
      if (f.search?.trim()) n++;
      if (f.statuses?.length) n++;
      if (f.lostReasons?.length) n++;
      if (f.stageIds?.length) n++;
      if (f.sources?.length || f.withoutSource) n++;
      if (f.valueFrom != null || f.valueTo != null) n++;
      return n;
    }
    case "pessoas": {
      let n = 0;
      if (f.ownerIds?.length || f.withoutOwner) n++;
      if (
        f.contactSearch?.trim() ||
        f.contactHasPhone != null ||
        f.contactHasEmail != null ||
        f.withoutContact
      )
        n++;
      return n;
    }
    case "datas": {
      let n = 0;
      if (f.createdAt?.from || f.createdAt?.to) n++;
      if (f.updatedAt?.from || f.updatedAt?.to) n++;
      if (f.closedAt?.from || f.closedAt?.to) n++;
      if (f.lastInteractionAt?.from || f.lastInteractionAt?.to) n++;
      return n;
    }
    case "tags":
      return f.tagIds?.length || f.withoutTags ? 1 : 0;
    case "custom":
      return (f.dealCustomFields?.length ?? 0) + (f.contactCustomFields?.length ?? 0);
    default:
      return 0;
  }
}

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
  const [tab, setTab] = React.useState<TabId>("ordenar");

  const hasCustomFields =
    (options?.dealCustomFields?.length ?? 0) > 0 ||
    (options?.contactCustomFields?.length ?? 0) > 0;

  const tabs = React.useMemo(
    () => BASE_TABS.filter((t) => (t.id === "custom" ? hasCustomFields : true)),
    [hasCustomFields],
  );

  // Se a aba ativa deixar de existir (ex.: sem custom fields), volta pra Ordenar.
  React.useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab("ordenar");
  }, [tabs, tab]);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const { draft, setDraftField, applyWhole, toggleArray, reset } = useFilterDraft(
    filters,
    onApplyFilters,
  );

  // sync quando `filters` mudar por fora
  React.useEffect(() => {
    if (!open) return;
    // useFilterDraft já dá pull no `value`; nada extra a fazer.
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const activeCount = countActiveFilters(filters) + (search.trim() ? 1 : 0);
  const draftCount = countActiveFilters(draft);

  const section = {
    draft,
    options,
    optionsLoading,
    optionsError: optionsError ?? null,
    setDraftField: setDraftField as SetDraftField,
    toggleArray,
  };

  function handleClear() {
    reset();
    onClearFilters();
  }

  function handleApply() {
    applyWhole(draft);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <IconSearch
        size={15}
        className="absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label="Buscar e filtrar negócios"
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtros"
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
          activeCount > 0 || open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
        )}
      >
        <IconAdjustmentsHorizontal size={15} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(100vw-2rem,520px)] flex-col rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-left shadow-[var(--glass-shadow-lg)] backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                Filtros
              </span>
              {(draftCount || activeCount) > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
                  {draftCount || activeCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={draftCount === 0 && activeCount === 0}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          {/* Abas segmentadas */}
          <div className="px-4 pb-3">
            <div
              role="tablist"
              aria-label="Seções do filtro"
              className="flex items-center gap-0.5 rounded-full bg-[var(--glass-bg-strong)] p-1"
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                const badge = tabCount(t.id, draft);
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-display text-[11.5px] font-bold transition-all",
                      active
                        ? "bg-[var(--glass-bg-modal,#fff)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                          active
                            ? "bg-[var(--brand-primary)] text-white"
                            : "bg-[var(--glass-border)] text-[var(--text-secondary)]",
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo da aba */}
          <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto px-4 pb-3">
            {tab === "ordenar" && (
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map((opt) => {
                  const active = sortKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onSortKeyChange?.(opt.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold transition-colors",
                        active
                          ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <span>{opt.label}</span>
                      {active && <IconCheck size={14} stroke={2.6} />}
                    </button>
                  );
                })}
              </div>
            )}
            {tab === "atalhos" && (
              <QuickFiltersList draft={draft} onApply={applyWhole} orientation="vertical" />
            )}
            {tab === "negocio" && (
              <>
                <SearchSection {...section} />
                <StatusSection {...section} />
                <LossReasonsSection {...section} />
                <StagesSection {...section} />
                <SourcesSection {...section} />
                <ValueSection {...section} />
              </>
            )}
            {tab === "pessoas" && (
              <>
                <OwnersSection {...section} />
                <ContactSection {...section} />
              </>
            )}
            {tab === "datas" && (
              <>
                <CreatedAtSection {...section} />
                <OtherDatesSection {...section} />
              </>
            )}
            {tab === "tags" && <TagsSection {...section} />}
            {tab === "custom" && (
              <>
                <DealCustomFieldsSection {...section} />
                <ContactCustomFieldsSection {...section} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--glass-border-subtle)] px-4 py-3">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
            >
              {draftCount > 0 ? `Aplicar (${draftCount})` : "Aplicar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
