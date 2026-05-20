/**
 * Conteudo (body) dos filtros avancados — reusavel em:
 *   - FilterPanel (Sheet lateral, legacy)
 *   - FilterDropdown (popover ancorado no input "Buscar")
 *
 * Encapsula o estado de "draft" do filtro, comportamento de Apply/Clear/Save
 * e renderiza todas as secoes de criterios.
 */

"use client";

import * as React from "react";
import { Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  DATE_PRESET_LABELS,
  dateRangeFromPreset,
  detectPreset,
  type DatePresetKey,
} from "./date-presets";
import type {
  AdvancedDealFilters,
  CustomField,
  CustomFieldFilter,
  CustomFieldOperator,
  DateRangeValue,
  FilterOptionsResponse,
  TagMode,
} from "./types";
import { isEmptyFilters } from "./types";

const STATUS_OPTIONS: { value: "OPEN" | "WON" | "LOST"; label: string }[] = [
  { value: "OPEN", label: "Aberto" },
  { value: "WON", label: "Ganho" },
  { value: "LOST", label: "Perdido" },
];

const TAG_MODE_OPTIONS: { value: TagMode; label: string }[] = [
  { value: "any", label: "Qualquer uma" },
  { value: "all", label: "Todas" },
  { value: "none", label: "Nenhuma das informadas" },
];

const CUSTOM_OPERATORS: { value: CustomFieldOperator; label: string; needsValue: boolean }[] = [
  { value: "contains", label: "Contém", needsValue: true },
  { value: "not_contains", label: "Não contém", needsValue: true },
  { value: "eq", label: "É igual a", needsValue: true },
  { value: "neq", label: "É diferente de", needsValue: true },
  { value: "filled", label: "Preenchido", needsValue: false },
  { value: "empty", label: "Vazio", needsValue: false },
  { value: "in", label: "É uma das", needsValue: true },
  { value: "gt", label: "Maior que", needsValue: true },
  { value: "lt", label: "Menor que", needsValue: true },
  { value: "before", label: "Antes de", needsValue: true },
  { value: "after", label: "Depois de", needsValue: true },
  { value: "between", label: "Entre datas", needsValue: true },
];

function operatorsForType(type: string): CustomFieldOperator[] {
  const t = (type || "").toUpperCase();
  if (t === "DATE") return ["before", "after", "between", "eq", "filled", "empty"];
  if (t === "NUMBER") return ["eq", "neq", "gt", "lt", "filled", "empty"];
  if (t === "SELECT" || t === "RADIO" || t === "DROPDOWN")
    return ["eq", "neq", "in", "filled", "empty"];
  if (t === "MULTI_SELECT" || t === "CHECKBOX")
    return ["in", "contains", "not_contains", "filled", "empty"];
  return ["contains", "not_contains", "eq", "neq", "filled", "empty"];
}

function MultiPickButtons({
  items,
  selected,
  onToggle,
  emptyLabel,
}: {
  items: { id: string; name: string; label?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-[11px] text-[var(--color-ink-muted)]">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
              active
                ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200"
                : "border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-muted)]",
            )}
          >
            {item.label ?? item.name}
          </button>
        );
      })}
    </div>
  );
}

function DateRangeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateRangeValue | undefined;
  onChange: (v: DateRangeValue | undefined) => void;
}) {
  const preset = detectPreset(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">{label}</Label>
      <SelectNative
        value={preset}
        onChange={(e) => {
          const key = e.target.value as DatePresetKey;
          if (key === "custom") return;
          if (key === "any") return onChange(undefined);
          onChange(dateRangeFromPreset(key) ?? undefined);
        }}
        className="h-8 text-xs"
      >
        {(Object.keys(DATE_PRESET_LABELS) as DatePresetKey[]).map((k) => (
          <option key={k} value={k}>
            {DATE_PRESET_LABELS[k]}
          </option>
        ))}
      </SelectNative>
      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={value?.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value || null })}
            className="h-7 text-[11px]"
          />
          <span className="text-[11px] text-[var(--color-ink-muted)]">a</span>
          <Input
            type="date"
            value={value?.to ?? ""}
            onChange={(e) => onChange({ ...value, to: e.target.value || null })}
            className="h-7 text-[11px]"
          />
        </div>
      )}
    </div>
  );
}

function CustomFieldRow({
  field,
  filter,
  onChange,
  onRemove,
}: {
  field: CustomField;
  filter: CustomFieldFilter;
  onChange: (next: CustomFieldFilter) => void;
  onRemove: () => void;
}) {
  const allowedOps = operatorsForType(field.type);
  const currentOp =
    filter.operator && allowedOps.includes(filter.operator) ? filter.operator : allowedOps[0];
  const opDef = CUSTOM_OPERATORS.find((o) => o.value === currentOp);
  const hasOptions = field.options && field.options.length > 0;
  const isMulti = currentOp === "in" || field.type === "MULTI_SELECT";
  const t = (field.type || "").toUpperCase();
  const inputType = t === "DATE" ? "date" : t === "NUMBER" ? "number" : "text";

  React.useEffect(() => {
    if (filter.operator !== currentOp) {
      onChange({ ...filter, operator: currentOp });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">{field.label}</span>
          <span className="text-[9px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            {field.entity === "deal" ? "Negócio" : "Contato"} · {field.type}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--color-ink-muted)] hover:text-red-600 dark:hover:text-red-400"
          aria-label="Remover"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectNative
          value={currentOp}
          onChange={(e) =>
            onChange({
              ...filter,
              operator: e.target.value as CustomFieldOperator,
              value: undefined,
            })
          }
          className="h-8 text-xs"
        >
          {allowedOps.map((op) => {
            const def = CUSTOM_OPERATORS.find((o) => o.value === op);
            return (
              <option key={op} value={op}>
                {def?.label ?? op}
              </option>
            );
          })}
        </SelectNative>

        {opDef?.needsValue ? (
          currentOp === "between" ? (
            <div className="col-span-1 grid grid-cols-2 gap-1">
              <Input
                type="date"
                value={
                  filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)
                    ? filter.value.from ?? ""
                    : ""
                }
                onChange={(e) => {
                  const prev =
                    filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)
                      ? filter.value
                      : {};
                  onChange({ ...filter, value: { ...prev, from: e.target.value || null } });
                }}
                className="h-8 text-[11px]"
              />
              <Input
                type="date"
                value={
                  filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)
                    ? filter.value.to ?? ""
                    : ""
                }
                onChange={(e) => {
                  const prev =
                    filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)
                      ? filter.value
                      : {};
                  onChange({ ...filter, value: { ...prev, to: e.target.value || null } });
                }}
                className="h-8 text-[11px]"
              />
            </div>
          ) : hasOptions ? (
            isMulti ? (
              <SelectNative
                multiple
                value={Array.isArray(filter.value) ? filter.value : []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                  onChange({ ...filter, value: selected });
                }}
                className="h-20 text-xs"
              >
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectNative>
            ) : (
              <SelectNative
                value={typeof filter.value === "string" ? filter.value : ""}
                onChange={(e) => onChange({ ...filter, value: e.target.value })}
                className="h-8 text-xs"
              >
                <option value="">— escolha —</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectNative>
            )
          ) : (
            <Input
              type={inputType}
              value={typeof filter.value === "string" ? filter.value : ""}
              onChange={(e) => onChange({ ...filter, value: e.target.value })}
              placeholder="Valor"
              className="h-8 text-xs"
            />
          )
        ) : (
          <span className="self-center text-[10px] italic text-[var(--color-ink-muted)]">sem valor</span>
        )}
      </div>
    </div>
  );
}

export type FilterPanelBodyProps = {
  value: AdvancedDealFilters;
  options: FilterOptionsResponse | null;
  optionsLoading: boolean;
  /** Mensagem de erro do carregamento de opções (se houver). */
  optionsError?: string | null;
  onApply: (next: AdvancedDealFilters) => void;
  onClear: () => void;
  onRequestSave?: (current: AdvancedDealFilters) => void;
  /**
   * Disparado depois de "Aplicar"/"Salvar" para que o container
   * (Sheet/Popover) feche.
   */
  onClose?: () => void;
  /**
   * Se true, ignora o `value` externo apos a primeira render — util quando
   * o container nao "abre/fecha" (e.g. popover persistente).
   * Default: false (sincroniza com `value` sempre que mudar).
   */
  syncOnce?: boolean;
  /** Renderiza header com titulo (Sheet usa SheetHeader proprio). */
  withHeader?: boolean;
  className?: string;
};

export function FilterPanelBody({
  value,
  options,
  optionsLoading,
  optionsError,
  onApply,
  onClear,
  onRequestSave,
  onClose,
  syncOnce = false,
  withHeader = false,
  className,
}: FilterPanelBodyProps) {
  const [draft, setDraft] = React.useState<AdvancedDealFilters>(value);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (syncOnce && initializedRef.current) return;
    setDraft(value);
    initializedRef.current = true;
  }, [value, syncOnce]);

  const stages = options?.pipelines.flatMap((p) => p.stages) ?? [];
  const users = options?.users ?? [];
  const tags = options?.tags ?? [];

  const [pickDealCfId, setPickDealCfId] = React.useState("");
  const [pickContactCfId, setPickContactCfId] = React.useState("");

  function addDealCustomField() {
    const cf = options?.dealCustomFields.find((d) => d.id === pickDealCfId);
    if (!cf) return;
    if (draft.dealCustomFields?.some((x) => x.name === cf.name)) {
      setPickDealCfId("");
      return;
    }
    const op = operatorsForType(cf.type)[0];
    setDraft((d) => ({
      ...d,
      dealCustomFields: [
        ...(d.dealCustomFields ?? []),
        { name: cf.name, operator: op, value: "" },
      ],
    }));
    setPickDealCfId("");
  }

  function addContactCustomField() {
    const cf = options?.contactCustomFields.find((d) => d.id === pickContactCfId);
    if (!cf) return;
    if (draft.contactCustomFields?.some((x) => x.name === cf.name)) {
      setPickContactCfId("");
      return;
    }
    const op = operatorsForType(cf.type)[0];
    setDraft((d) => ({
      ...d,
      contactCustomFields: [
        ...(d.contactCustomFields ?? []),
        { name: cf.name, operator: op, value: "" },
      ],
    }));
    setPickContactCfId("");
  }

  function toggleArray(prev: string[] | undefined, id: string): string[] | undefined {
    const arr = prev ?? [];
    const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    return next.length === 0 ? undefined : next;
  }

  function setDraftField<K extends keyof AdvancedDealFilters>(
    key: K,
    next: AdvancedDealFilters[K],
  ) {
    setDraft((d) => ({ ...d, [key]: next }));
  }

  return (
    // Background herdado do host (FilterDropdown via Portal aplica
    // cor literal inline). Aqui o root é transparent pra não conflitar
    // com hosts diferentes (Sheet, popover, etc).
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {withHeader && (
        <div className="border-b border-[var(--glass-border-subtle)] px-4 py-3">
          <h3 className="font-display text-[14px] font-bold text-foreground">Filtros avançados</h3>
          <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
            Combine critérios para refinar o Kanban.
          </p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        {/* Busca */}
        <section className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Busca</Label>
          <Input
            value={draft.search ?? ""}
            onChange={(e) => setDraftField("search", e.target.value || undefined)}
            placeholder="Título, contato, e-mail, telefone..."
            className="h-8 text-xs"
          />
        </section>

        {/* Status */}
        <section className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Status</Label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => {
              const active = (draft.statuses ?? []).includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() =>
                    setDraftField(
                      "statuses",
                      toggleArray(draft.statuses, s.value) as typeof draft.statuses,
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
                    active
                      ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200"
                      : "border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-ink-soft)]",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Etapas */}
        <section className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Etapas</Label>
          <MultiPickButtons
            items={stages}
            selected={draft.stageIds ?? []}
            onToggle={(id) => setDraftField("stageIds", toggleArray(draft.stageIds, id))}
            emptyLabel={optionsLoading ? "Carregando..." : "Nenhuma etapa."}
          />
        </section>

        {/* Responsável */}
        <section className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Responsável</Label>
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-ink-soft)]">
            <input
              type="checkbox"
              checked={!!draft.withoutOwner}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  withoutOwner: e.target.checked || undefined,
                  ownerIds: e.target.checked ? undefined : d.ownerIds,
                }))
              }
            />
            Apenas sem responsável
          </label>
          {!draft.withoutOwner && (
            <MultiPickButtons
              items={users.map((u) => ({ id: u.id, name: u.name }))}
              selected={(draft.ownerIds ?? []).filter((id): id is string => !!id)}
              onToggle={(id) => {
                const current = (draft.ownerIds ?? []).filter((x): x is string => !!x);
                const next = current.includes(id)
                  ? current.filter((x) => x !== id)
                  : [...current, id];
                setDraftField("ownerIds", next.length === 0 ? undefined : next);
              }}
              emptyLabel={optionsLoading ? "Carregando..." : "Sem usuários."}
            />
          )}
        </section>

        {/* Tags */}
        <section className="space-y-2">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Tags</Label>
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-ink-soft)]">
            <input
              type="checkbox"
              checked={!!draft.withoutTags}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  withoutTags: e.target.checked || undefined,
                  tagIds: e.target.checked ? undefined : d.tagIds,
                  tagMode: e.target.checked ? undefined : d.tagMode,
                }))
              }
            />
            Apenas sem tags
          </label>
          {!draft.withoutTags && (
            <>
              <SelectNative
                value={draft.tagMode ?? "any"}
                onChange={(e) => setDraftField("tagMode", e.target.value as TagMode)}
                className="h-8 text-xs"
              >
                {TAG_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Combinação: {o.label}
                  </option>
                ))}
              </SelectNative>
              <MultiPickButtons
                items={tags}
                selected={draft.tagIds ?? []}
                onToggle={(id) => setDraftField("tagIds", toggleArray(draft.tagIds, id))}
                emptyLabel={optionsLoading ? "Carregando..." : "Nenhuma tag."}
              />
            </>
          )}
        </section>

        {/* Origem */}
        {options?.sources && options.sources.length > 0 && (
          <section className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Origem</Label>
            <div className="flex flex-wrap gap-1.5">
              {options.sources.map((src) => {
                const active = (draft.sources ?? []).includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setDraftField("sources", toggleArray(draft.sources, src))}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
                      active
                        ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200"
                        : "border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-ink-soft)]",
                    )}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Contato */}
        <section className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">Contato</Label>
          <Input
            value={draft.contactSearch ?? ""}
            onChange={(e) => setDraftField("contactSearch", e.target.value || undefined)}
            placeholder="Nome, telefone, e-mail..."
            className="h-8 text-xs"
          />
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-soft)]">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={draft.contactHasPhone === true}
                onChange={(e) =>
                  setDraftField("contactHasPhone", e.target.checked ? true : undefined)
                }
              />
              Tem telefone
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={draft.contactHasPhone === false}
                onChange={(e) =>
                  setDraftField("contactHasPhone", e.target.checked ? false : undefined)
                }
              />
              Sem telefone
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={draft.contactHasEmail === true}
                onChange={(e) =>
                  setDraftField("contactHasEmail", e.target.checked ? true : undefined)
                }
              />
              Tem e-mail
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={draft.contactHasEmail === false}
                onChange={(e) =>
                  setDraftField("contactHasEmail", e.target.checked ? false : undefined)
                }
              />
              Sem e-mail
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!draft.withoutContact}
                onChange={(e) => setDraftField("withoutContact", e.target.checked || undefined)}
              />
              Sem contato
            </label>
          </div>
        </section>

        {/* Datas */}
        <section className="grid grid-cols-2 gap-3">
          <DateRangeField
            label="Data de criação"
            value={draft.createdAt}
            onChange={(v) => setDraftField("createdAt", v)}
          />
          <DateRangeField
            label="Última atualização"
            value={draft.updatedAt}
            onChange={(v) => setDraftField("updatedAt", v)}
          />
          <DateRangeField
            label="Fechado em"
            value={draft.closedAt}
            onChange={(v) => setDraftField("closedAt", v)}
          />
          <DateRangeField
            label="Última interação"
            value={draft.lastInteractionAt}
            onChange={(v) => setDraftField("lastInteractionAt", v)}
          />
        </section>

        {/* Custom fields — Deal */}
        <section className="space-y-2">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
            Campos personalizados do negócio
          </Label>
          {optionsLoading ? (
            <p className="text-[11px] text-[var(--color-ink-muted)]">Carregando campos…</p>
          ) : optionsError ? (
            <p className="text-[11px] text-[var(--color-danger)]">
              Erro ao carregar campos: {optionsError}
            </p>
          ) : options && options.dealCustomFields.length > 0 ? (
            <div className="flex items-center gap-2">
              <SelectNative
                value={pickDealCfId}
                onChange={(e) => setPickDealCfId(e.target.value)}
                className="h-8 flex-1 text-xs"
              >
                <option value="">+ Adicionar critério...</option>
                {options.dealCustomFields.map((cf) => (
                  <option key={cf.id} value={cf.id}>
                    {cf.label}
                  </option>
                ))}
              </SelectNative>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={addDealCustomField}
                disabled={!pickDealCfId}
              >
                Adicionar
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              Nenhum campo personalizado de negócio cadastrado em Configurações.
            </p>
          )}
          <div className="space-y-2">
            {(draft.dealCustomFields ?? []).map((cf) => {
              const def = options?.dealCustomFields.find((d) => d.name === cf.name);
              if (!def) return null;
              return (
                <CustomFieldRow
                  key={cf.name}
                  field={def}
                  filter={cf}
                  onChange={(next) =>
                    setDraftField(
                      "dealCustomFields",
                      (draft.dealCustomFields ?? []).map((x) =>
                        x.name === cf.name ? next : x,
                      ),
                    )
                  }
                  onRemove={() =>
                    setDraftField(
                      "dealCustomFields",
                      (draft.dealCustomFields ?? []).filter((x) => x.name !== cf.name),
                    )
                  }
                />
              );
            })}
          </div>
        </section>

        {/* Custom fields — Contact */}
        <section className="space-y-2">
          <Label className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
            Campos personalizados do contato
          </Label>
          {optionsLoading ? (
            <p className="text-[11px] text-[var(--color-ink-muted)]">Carregando campos…</p>
          ) : optionsError ? (
            <p className="text-[11px] text-[var(--color-danger)]">
              Erro ao carregar campos: {optionsError}
            </p>
          ) : options && options.contactCustomFields.length > 0 ? (
            <div className="flex items-center gap-2">
              <SelectNative
                value={pickContactCfId}
                onChange={(e) => setPickContactCfId(e.target.value)}
                className="h-8 flex-1 text-xs"
              >
                <option value="">+ Adicionar critério...</option>
                {options.contactCustomFields.map((cf) => (
                  <option key={cf.id} value={cf.id}>
                    {cf.label}
                  </option>
                ))}
              </SelectNative>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={addContactCustomField}
                disabled={!pickContactCfId}
              >
                Adicionar
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              Nenhum campo personalizado de contato cadastrado em Configurações.
            </p>
          )}
          <div className="space-y-2">
            {(draft.contactCustomFields ?? []).map((cf) => {
              const def = options?.contactCustomFields.find((d) => d.name === cf.name);
              if (!def) return null;
              return (
                <CustomFieldRow
                  key={cf.name}
                  field={def}
                  filter={cf}
                  onChange={(next) =>
                    setDraftField(
                      "contactCustomFields",
                      (draft.contactCustomFields ?? []).map((x) =>
                        x.name === cf.name ? next : x,
                      ),
                    )
                  }
                  onRemove={() =>
                    setDraftField(
                      "contactCustomFields",
                      (draft.contactCustomFields ?? []).filter((x) => x.name !== cf.name),
                    )
                  }
                />
              );
            })}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--glass-border-subtle)] px-4 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-[var(--color-ink-soft)]"
          onClick={() => {
            setDraft({});
            onClear();
          }}
          disabled={isEmptyFilters(draft)}
        >
          <Trash2 className="size-3.5" />
          Limpar
        </Button>
        <div className="flex items-center gap-2">
          {onRequestSave && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => onRequestSave(draft)}
              disabled={isEmptyFilters(draft)}
            >
              <Save className="size-3.5" />
              Salvar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="text-xs"
            onClick={() => {
              onApply(draft);
              onClose?.();
            }}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
