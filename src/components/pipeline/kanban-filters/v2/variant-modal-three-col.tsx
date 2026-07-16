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
import { IconBriefcase as Briefcase, IconCalendarStats as CalendarRange, IconAdjustmentsHorizontal as SlidersHorizontal, IconTag as TagIcon, IconUsers as UsersIcon, IconWand as Wand2, IconBolt as Zap, IconChevronDown as ChevronDown, IconX as X } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-media-query";

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
import type { AdvancedDealFilters } from "../types";
import type { VariantProps } from "./types";

type GroupId = "quick" | "deal" | "people" | "dates" | "tags" | "custom";

const GROUPS: { id: GroupId; label: string; icon: React.ElementType; hint: string }[] = [
  { id: "quick", label: "Atalhos", icon: Zap, hint: "Filtros rápidos e salvos" },
  { id: "deal", label: "Negócio", icon: Briefcase, hint: "Nome, status, etapa, valor…" },
  { id: "people", label: "Pessoas", icon: UsersIcon, hint: "Responsável e contato" },
  { id: "dates", label: "Datas", icon: CalendarRange, hint: "Criação, fechamento…" },
  { id: "tags", label: "Tags", icon: TagIcon, hint: "Etiquetas do negócio" },
  { id: "custom", label: "Personalizados", icon: Wand2, hint: "Campos custom" },
];

function groupCount(id: GroupId, f: AdvancedDealFilters): number {
  let n = 0;
  switch (id) {
    case "deal":
      if (f.search?.trim()) n++;
      if (f.statuses?.length) n++;
      if (f.lostReasons?.length) n++;
      if (f.stageIds?.length) n++;
      if (f.sources?.length || f.withoutSource) n++;
      if (f.valueFrom != null || f.valueTo != null) n++;
      break;
    case "people":
      if (f.ownerIds?.length || f.withoutOwner) n++;
      if (f.contactSearch?.trim() || f.contactHasPhone != null || f.contactHasEmail != null || f.withoutContact) n++;
      break;
    case "dates":
      if (f.createdAt?.from || f.createdAt?.to) n++;
      if (f.updatedAt?.from || f.updatedAt?.to) n++;
      if (f.closedAt?.from || f.closedAt?.to) n++;
      if (f.lastInteractionAt?.from || f.lastInteractionAt?.to) n++;
      break;
    case "tags":
      if (f.tagIds?.length || f.withoutTags) n++;
      break;
    case "custom":
      n += (f.dealCustomFields?.length ?? 0) + (f.contactCustomFields?.length ?? 0);
      break;
    default:
      break;
  }
  return n;
}

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
  const isDesktop = useIsDesktop();
  const [openGroups, setOpenGroups] = React.useState<Set<GroupId>>(() => new Set(["quick"]));

  const toggleGroup = (id: GroupId) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  if (!isDesktop) {
    return createPortal(
      <div className="fixed inset-0 z-(--z-popover) flex items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onMouseDown={() => onOpenChange(false)} aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros avançados"
          className="relative flex h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                <SlidersHorizontal className="size-4" />
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">Filtros avançados</h2>
                <ActiveCountBadge draft={draft} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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

          {/* Corpo — accordion */}
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {GROUPS.map((g) => {
              const expanded = openGroups.has(g.id);
              const count = groupCount(g.id, draft);
              const Icon = g.icon;
              return (
                <section
                  key={g.id}
                  className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)]"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleGroup(g.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                      expanded ? "bg-[var(--color-enterprise-bg)]" : "hover:bg-[var(--glass-bg-overlay)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                        expanded ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[13px] font-bold text-[var(--text-primary)]">{g.label}</h3>
                        {count > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1.5 text-[11px] font-semibold text-white">
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">{g.hint}</p>
                    </div>
                    <ChevronDown className={cn("size-4 shrink-0 text-[var(--text-muted)] transition-transform", expanded && "rotate-180")} />
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-[var(--glass-border-subtle)] px-3 py-3">
                      {g.id === "quick" && (
                        <QuickFiltersList draft={draft} onApply={applyWhole} onRequestSave={onRequestSave} orientation="vertical" />
                      )}
                      {g.id === "deal" && (
                        <>
                          <SearchSection {...section} />
                          <StatusSection {...section} />
                          <LossReasonsSection {...section} />
                          <StagesSection {...section} />
                          <SourcesSection {...section} />
                          <ValueSection {...section} />
                        </>
                      )}
                      {g.id === "people" && (
                        <>
                          <OwnersSection {...section} />
                          <ContactSection {...section} />
                        </>
                      )}
                      {g.id === "dates" && (
                        <>
                          <CreatedAtSection {...section} />
                          <OtherDatesSection {...section} />
                        </>
                      )}
                      {g.id === "tags" && <TagsSection {...section} />}
                      {g.id === "custom" && (
                        <>
                          <DealCustomFieldsSection {...section} />
                          <ContactCustomFieldsSection {...section} />
                        </>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--glass-border-subtle)] px-3 py-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
            >
              Aplicar filtros
            </button>
          </footer>
        </div>
      </div>,
      document.body,
    );
  }

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
