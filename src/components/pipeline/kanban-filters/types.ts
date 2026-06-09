/**
 * Tipos compartilhados pelos filtros avançados do Kanban.
 *
 * Espelham o `AdvancedDealFilters` do backend
 * (`backend/src/services/kanban-filters.ts`). Mantemos copiados — propositalmente
 * não compartilhamos types entre repositórios.
 */

export type DateRangeValue = {
  from?: string | null;
  to?: string | null;
};

export type DealStatus = "OPEN" | "WON" | "LOST";

export type CustomFieldOperator =
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "filled"
  | "empty"
  | "in"
  | "gt"
  | "lt"
  | "before"
  | "after"
  | "between";

export type CustomFieldFilter = {
  /** Nome (slug) do CustomField. */
  name: string;
  operator?: CustomFieldOperator;
  value?: string | string[] | DateRangeValue | null;
};

export type TagMode = "any" | "all" | "none";

export type AdvancedDealFilters = {
  logic?: "AND" | "OR";
  search?: string;
  pipelineId?: string;
  stageIds?: string[];
  statuses?: DealStatus[];
  ownerIds?: (string | null)[];
  withoutOwner?: boolean;
  withoutContact?: boolean;
  sources?: string[];
  /** Motivos de perda (Deal.lostReason) — match exato com a tabulação. */
  lostReasons?: string[];
  tagIds?: string[];
  tagMode?: TagMode;
  withoutTags?: boolean;
  contactSearch?: string;
  contactHasPhone?: boolean;
  contactHasEmail?: boolean;
  createdAt?: DateRangeValue;
  updatedAt?: DateRangeValue;
  closedAt?: DateRangeValue;
  lastInteractionAt?: DateRangeValue;
  dealCustomFields?: CustomFieldFilter[];
  contactCustomFields?: CustomFieldFilter[];
  valueFrom?: number | null;
  valueTo?: number | null;
};

export type FilterOptionsResponse = {
  pipelines: { id: string; name: string; stages: { id: string; name: string; color: string; position: number }[] }[];
  users: { id: string; name: string; avatarUrl?: string | null; role: string; type: string }[];
  tags: { id: string; name: string; color: string; dealCount?: number }[];
  dealCustomFields: CustomField[];
  contactCustomFields: CustomField[];
  sources: string[];
  /** Motivos de perda: catálogo ativo + motivos livres já usados. */
  lossReasons?: string[];
};

export type CustomField = {
  id: string;
  name: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "SELECT" | "MULTI_SELECT" | "EMAIL" | "PHONE" | "TEXTAREA" | string;
  options: string[];
  entity: "deal" | "contact" | string;
};

export type SavedFilter = {
  id: string;
  name: string;
  entityType: string;
  filterConfig: AdvancedDealFilters;
  isDefault: boolean;
  isShared: boolean;
  userId: string | null;
  user?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** Helper: filtros estão vazios? (nenhum critério ativo) */
export function isEmptyFilters(f: AdvancedDealFilters | null | undefined): boolean {
  if (!f) return true;
  const keys = Object.keys(f) as (keyof AdvancedDealFilters)[];
  for (const k of keys) {
    const v = f[k];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      const subKeys = Object.keys(obj).filter((kk) => obj[kk] !== undefined && obj[kk] !== null && obj[kk] !== "");
      if (subKeys.length === 0) continue;
    }
    return false;
  }
  return true;
}

/**
 * Conta cada critério ativo como 1 (usado no badge de "n filtros ativos").
 */
export function countActiveFilters(f: AdvancedDealFilters | null | undefined): number {
  if (!f) return 0;
  let n = 0;
  if (f.search?.trim()) n++;
  if (f.stageIds?.length) n++;
  if (f.statuses?.length) n++;
  if (f.ownerIds?.length || f.withoutOwner) n++;
  if (f.withoutContact) n++;
  if (f.sources?.length) n++;
  if (f.lostReasons?.length) n++;
  if (f.tagIds?.length || f.withoutTags) n++;
  if (f.contactSearch?.trim()) n++;
  if (f.contactHasPhone === true || f.contactHasPhone === false) n++;
  if (f.contactHasEmail === true || f.contactHasEmail === false) n++;
  if (f.createdAt?.from || f.createdAt?.to) n++;
  if (f.updatedAt?.from || f.updatedAt?.to) n++;
  if (f.closedAt?.from || f.closedAt?.to) n++;
  if (f.lastInteractionAt?.from || f.lastInteractionAt?.to) n++;
  if (f.dealCustomFields?.length) n += f.dealCustomFields.length;
  if (f.contactCustomFields?.length) n += f.contactCustomFields.length;
  if (f.valueFrom != null || f.valueTo != null) n++;
  return n;
}
