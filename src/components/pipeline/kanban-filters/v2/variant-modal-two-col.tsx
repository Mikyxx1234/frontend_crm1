/**
 * Variação C — Modal de duas colunas (DS v2).
 *
 * Diálogo grande (~90vw / 1000px). Coluna esquerda: navegação por categorias
 * com contagem de ativos. Coluna direita: conteúdo amplo da categoria. Estilo
 * tela de configurações.
 */

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  CalendarRange,
  SlidersHorizontal,
  Tag as TagIcon,
  Users as UsersIcon,
  Wand2,
  Zap,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  ActiveCountBadge,
  ContactCustomFieldsSection,
  ContactSection,
  CreatedAtSection,
  DealCustomFieldsSection,
  FilterHeaderActions,
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

type GroupId = "quick" | "deal" | "dates" | "people" | "tags" | "custom";

const GROUPS: { id: GroupId; label: string; icon: React.ElementType; hint: string }[] = [
  { id: "quick", label: "Atalhos", icon: Zap, hint: "Filtros rápidos e salvos" },
  { id: "deal", label: "Negócio", icon: Briefcase, hint: "Nome, status, etapa, valor" },
  { id: "dates", label: "Datas", icon: CalendarRange, hint: "Criação, fechamento, interação" },
  { id: "people", label: "Pessoas", icon: UsersIcon, hint: "Responsável e contato" },
  { id: "tags", label: "Tags", icon: TagIcon, hint: "Etiquetas do negócio" },
  { id: "custom", label: "Personalizados", icon: Wand2, hint: "Campos de negócio e contato" },
];

function groupCount(id: GroupId, f: AdvancedDealFilters): number {
  let n = 0;
  switch (id) {
    case "deal":
      if (f.search?.trim()) n++;
      if (f.statuses?.length) n++;
      if (f.stageIds?.length) n++;
      if (f.sources?.length) n++;
      if (f.valueFrom != null || f.valueTo != null) n++;
      break;
    case "dates":
      if (f.createdAt?.from || f.createdAt?.to) n++;
      if (f.updatedAt?.from || f.updatedAt?.to) n++;
      if (f.closedAt?.from || f.closedAt?.to) n++;
      if (f.lastInteractionAt?.from || f.lastInteractionAt?.to) n++;
      break;
    case "people":
      if (f.ownerIds?.length || f.withoutOwner) n++;
      if (f.contactSearch?.trim() || f.contactHasPhone != null || f.contactHasEmail != null || f.withoutContact) n++;
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

export function FilterModalTwoCol({
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
  const [group, setGroup] = React.useState<GroupId>("quick");

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onMouseDown={() => onOpenChange(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros avançados"
        className="relative flex h-[min(82vh,720px)] w-[min(1000px,100%)] overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)]"
      >
        {/* Coluna nav */}
        <aside className="flex w-[248px] shrink-0 flex-col border-r border-black/6 bg-slate-50/70">
          <div className="flex items-center gap-2.5 px-4 py-4">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <SlidersHorizontal className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Filtros</h2>
              <ActiveCountBadge draft={draft} />
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
            {GROUPS.map((g) => {
              const count = groupCount(g.id, draft);
              const active = group === g.id;
              const Icon = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroup(g.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    active ? "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]" : "hover:bg-white/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px] font-medium", active ? "text-slate-900" : "text-slate-700")}>
                      {g.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">{g.hint}</span>
                  </span>
                  {count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-black/6 p-3">
            <FilterHeaderActions
              draft={draft}
              onClear={() => {
                reset();
                onClear();
              }}
              onRequestSave={onRequestSave}
            />
          </div>
        </aside>

        {/* Coluna conteúdo */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-black/6 px-6 py-4">
            <div>
              <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">
                {GROUPS.find((g) => g.id === group)?.label}
              </h3>
              <p className="text-[12px] text-slate-400">{GROUPS.find((g) => g.id === group)?.hint}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {group === "quick" && (
              <div className="rounded-xl border border-black/6 bg-white p-3">
                <QuickFiltersList draft={draft} onApply={applyWhole} onRequestSave={onRequestSave} orientation="vertical" />
              </div>
            )}
            {group === "deal" && (
              <>
                <SearchSection {...section} />
                <StatusSection {...section} />
                <StagesSection {...section} />
                <SourcesSection {...section} />
                <ValueSection {...section} />
              </>
            )}
            {group === "dates" && (
              <>
                <CreatedAtSection {...section} />
                <OtherDatesSection {...section} />
              </>
            )}
            {group === "people" && (
              <>
                <OwnersSection {...section} />
                <ContactSection {...section} />
              </>
            )}
            {group === "tags" && <TagsSection {...section} />}
            {group === "custom" && (
              <>
                <DealCustomFieldsSection {...section} />
                <ContactCustomFieldsSection {...section} />
              </>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-black/6 px-6 py-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
            >
              Aplicar filtros
            </button>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
