/**
 * Formatação condicional dos campos personalizados.
 *
 * Mirror do backend/src/lib/highlight.ts — mantidos sincronizados manualmente.
 * Evita um round-trip ao servidor para resolver o destaque de campos que já
 * vieram com value + highlightRules no payload.
 */

export type HighlightSeverity = "danger" | "success" | "warning" | "info";

export type HighlightOp =
  | "equals"
  | "notEquals"
  | "contains"
  | "notEmpty"
  | "empty";

export type HighlightRule = {
  op: HighlightOp;
  /** Não usado em `notEmpty` / `empty`. */
  value?: string;
  severity: HighlightSeverity;
  /** Rótulo do badge; quando ausente usa o próprio valor do campo. */
  label?: string;
};

export type ResolvedHighlight = {
  severity: HighlightSeverity;
  label: string;
};

/* ─── Mapas de cores para cada severity ─── */

export const SEVERITY_COLORS: Record<
  HighlightSeverity,
  { bg: string; text: string; border: string; label: string }
> = {
  danger: {
    bg: "color-mix(in srgb, var(--color-danger, #ef4444) 14%, transparent)",
    text: "var(--color-danger, #ef4444)",
    border: "color-mix(in srgb, var(--color-danger, #ef4444) 30%, transparent)",
    label: "Perigo",
  },
  warning: {
    bg: "color-mix(in srgb, #f59e0b 14%, transparent)",
    text: "#b45309",
    border: "color-mix(in srgb, #f59e0b 30%, transparent)",
    label: "Atenção",
  },
  success: {
    bg: "color-mix(in srgb, var(--color-success, #10b981) 14%, transparent)",
    text: "var(--color-success, #059669)",
    border: "color-mix(in srgb, var(--color-success, #10b981) 30%, transparent)",
    label: "Sucesso",
  },
  info: {
    bg: "color-mix(in srgb, var(--brand-primary, #3b82f6) 14%, transparent)",
    text: "var(--brand-primary, #3b82f6)",
    border: "color-mix(in srgb, var(--brand-primary, #3b82f6) 30%, transparent)",
    label: "Info",
  },
};

export const OP_LABELS: Record<HighlightOp, string> = {
  equals: "é igual a",
  notEquals: "não é igual a",
  contains: "contém",
  notEmpty: "não está vazio",
  empty: "está vazio",
};

const SEVERITIES: ReadonlySet<string> = new Set([
  "danger",
  "success",
  "warning",
  "info",
]);

const OPS: ReadonlySet<string> = new Set([
  "equals",
  "notEquals",
  "contains",
  "notEmpty",
  "empty",
]);

function normalize(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseHighlightRules(raw: unknown): HighlightRule[] {
  if (!Array.isArray(raw)) return [];
  const rules: HighlightRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const op = typeof r.op === "string" ? r.op : "";
    const severity = typeof r.severity === "string" ? r.severity : "";
    if (!OPS.has(op) || !SEVERITIES.has(severity)) continue;
    const needsValue = op !== "notEmpty" && op !== "empty";
    const value = typeof r.value === "string" ? r.value : undefined;
    if (needsValue && (value === undefined || value === "")) continue;
    const label =
      typeof r.label === "string" && r.label.trim() !== ""
        ? r.label
        : undefined;
    rules.push({
      op: op as HighlightOp,
      value,
      severity: severity as HighlightSeverity,
      label,
    });
  }
  return rules;
}

function matches(
  rule: HighlightRule,
  value: string | null | undefined,
): boolean {
  const filled = value !== null && value !== undefined && value !== "";
  switch (rule.op) {
    case "empty":
      return !filled;
    case "notEmpty":
      return filled;
    case "equals":
      return filled && normalize(value!) === normalize(rule.value ?? "");
    case "notEquals":
      return filled && normalize(value!) !== normalize(rule.value ?? "");
    case "contains":
      return (
        filled && normalize(value!).includes(normalize(rule.value ?? ""))
      );
    default:
      return false;
  }
}

/**
 * Resolve a primeira regra que casa com o valor.
 * Retorna `null` quando nenhuma regra se aplica.
 * `rules` pode ser o JSON cru (array desconhecido) — será parseado.
 */
export function resolveHighlight(
  value: string | null | undefined,
  rules: unknown,
): ResolvedHighlight | null {
  const parsed = parseHighlightRules(rules);
  if (parsed.length === 0) return null;
  for (const rule of parsed) {
    if (matches(rule, value)) {
      return {
        severity: rule.severity,
        label: rule.label ?? (value ?? "").toString(),
      };
    }
  }
  return null;
}
