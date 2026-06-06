"use client";

/*
 * Barra de filtros do dashboard comercial (Fase 1).
 *
 * Filtros: período, pipeline, etapa, tags, origem e consultor.
 * - Período e pipeline: DropdownGlass (single-select).
 * - Etapa/tags/origem/consultor: MultiSelectPopover.
 * - Chips de filtros ativos + "Limpar filtros" + contador.
 *
 * O estado mora na URL (useDashboardFilters); aqui só renderizamos e
 * disparamos `onPatch`/`onClear`.
 */

import { IconCalendar, IconFilter, IconX } from "@tabler/icons-react";

import { cn, tagPillStyle } from "@/lib/utils";
import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass";
import type { FilterOptionsResponse } from "@/components/pipeline/kanban-filters/types";

import {
  SOURCE_NONE,
  type DashboardFiltersState,
  type PeriodKey,
} from "@/features/dashboard-v2/api";
import { countActiveDashboardFilters } from "@/features/dashboard-v2/use-dashboard-filters";
import {
  MultiSelectPopover,
  type MultiSelectOption,
} from "@/features/dashboard-v2/components/multi-select-popover";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7", label: "Últimos 7 dias" },
  { value: "last_30", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "custom", label: "Personalizado" },
];

const PERIOD_LABELS: Record<PeriodKey, string> = Object.fromEntries(
  PERIOD_OPTIONS.map((o) => [o.value, o.label]),
) as Record<PeriodKey, string>;

function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

interface DashboardFiltersBarProps {
  filters: DashboardFiltersState;
  onPatch: (partial: Partial<DashboardFiltersState>) => void;
  onClear: () => void;
  options?: FilterOptionsResponse;
  /** Pipeline em uso (selecionado ou o resolvido pelo backend). */
  effectivePipelineId?: string;
  /** Em "Atendimento" só mostramos o período. */
  showStructural: boolean;
}

export function DashboardFilters({
  filters,
  onPatch,
  onClear,
  options,
  effectivePipelineId,
  showStructural,
}: DashboardFiltersBarProps) {
  const activeCount = countActiveDashboardFilters(filters);

  const periodOptions: DropdownOption[] = PERIOD_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    icon: <IconCalendar size={15} />,
  }));

  const pipelines = options?.pipelines ?? [];
  const pipelineOptions: DropdownOption[] = pipelines.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <IconFilter size={15} />,
  }));

  const activePipeline = pipelines.find((p) => p.id === effectivePipelineId);
  const stageOptions: MultiSelectOption[] = (activePipeline?.stages ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ value: s.id, label: s.name, color: s.color }));

  const tagOptions: MultiSelectOption[] = (options?.tags ?? []).map((t) => ({
    value: t.id,
    label: t.name,
    color: t.color,
  }));

  const sourceOptions: MultiSelectOption[] = [
    { value: SOURCE_NONE, label: "Sem origem" },
    ...(options?.sources ?? []).map((s) => ({ value: s, label: s })),
  ];

  const ownerOptions: MultiSelectOption[] = (options?.users ?? []).map((u) => ({
    value: u.id,
    label: u.name,
    sub: u.role,
  }));

  // Mapas para os labels dos chips.
  const stageName = new Map(stageOptions.map((s) => [s.value, s.label]));
  const tagInfo = new Map(tagOptions.map((t) => [t.value, t]));
  const ownerName = new Map(ownerOptions.map((o) => [o.value, o.label]));

  function handlePeriod(value: PeriodKey) {
    if (value === "custom") {
      onPatch({
        period: "custom",
        startDate: filters.startDate ?? todayISODate(),
        endDate: filters.endDate ?? todayISODate(),
      });
    } else {
      onPatch({ period: value, startDate: undefined, endDate: undefined });
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2.5">
        <DropdownGlass
          options={periodOptions}
          value={filters.period}
          onValueChange={(v) => handlePeriod(v as PeriodKey)}
          menuLabel="Período"
          triggerClassName="min-w-[160px]"
        />

        {filters.period === "custom" && (
          <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--brand-primary)]/40 bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-sm">
            <IconCalendar size={15} className="shrink-0 text-[var(--text-muted)]" />
            <input
              type="date"
              value={filters.startDate ?? ""}
              max={filters.endDate}
              onChange={(e) => onPatch({ startDate: e.target.value })}
              className="h-6 border-0 bg-transparent font-display text-[12px] font-semibold text-[var(--text-primary)] outline-none"
            />
            <span className="text-[12px] text-[var(--text-muted)]">—</span>
            <input
              type="date"
              value={filters.endDate ?? ""}
              min={filters.startDate}
              onChange={(e) => onPatch({ endDate: e.target.value })}
              className="h-6 border-0 bg-transparent font-display text-[12px] font-semibold text-[var(--text-primary)] outline-none"
            />
          </div>
        )}

        {showStructural && (
          <>
            {pipelineOptions.length > 0 && (
              <DropdownGlass
                options={pipelineOptions}
                value={effectivePipelineId}
                onValueChange={(v) => onPatch({ pipelineId: v, stageIds: [] })}
                placeholder="Pipeline"
                menuLabel="Pipeline"
                triggerClassName="min-w-[150px]"
              />
            )}

            <MultiSelectPopover
              label="Etapa"
              icon={<IconFilter size={14} />}
              options={stageOptions}
              selected={filters.stageIds}
              onChange={(stageIds) => onPatch({ stageIds })}
              emptyLabel="Selecione um pipeline"
            />

            <MultiSelectPopover
              label="Tags"
              options={tagOptions}
              selected={filters.tagIds}
              onChange={(tagIds) => onPatch({ tagIds })}
              emptyLabel="Nenhuma tag cadastrada"
            />

            <MultiSelectPopover
              label="Origem"
              options={sourceOptions}
              selected={filters.sources}
              onChange={(sources) => onPatch({ sources })}
            />

            <MultiSelectPopover
              label="Consultor"
              options={ownerOptions}
              selected={filters.ownerIds}
              onChange={(ownerIds) => onPatch({ ownerIds })}
              emptyLabel="Nenhum consultor disponível"
            />
          </>
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 font-display text-[12px] font-semibold text-[var(--text-secondary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]"
          >
            <IconX size={14} />
            Limpar filtros
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          </button>
        )}
      </div>

      {/* Chips de filtros ativos */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.period !== "this_month" && (
            <Chip
              label="Período"
              value={
                filters.period === "custom" && filters.startDate && filters.endDate
                  ? `${filters.startDate} — ${filters.endDate}`
                  : PERIOD_LABELS[filters.period]
              }
              onRemove={() =>
                onPatch({ period: "this_month", startDate: undefined, endDate: undefined })
              }
            />
          )}
          {showStructural && filters.pipelineId && activePipeline && (
            <Chip
              label="Pipeline"
              value={activePipeline.name}
              onRemove={() => onPatch({ pipelineId: undefined, stageIds: [] })}
            />
          )}
          {showStructural && filters.stageIds.length > 0 && (
            <Chip
              label="Etapas"
              value={filters.stageIds
                .map((id) => stageName.get(id) ?? id)
                .join(", ")}
              onRemove={() => onPatch({ stageIds: [] })}
            />
          )}
          {showStructural &&
            filters.tagIds.length > 0 &&
            filters.tagIds.map((id) => {
              const tag = tagInfo.get(id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 font-display text-[11px] font-semibold"
                  style={tagPillStyle(tag?.label ?? "", tag?.color)}
                >
                  {tag?.label ?? id}
                  <button
                    type="button"
                    onClick={() =>
                      onPatch({ tagIds: filters.tagIds.filter((t) => t !== id) })
                    }
                    aria-label="Remover tag"
                    className="opacity-70 transition-opacity hover:opacity-100"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              );
            })}
          {showStructural && filters.sources.length > 0 && (
            <Chip
              label="Origem"
              value={filters.sources
                .map((s) => (s === SOURCE_NONE ? "Sem origem" : s))
                .join(", ")}
              onRemove={() => onPatch({ sources: [] })}
            />
          )}
          {showStructural && filters.ownerIds.length > 0 && (
            <Chip
              label="Consultor"
              value={filters.ownerIds
                .map((id) => ownerName.get(id) ?? id)
                .join(", ")}
              onRemove={() => onPatch({ ownerIds: [] })}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Chip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[280px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-1 font-display text-[11px] font-semibold text-[var(--text-secondary)]",
      )}
    >
      <span className="text-[var(--text-muted)]">{label}:</span>
      <span className="truncate text-[var(--text-primary)]">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--color-danger)]"
      >
        <IconX size={12} />
      </button>
    </span>
  );
}
