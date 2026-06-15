"use client";

/**
 * Renderiza dinamicamente as sub-perguntas de uma capacidade a partir do
 * JSON Schema servido por `GET /api/capabilities`. Capacidade nova aparece no
 * wizard sem recodificar a tela (PRD §6).
 *
 * Fase 4: os schemas viraram discriminated unions por `mode` (Fase 2) e
 * `z.toJSONSchema` os serializa como `oneOf`. Aqui detectamos isso, expomos
 * um seletor de modo (DropdownGlass) e renderizamos os campos do branch ativo.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass";
import { cn } from "@/lib/utils";
import type { JsonSchemaObject, JsonSchemaProperty } from "./types";

function normalizeType(type: JsonSchemaProperty["type"]): string {
  if (Array.isArray(type)) return type.find((t) => t !== "null") ?? "string";
  return type ?? "string";
}

/** Rótulos amigáveis (PT) para modos conhecidos; fallback humaniza a chave. */
const MODE_LABELS: Record<string, string> = {
  one_time: "Pagamento único",
  recurring: "Recorrente",
  per_unit: "Por unidade",
  per_service: "Por serviço",
  project: "Projeto",
  contract: "Contrato",
  commission: "Comissão",
  units: "Unidades (estoque)",
  seats: "Vagas / lugares",
  quota: "Cota por unidade",
  appointment: "Compromisso",
  classes: "Turmas",
  interview: "Entrevista",
  subscription: "Assinatura",
  retainer: "Mensalidade fixa",
  rebooking: "Recompra",
  physical: "Entrega física",
  delivery: "Entrega",
  deliverables: "Entregáveis",
  enrollment: "Matrícula",
  recruiting: "Recrutamento",
  service: "Serviço",
  customer: "Cliente",
  lead: "Lead",
  company_contacts: "Contatos da empresa",
  student: "Aluno",
  client: "Cliente (PJ)",
  freeform: "Campos livres",
  event_driven: "Por evento",
  temporal: "Por tempo",
  default: "Padrão",
};

function humanizeMode(mode: string): string {
  if (MODE_LABELS[mode]) return MODE_LABELS[mode];
  return mode
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

type ModeBranch = { value: string; label: string; branch: JsonSchemaObject };

/** Extrai os branches de uma discriminated union (`oneOf` por `mode.const`). */
export function getModeBranches(schema: JsonSchemaObject): ModeBranch[] {
  if (!Array.isArray(schema.oneOf)) return [];
  const out: ModeBranch[] = [];
  for (const branch of schema.oneOf) {
    const modeConst = branch.properties?.mode?.const;
    if (typeof modeConst === "string") {
      out.push({ value: modeConst, label: humanizeMode(modeConst), branch });
    }
  }
  return out;
}

/** Branch ativo para um modo (ou o primeiro, como fallback). */
function branchForMode(branches: ModeBranch[], mode: string): JsonSchemaObject | null {
  return branches.find((b) => b.value === mode)?.branch ?? branches[0]?.branch ?? null;
}

/** Valor default de uma propriedade do schema. */
export function defaultForProperty(prop: JsonSchemaProperty): unknown {
  if (prop.const !== undefined) return prop.const;
  if (prop.default !== undefined) return prop.default;
  const type = normalizeType(prop.type);
  if (type === "boolean") return false;
  if (type === "integer" || type === "number") return null;
  return "";
}

/** Modo default de um schema (primeiro branch, ou "default" se flat). */
export function defaultMode(schema: JsonSchemaObject): string {
  const branches = getModeBranches(schema);
  return branches[0]?.value ?? "default";
}

/**
 * Constrói o config inicial de uma capacidade a partir do seu schema.
 * Quando há discriminated union, usa o branch do `mode` informado (ou o
 * primeiro). O `mode` NÃO entra no config (é coluna própria no backend),
 * mas é injetado pelas rotas na validação.
 */
export function defaultConfig(
  schema: JsonSchemaObject,
  mode?: string,
): Record<string, unknown> {
  const branches = getModeBranches(schema);
  const props =
    branches.length > 0
      ? branchForMode(branches, mode ?? defaultMode(schema))?.properties ?? {}
      : schema.properties ?? {};
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    if (key === "mode") continue;
    out[key] = defaultForProperty(prop);
  }
  return out;
}

function FieldRow({
  name,
  prop,
  value,
  onChange,
}: {
  name: string;
  prop: JsonSchemaProperty;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const type = normalizeType(prop.type);
  const label = prop.title ?? name;
  const fieldId = `cap-field-${name}`;

  // enum → DropdownGlass
  if (prop.enum && prop.enum.length > 0) {
    const options: DropdownOption[] = prop.enum.map((opt) => ({
      value: String(opt),
      label: String(opt),
    }));
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={fieldId} className="text-[12px] font-medium">
          {label}
        </Label>
        <DropdownGlass
          options={options}
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v)}
          triggerClassName="h-9 w-full text-[13px]"
          placeholder="Selecione"
        />
        {prop.description && (
          <p className="text-[11px] text-[var(--text-muted)] leading-snug">
            {prop.description}
          </p>
        )}
      </div>
    );
  }

  // boolean → switch
  if (type === "boolean") {
    const checked = Boolean(value);
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Label className="text-[12px] font-medium">{label}</Label>
          {prop.description && (
            <p className="text-[11px] text-[var(--text-muted)] leading-snug">
              {prop.description}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
            checked ? "bg-[var(--brand-primary)]" : "bg-[var(--text-muted)]/30",
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-[18px]" : "translate-x-[3px]",
            )}
          />
        </button>
      </div>
    );
  }

  // number / integer → number input
  if (type === "number" || type === "integer") {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={fieldId} className="text-[12px] font-medium">
          {label}
        </Label>
        <Input
          id={fieldId}
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          min={prop.minimum}
          max={prop.maximum}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            const n = type === "integer" ? parseInt(raw, 10) : parseFloat(raw);
            onChange(Number.isFinite(n) ? n : null);
          }}
          className="h-9 text-[13px]"
        />
        {prop.description && (
          <p className="text-[11px] text-[var(--text-muted)] leading-snug">
            {prop.description}
          </p>
        )}
      </div>
    );
  }

  // string (fallback) → text input
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={fieldId} className="text-[12px] font-medium">
        {label}
      </Label>
      <Input
        id={fieldId}
        type="text"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="h-9 text-[13px]"
      />
      {prop.description && (
        <p className="text-[11px] text-[var(--text-muted)] leading-snug">
          {prop.description}
        </p>
      )}
    </div>
  );
}

/** Renderiza as propriedades de um objeto (flat), pulando `mode`. */
function PropertyFields({
  props,
  config,
  onChange,
}: {
  props: Record<string, JsonSchemaProperty>;
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(props).filter(([name]) => name !== "mode");
  if (entries.length === 0) {
    return (
      <p className="text-[12px] text-[var(--text-muted)] italic">
        Sem configurações adicionais.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {entries.map(([name, prop]) => (
        <FieldRow
          key={name}
          name={name}
          prop={prop}
          value={config[name]}
          onChange={(v) => onChange({ ...config, [name]: v })}
        />
      ))}
    </div>
  );
}

export function SchemaFields({
  schema,
  mode,
  config,
  onChange,
  onModeChange,
}: {
  schema: JsonSchemaObject;
  /** Modo ativo (discriminated union). Ignorado em schemas flat. */
  mode?: string;
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Chamado ao trocar de modo — recebe o novo modo e o config zerado dele. */
  onModeChange?: (mode: string, config: Record<string, unknown>) => void;
}) {
  const branches = getModeBranches(schema);

  // ── Discriminated union: seletor de modo + campos do branch ──────────────
  if (branches.length > 0) {
    const activeMode = mode ?? branches[0].value;
    const activeBranch = branchForMode(branches, activeMode);
    const options: DropdownOption[] = branches.map((b) => ({
      value: b.value,
      label: b.label,
    }));
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium">Modo</Label>
          <DropdownGlass
            options={options}
            value={activeMode}
            onValueChange={(next) => {
              if (next === activeMode) return;
              // Preserva valores de campos com mesmo nome entre os modos.
              const fresh = defaultConfig(schema, next);
              const merged: Record<string, unknown> = { ...fresh };
              for (const key of Object.keys(fresh)) {
                if (config[key] !== undefined && config[key] !== null) {
                  merged[key] = config[key];
                }
              }
              onModeChange?.(next, merged);
            }}
            triggerClassName="h-9 w-full text-[13px]"
          />
        </div>
        {activeBranch && (
          <PropertyFields
            props={activeBranch.properties ?? {}}
            config={config}
            onChange={onChange}
          />
        )}
      </div>
    );
  }

  // ── Schema flat (legado / sem mode) ──────────────────────────────────────
  return <PropertyFields props={schema.properties ?? {}} config={config} onChange={onChange} />;
}
