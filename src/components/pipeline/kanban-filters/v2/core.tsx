/**
 * Núcleo compartilhado dos filtros avançados — DS v2.
 *
 * Toda a lógica de estado e TODAS as seções de campo vivem aqui, estilizadas
 * exclusivamente com tokens do DS v2 (`ds` em `@/lib/design-system`):
 * slate/blue flat, radius 8/12/16, borda `black/6`, chips soft.
 *
 * As 4 variações de layout (drawer, barra+mega-painel, modal 2 col, modal 3 col)
 * apenas *arranjam* estas mesmas seções — a lógica nunca é duplicada.
 */

"use client";

import * as React from "react";
import { IconCheck as Check, IconChevronDown as ChevronDown, IconSearch as Search, IconDeviceFloppy as Save, IconTrash as Trash2, IconBookmark as Bookmark, IconLock as Lock, IconUsers as UsersIcon, IconX as X } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { ds } from "@/lib/design-system";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { SelectNative } from "@/components/ui/select";

import {
  DATE_PRESET_LABELS,
  dateRangeFromPreset,
  detectPreset,
  type DatePresetKey,
} from "../date-presets";
import { fetchSavedFilters } from "../api";
import type {
  AdvancedDealFilters,
  CustomField,
  CustomFieldFilter,
  CustomFieldOperator,
  DateRangeValue,
  FilterOptionsResponse,
  SavedFilter,
  TagMode,
} from "../types";
import { countActiveFilters, isEmptyFilters, SOURCE_NONE } from "../types";

// ─── Constantes ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: "OPEN" | "WON" | "LOST"; label: string; tone: "info" | "success" | "danger" }[] = [
  { value: "OPEN", label: "Aberto", tone: "info" },
  { value: "WON", label: "Ganho", tone: "success" },
  { value: "LOST", label: "Perdido", tone: "danger" },
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
  if (t === "SELECT" || t === "RADIO" || t === "DROPDOWN") return ["eq", "neq", "in", "filled", "empty"];
  if (t === "MULTI_SELECT" || t === "CHECKBOX") return ["in", "contains", "not_contains", "filled", "empty"];
  return ["contains", "not_contains", "eq", "neq", "filled", "empty"];
}

export const QUICK_FILTERS: { label: string; dot?: string; filters: AdvancedDealFilters }[] = [
  { label: "Leads ativos", dot: "var(--color-info)", filters: { statuses: ["OPEN"] } },
  { label: "Meus leads", dot: "#6366f1", filters: { ownerIds: ["__me__"] } },
  { label: "Leads ganhos", dot: "var(--color-success)", filters: { statuses: ["WON"] } },
  { label: "Leads perdidos", dot: "var(--color-danger)", filters: { statuses: ["LOST"] } },
  { label: "Sem responsável", dot: "var(--color-warning)", filters: { withoutOwner: true } },
];

// ─── Hook de estado (apply imediato, estilo Kommo) ──────────────────────────────

export type SetDraftField = <K extends keyof AdvancedDealFilters>(
  k: K,
  v: AdvancedDealFilters[K],
) => void;

export function useFilterDraft(value: AdvancedDealFilters, onApply: (f: AdvancedDealFilters) => void) {
  const [draft, setDraft] = React.useState<AdvancedDealFilters>(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const setDraftField: SetDraftField = React.useCallback(
    (key, next) => {
      setDraft((prev) => {
        const updated = { ...prev, [key]: next };
        onApply(updated);
        return updated;
      });
    },
    [onApply],
  );

  const applyWhole = React.useCallback(
    (next: AdvancedDealFilters) => {
      setDraft(next);
      onApply(next);
    },
    [onApply],
  );

  const toggleArray = React.useCallback((prev: string[] | undefined, id: string): string[] | undefined => {
    const arr = prev ?? [];
    const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    return next.length === 0 ? undefined : next;
  }, []);

  const reset = React.useCallback(() => {
    setDraft({});
    onApply({});
  }, [onApply]);

  return { draft, setDraft, setDraftField, applyWhole, toggleArray, reset };
}

export type SectionProps = {
  draft: AdvancedDealFilters;
  options: FilterOptionsResponse | null;
  optionsLoading: boolean;
  optionsError?: string | null;
  setDraftField: SetDraftField;
  toggleArray: (prev: string[] | undefined, id: string) => string[] | undefined;
};

// ─── Primitivas DS v2 ───────────────────────────────────────────────────────────

/** Card de campo — superfície glass, hairline, label uppercase, estado ativo brand. */
export function FieldCard({
  label,
  active,
  onClear,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--glass-bg-overlay)] p-3 transition-colors",
        active
          ? "border-[var(--brand-primary)]/20 bg-[var(--color-enterprise-bg)]"
          : "border-[var(--glass-border)] hover:border-[var(--glass-border)]",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary-light)]"
          >
            Limpar
          </button>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-white"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {active && <Check className="size-3" />}
      {children}
    </button>
  );
}

/** Input texto compacto DS v2. */
export function TextField({
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle">{icon}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-primary/40 focus:bg-[var(--glass-bg-modal)] focus:ring-2 focus:ring-[var(--brand-primary)]/20",
          icon && "pl-8",
        )}
      />
    </div>
  );
}

function DateRangeField({ value, onChange }: { value?: DateRangeValue; onChange: (v: DateRangeValue | undefined) => void }) {
  const preset = detectPreset(value);
  return (
    <div className="space-y-2">
      <DropdownGlass
        options={(Object.keys(DATE_PRESET_LABELS) as DatePresetKey[]).map((k) => ({
          value: k,
          label: DATE_PRESET_LABELS[k],
        }))}
        value={preset}
        onValueChange={(v) => {
          const key = v as DatePresetKey;
          if (key === "custom") return;
          if (key === "any") return onChange(undefined);
          onChange(dateRangeFromPreset(key) ?? undefined);
        }}
        triggerClassName="h-9 w-full rounded-lg text-[13px]"
      />
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value?.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value || null })}
            className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-primary/40 focus:bg-[var(--glass-bg-modal)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
          />
          <span className="shrink-0 text-[12px] text-ink-subtle">até</span>
          <input
            type="date"
            value={value?.to ?? ""}
            onChange={(e) => onChange({ ...value, to: e.target.value || null })}
            className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-primary/40 focus:bg-[var(--glass-bg-modal)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
          />
        </div>
      )}
    </div>
  );
}

// ─── Seções de campo ────────────────────────────────────────────────────────────

export function SearchSection({ draft, setDraftField }: SectionProps) {
  return (
    <FieldCard label="Nome do lead" active={!!draft.search} onClear={() => setDraftField("search", undefined)}>
      <TextField
        value={draft.search ?? ""}
        onChange={(v) => setDraftField("search", v || undefined)}
        placeholder="Título, contato, e-mail…"
        icon={<Search className="size-3.5" />}
      />
    </FieldCard>
  );
}

export function StatusSection({ draft, setDraftField, toggleArray }: SectionProps) {
  return (
    <FieldCard label="Status" active={!!draft.statuses?.length} onClear={() => setDraftField("statuses", undefined)}>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((s) => (
          <ChipToggle
            key={s.value}
            active={(draft.statuses ?? []).includes(s.value)}
            onClick={() => setDraftField("statuses", toggleArray(draft.statuses, s.value) as typeof draft.statuses)}
          >
            {s.label}
          </ChipToggle>
        ))}
      </div>
    </FieldCard>
  );
}

export function StagesSection({ draft, options, optionsLoading, setDraftField, toggleArray }: SectionProps) {
  const stages = options?.pipelines.flatMap((p) => p.stages) ?? [];
  return (
    <FieldCard label="Etapas" active={!!draft.stageIds?.length} onClear={() => setDraftField("stageIds", undefined)}>
      {optionsLoading ? (
        <p className="text-[12px] text-ink-subtle">Carregando…</p>
      ) : stages.length === 0 ? (
        <p className="text-[12px] text-ink-subtle">Nenhuma etapa.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {stages.map((stage) => {
            const active = (draft.stageIds ?? []).includes(stage.id);
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setDraftField("stageIds", toggleArray(draft.stageIds, stage.id))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                  active
                    ? "border-transparent bg-primary text-white"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: stage.color || "#94a3b8" }} />
                {stage.name}
              </button>
            );
          })}
        </div>
      )}
    </FieldCard>
  );
}

export function SourcesSection({ draft, options, setDraftField, toggleArray }: SectionProps) {
  const [search, setSearch] = React.useState("");
  const allSources = options?.sources ?? [];
  const filtered = search
    ? allSources.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : allSources;
  const selected = (draft.sources ?? []).filter((s) => s !== SOURCE_NONE);

  function toggleSource(source: string) {
    const next = toggleArray(selected, source);
    setDraftField("sources", next);
    setDraftField("withoutSource", undefined);
  }

  return (
    <FieldCard
      label="Origem"
      active={!!(selected.length || draft.withoutSource)}
      onClear={() => {
        setDraftField("sources", undefined);
        setDraftField("withoutSource", undefined);
      }}
    >
      <div className="space-y-2">
        <TextField
          value={search}
          onChange={setSearch}
          placeholder="Buscar origem…"
          icon={<Search className="size-3.5" />}
        />
        <div className="max-h-40 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setDraftField("withoutSource", !draft.withoutSource || undefined);
              setDraftField("sources", undefined);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
              draft.withoutSource ? "bg-primary-soft font-medium text-primary-dark" : "text-ink-soft hover:bg-muted",
            )}
          >
            <span className="inline-block size-2.5 shrink-0 rounded-full border border-dashed border-black/15" />
            Sem origem
            {draft.withoutSource && <Check className="ml-auto size-3.5" />}
          </button>
          {filtered.map((source) => {
            const active = selected.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                  active ? "bg-primary-soft font-medium text-primary-dark" : "text-ink-soft hover:bg-muted",
                )}
              >
                <span className="flex-1 truncate text-left">{source}</span>
                {active && <Check className="size-3.5 shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && search && (
            <p className="px-2 py-3 text-center text-[12px] text-ink-subtle">Nenhuma origem encontrada.</p>
          )}
          {allSources.length === 0 && !search && (
            <p className="px-2 py-2 text-[12px] text-ink-subtle">
              Nenhuma origem cadastrada ainda. Use &quot;Sem origem&quot; ou cadastre a origem nos contatos.
            </p>
          )}
        </div>
      </div>
    </FieldCard>
  );
}

export function LossReasonsSection({ draft, options, setDraftField, toggleArray }: SectionProps) {
  const reasons = options?.lossReasons ?? [];
  if (reasons.length === 0) return null;
  return (
    <FieldCard
      label="Motivo da perda"
      active={!!draft.lostReasons?.length}
      onClear={() => setDraftField("lostReasons", undefined)}
    >
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <ChipToggle
            key={r}
            active={(draft.lostReasons ?? []).includes(r)}
            onClick={() => setDraftField("lostReasons", toggleArray(draft.lostReasons, r))}
          >
            {r}
          </ChipToggle>
        ))}
      </div>
    </FieldCard>
  );
}

export function OwnersSection({ draft, options, setDraftField }: SectionProps) {
  const users = options?.users ?? [];
  const [search, setSearch] = React.useState("");
  const selected = (draft.ownerIds ?? []).filter((id): id is string => !!id);
  const filtered = search ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <FieldCard
      label="Responsável"
      active={!!(selected.length || draft.withoutOwner)}
      onClear={() => {
        setDraftField("ownerIds", undefined);
        setDraftField("withoutOwner", undefined);
      }}
    >
      <div className="space-y-2">
        <TextField value={search} onChange={setSearch} placeholder="Buscar usuário…" icon={<Search className="size-3.5" />} />
        <div className="max-h-40 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setDraftField("ownerIds", undefined);
              setDraftField("withoutOwner", !draft.withoutOwner || undefined);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
              draft.withoutOwner ? "bg-primary-soft font-medium text-primary-dark" : "text-ink-soft hover:bg-muted",
            )}
          >
            <span className={ds.avatar.empty + " size-6"}>
              <X className="size-3" />
            </span>
            Sem responsável
            {draft.withoutOwner && <Check className="ml-auto size-3.5" />}
          </button>
          {filtered.map((u) => {
            const active = selected.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  const next = active ? selected.filter((x) => x !== u.id) : [...selected, u.id];
                  setDraftField("ownerIds", next.length ? next : undefined);
                  setDraftField("withoutOwner", undefined);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                  active ? "bg-primary-soft font-medium text-primary-dark" : "text-ink-soft hover:bg-muted",
                )}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: `hsl(${(u.name.charCodeAt(0) * 47) % 360} 55% 50%)` }}
                >
                  {u.name[0]?.toUpperCase()}
                </span>
                <span className="flex-1 truncate text-left">{u.name}</span>
                {active && <Check className="size-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </FieldCard>
  );
}

export function ContactSection({ draft, setDraftField }: SectionProps) {
  const active = !!(
    draft.contactSearch ||
    draft.contactHasPhone != null ||
    draft.contactHasEmail != null ||
    draft.withoutContact
  );
  return (
    <FieldCard
      label="Contato"
      active={active}
      onClear={() => {
        setDraftField("contactSearch", undefined);
        setDraftField("contactHasPhone", undefined);
        setDraftField("contactHasEmail", undefined);
        setDraftField("withoutContact", undefined);
      }}
    >
      <div className="space-y-2">
        <TextField
          value={draft.contactSearch ?? ""}
          onChange={(v) => setDraftField("contactSearch", v || undefined)}
          placeholder="Nome, telefone, e-mail…"
        />
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Tem telefone", field: "contactHasPhone" as const },
            { label: "Tem e-mail", field: "contactHasEmail" as const },
            { label: "Sem contato", field: "withoutContact" as const },
          ].map(({ label, field }) => (
            <ChipToggle
              key={label}
              active={draft[field] === true}
              onClick={() => setDraftField(field, draft[field] === true ? undefined : true)}
            >
              {label}
            </ChipToggle>
          ))}
        </div>
      </div>
    </FieldCard>
  );
}

export function ValueSection({ draft, setDraftField }: SectionProps) {
  return (
    <FieldCard
      label="Valor de venda"
      active={draft.valueFrom != null || draft.valueTo != null}
      onClear={() => {
        setDraftField("valueFrom", undefined);
        setDraftField("valueTo", undefined);
      }}
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Mínimo"
          value={draft.valueFrom ?? ""}
          onChange={(e) => setDraftField("valueFrom", e.target.value !== "" ? Number(e.target.value) : undefined)}
          className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-primary/40 focus:bg-[var(--glass-bg-modal)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
        />
        <span className="shrink-0 text-[12px] text-ink-subtle">–</span>
        <input
          type="number"
          placeholder="Máximo"
          value={draft.valueTo ?? ""}
          onChange={(e) => setDraftField("valueTo", e.target.value !== "" ? Number(e.target.value) : undefined)}
          className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-primary/40 focus:bg-[var(--glass-bg-modal)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
        />
      </div>
    </FieldCard>
  );
}

export function CreatedAtSection({ draft, setDraftField }: SectionProps) {
  return (
    <FieldCard
      label="Data de criação"
      active={!!(draft.createdAt?.from || draft.createdAt?.to)}
      onClear={() => setDraftField("createdAt", undefined)}
    >
      <DateRangeField value={draft.createdAt} onChange={(v) => setDraftField("createdAt", v)} />
    </FieldCard>
  );
}

export function OtherDatesSection({ draft, setDraftField }: SectionProps) {
  const active = !!(
    draft.updatedAt?.from ||
    draft.updatedAt?.to ||
    draft.closedAt?.from ||
    draft.closedAt?.to ||
    draft.lastInteractionAt?.from ||
    draft.lastInteractionAt?.to
  );
  return (
    <FieldCard
      label="Outras datas"
      active={active}
      onClear={() => {
        setDraftField("updatedAt", undefined);
        setDraftField("closedAt", undefined);
        setDraftField("lastInteractionAt", undefined);
      }}
    >
      <div className="space-y-2.5">
        {[
          { label: "Atualizado em", key: "updatedAt" as const },
          { label: "Fechado em", key: "closedAt" as const },
          { label: "Última interação", key: "lastInteractionAt" as const },
        ].map(({ label, key }) => (
          <div key={key}>
            <span className="mb-1 block text-[11px] text-ink-subtle">{label}</span>
            <DateRangeField value={draft[key]} onChange={(v) => setDraftField(key, v)} />
          </div>
        ))}
      </div>
    </FieldCard>
  );
}

// ── Custom fields ──

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
  const currentOp = filter.operator && allowedOps.includes(filter.operator) ? filter.operator : allowedOps[0];
  const opDef = CUSTOM_OPERATORS.find((o) => o.value === currentOp);
  const hasOptions = field.options && field.options.length > 0;
  const isMulti = currentOp === "in" || field.type === "MULTI_SELECT";
  const t = (field.type || "").toUpperCase();
  const inputType = t === "DATE" ? "date" : t === "NUMBER" ? "number" : "text";
  const dateVal =
    filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)
      ? (filter.value as DateRangeValue)
      : {};

  const solidPanel = "bg-[var(--dropdown-solid-bg)]";
  const inputCls =
    "h-8 rounded-md border border-[var(--glass-border)] bg-white px-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20";

  return (
    <div className="space-y-1.5 rounded-lg border border-[var(--glass-border)] bg-white/70 px-2 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className="min-w-0 flex-1 truncate rounded-md bg-[var(--brand-primary)]/8 px-2 py-1 text-[12px] font-semibold text-[var(--brand-primary)]"
          title={field.label}
        >
          {field.label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-primary)]/8 hover:text-[var(--color-danger)]"
          aria-label={`Remover ${field.label}`}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <DropdownGlass
          options={allowedOps.map((op) => ({
            value: op,
            label: CUSTOM_OPERATORS.find((o) => o.value === op)?.label ?? op,
          }))}
          value={currentOp}
          onValueChange={(v) => onChange({ ...filter, operator: v as CustomFieldOperator, value: undefined })}
          triggerClassName="h-8 w-[120px] shrink-0 rounded-md text-[12px] px-2"
          className={solidPanel}
        />
        {opDef?.needsValue ? (
          currentOp === "between" ? (
            <div className="grid min-w-0 flex-1 basis-full grid-cols-2 gap-1">
              <input
                type="date"
                value={dateVal.from ?? ""}
                onChange={(e) => onChange({ ...filter, value: { ...dateVal, from: e.target.value || null } })}
                className={inputCls}
              />
              <input
                type="date"
                value={dateVal.to ?? ""}
                onChange={(e) => onChange({ ...filter, value: { ...dateVal, to: e.target.value || null } })}
                className={inputCls}
              />
            </div>
          ) : hasOptions ? (
            isMulti ? (
              <SelectNative
                multiple
                value={Array.isArray(filter.value) ? filter.value : []}
                onChange={(e) => onChange({ ...filter, value: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                className="min-w-0 flex-1 basis-[140px] rounded-md text-[12px]"
              >
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectNative>
            ) : (
              <DropdownGlass
                options={field.options.map((o) => ({ value: o, label: o }))}
                value={typeof filter.value === "string" ? filter.value || undefined : undefined}
                onValueChange={(v) => onChange({ ...filter, value: v })}
                placeholder="— valor —"
                triggerClassName="h-8 min-w-0 flex-1 basis-[140px] rounded-md text-[12px] px-2"
                className={solidPanel}
              />
            )
          ) : (
            <input
              type={inputType}
              value={typeof filter.value === "string" ? filter.value : ""}
              onChange={(e) => onChange({ ...filter, value: e.target.value })}
              placeholder="Valor"
              className={cn(inputCls, "min-w-0 flex-1 basis-[140px]")}
            />
          )
        ) : (
          <span className="flex-1 text-[11px] italic text-[var(--text-muted)]">sem valor</span>
        )}
      </div>
    </div>
  );
}

function CustomFieldsSection({
  label,
  entityKey,
  fieldsKey,
  draft,
  options,
  optionsLoading,
  setDraftField,
}: SectionProps & {
  label: string;
  entityKey: "dealCustomFields" | "contactCustomFields";
  fieldsKey: "dealCustomFields" | "contactCustomFields";
}) {
  const available = options?.[entityKey] ?? [];
  const selected = draft[fieldsKey] ?? [];
  if (available.length === 0 && selected.length === 0) return null;

  const unused = available.filter((cf) => !selected.some((x) => x.name === cf.name));

  function addFieldById(id: string) {
    const cf = available.find((d) => d.id === id);
    if (!cf) return;
    if (selected.some((x) => x.name === cf.name)) return;
    setDraftField(fieldsKey, [
      ...selected,
      { name: cf.name, operator: operatorsForType(cf.type)[0], value: "" },
    ]);
  }

  return (
    <FieldCard label={label} active={!!selected.length} onClear={() => setDraftField(fieldsKey, undefined)}>
      <div className="space-y-2">
        {optionsLoading ? (
          <p className="text-[12px] text-ink-subtle">Carregando…</p>
        ) : unused.length > 0 ? (
          <DropdownGlass
            options={unused.map((cf) => ({ value: cf.id, label: cf.label }))}
            value={undefined}
            onValueChange={addFieldById}
            placeholder="+ Escolher campo…"
            triggerClassName="h-9 w-full rounded-lg text-[12px] bg-white"
            className="bg-[var(--dropdown-solid-bg)]"
          />
        ) : (
          <p className="text-[12px] text-[var(--text-muted)]">Todos os campos já foram adicionados.</p>
        )}
        {selected.map((cf) => {
          const def = available.find((d) => d.name === cf.name);
          if (!def) return null;
          return (
            <CustomFieldRow
              key={cf.name}
              field={def}
              filter={cf}
              onChange={(next) => setDraftField(fieldsKey, selected.map((x) => (x.name === cf.name ? next : x)))}
              onRemove={() => setDraftField(fieldsKey, selected.filter((x) => x.name !== cf.name))}
            />
          );
        })}
        {selected.length > 0 && (
          <p className="text-[11px] text-[var(--text-muted)]">
            Defina operador e valor em cada linha — o filtro fica ativo na hora.
          </p>
        )}
      </div>
    </FieldCard>
  );
}

export function DealCustomFieldsSection(props: SectionProps) {
  return (
    <CustomFieldsSection
      {...props}
      label="Campos do negócio"
      entityKey="dealCustomFields"
      fieldsKey="dealCustomFields"
    />
  );
}

export function ContactCustomFieldsSection(props: SectionProps) {
  return (
    <CustomFieldsSection
      {...props}
      label="Campos do contato"
      entityKey="contactCustomFields"
      fieldsKey="contactCustomFields"
    />
  );
}

// ── Tags ──

export function TagsSection({ draft, options, setDraftField }: SectionProps) {
  const [search, setSearch] = React.useState("");
  const allTags = options?.tags ?? [];
  const filtered = search ? allTags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : allTags;
  const selectedIds = draft.tagIds ?? [];

  function toggleTag(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    setDraftField("tagIds", next.length ? next : undefined);
    setDraftField("withoutTags", undefined);
  }

  return (
    <FieldCard
      label="Tags"
      active={!!(selectedIds.length || draft.withoutTags)}
      onClear={() => {
        setDraftField("tagIds", undefined);
        setDraftField("withoutTags", undefined);
      }}
    >
      <div className="space-y-2">
        {selectedIds.length > 1 && (
          <DropdownGlass
            options={TAG_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={draft.tagMode ?? "any"}
            onValueChange={(v) => setDraftField("tagMode", v as TagMode)}
            triggerClassName="h-9 w-full rounded-lg text-[12px]"
          />
        )}
        <TextField value={search} onChange={setSearch} placeholder="Localizar tags" icon={<Search className="size-3.5" />} />
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setDraftField("withoutTags", !draft.withoutTags || undefined);
              setDraftField("tagIds", undefined);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
              draft.withoutTags ? "bg-primary-soft font-medium text-primary-dark" : "text-ink-soft hover:bg-muted",
            )}
          >
            <span className="inline-block size-2.5 shrink-0 rounded-full border border-dashed border-black/15" />
            Sem tags
            {draft.withoutTags && <Check className="ml-auto size-3.5" />}
          </button>
          {filtered.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            const color = tag.color || "#6366f1";
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors",
                  isSelected ? "bg-primary-soft/60" : "hover:bg-muted",
                )}
              >
                <span
                  className="max-w-[160px] truncate rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: isSelected ? color : `${color}1f`,
                    color: isSelected ? "#fff" : color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {tag.name}
                </span>
                <span className="flex items-center gap-1.5">
                  {tag.dealCount != null && (
                    <span className="tabular-nums text-[11px] text-ink-subtle">{tag.dealCount.toLocaleString("pt-BR")}</span>
                  )}
                  {isSelected && <Check className="size-3.5 text-primary" />}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && search && (
            <p className="px-2 py-3 text-center text-[12px] text-ink-subtle">Nenhuma tag encontrada.</p>
          )}
        </div>
      </div>
    </FieldCard>
  );
}

// ── Filtros rápidos / salvos ──

export function QuickFiltersList({
  draft,
  onApply,
  onRequestSave,
  orientation = "vertical",
}: {
  draft: AdvancedDealFilters;
  onApply: (f: AdvancedDealFilters) => void;
  onRequestSave?: (f: AdvancedDealFilters) => void;
  orientation?: "vertical" | "horizontal";
}) {
  const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([]);

  React.useEffect(() => {
    fetchSavedFilters()
      .then(setSavedFilters)
      .catch(() => {});
  }, []);

  function isActiveQuick(qf: (typeof QUICK_FILTERS)[number]) {
    const keys = Object.keys(qf.filters) as (keyof AdvancedDealFilters)[];
    return keys.every((k) => JSON.stringify(draft[k]) === JSON.stringify(qf.filters[k]));
  }

  if (orientation === "horizontal") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_FILTERS.map((qf) => {
          const active = isActiveQuick(qf);
          return (
            <button
              key={qf.label}
              type="button"
              onClick={() => onApply(qf.filters)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-white"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-ink-soft hover:text-foreground",
              )}
            >
              {qf.dot && <span className="size-2 rounded-full" style={{ background: qf.dot }} />}
              {qf.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {QUICK_FILTERS.map((qf) => {
        const active = isActiveQuick(qf);
        return (
          <button
            key={qf.label}
            type="button"
            onClick={() => onApply(qf.filters)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
              active ? "bg-primary-soft font-semibold text-primary-dark" : "text-ink-soft hover:bg-muted hover:text-foreground",
            )}
          >
            {qf.dot && <span className="size-2 shrink-0 rounded-full" style={{ background: qf.dot }} />}
            {qf.label}
          </button>
        );
      })}

      {savedFilters.length > 0 && (
        <>
          <div className="my-2 border-t border-black/5" />
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">Salvos</span>
          {savedFilters.map((sf) => {
            const active = JSON.stringify(draft) === JSON.stringify(sf.filterConfig);
            return (
              <button
                key={sf.id}
                type="button"
                onClick={() => onApply(sf.filterConfig as AdvancedDealFilters)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                  active ? "bg-primary-soft font-semibold text-primary-dark" : "text-ink-soft hover:bg-muted hover:text-foreground",
                )}
              >
                <Bookmark className="size-3.5 shrink-0 text-primary/60" />
                <span className="flex-1 truncate">{sf.name}</span>
                {sf.isShared ? <UsersIcon className="size-3.5 shrink-0 opacity-40" /> : <Lock className="size-3.5 shrink-0 opacity-40" />}
              </button>
            );
          })}
        </>
      )}

      {onRequestSave && !isEmptyFilters(draft) && (
        <>
          <div className="my-2 border-t border-black/5" />
          <button
            type="button"
            onClick={() => onRequestSave(draft)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-ink-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            <Save className="size-3.5" />
            Salvar filtro atual
          </button>
        </>
      )}
    </div>
  );
}

// ─── Header / Footer compartilhados ─────────────────────────────────────────────

export function FilterHeaderActions({
  draft,
  onClear,
  onRequestSave,
}: {
  draft: AdvancedDealFilters;
  onClear: () => void;
  onRequestSave?: (f: AdvancedDealFilters) => void;
}) {
  const empty = isEmptyFilters(draft);
  return (
    <div className="flex items-center gap-2">
      {onRequestSave && (
        <button
          type="button"
          onClick={() => onRequestSave(draft)}
          disabled={empty}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-soft transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Save className="size-3.5" />
          Salvar
        </button>
      )}
      <button
        type="button"
        onClick={onClear}
        disabled={empty}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-soft transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
        Limpar
      </button>
    </div>
  );
}

export function ActiveCountBadge({ draft }: { draft: AdvancedDealFilters }) {
  const n = countActiveFilters(draft);
  if (n === 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
      {n}
    </span>
  );
}

export { ChevronDown, countActiveFilters, isEmptyFilters };
