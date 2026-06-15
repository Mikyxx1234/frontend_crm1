"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Bookmark,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  ListFilter as Filter,
  MessageSquare,
  Loader as Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import {
  createSavedFilter as apiCreateSavedFilter,
  deleteSavedFilter as apiDeleteSavedFilter,
  duplicateSavedFilter as apiDuplicateSavedFilter,
  fetchFilterOptions,
  fetchSavedFilters,
  updateSavedFilter as apiUpdateSavedFilter,
} from "@/components/pipeline/kanban-filters/api";
import { FilterChips } from "@/components/pipeline/kanban-filters/filter-chips";
import { FilterDropdown } from "@/components/pipeline/kanban-filters/filter-dropdown";
import {
  SaveFilterDialog,
  SavedFiltersMenu,
} from "@/components/pipeline/kanban-filters/saved-filters-menu";
import {
  countActiveFilters,
  isEmptyFilters,
  type AdvancedDealFilters,
  type SavedFilter,
} from "@/components/pipeline/kanban-filters/types";
import { useKanbanFilters } from "@/components/pipeline/kanban-filters/use-kanban-filters";
import {
  CardFieldsConfig,
  loadCardFields,
  type CardVisibleFields,
} from "@/components/pipeline/card-fields-config";
import { BulkActionsBar } from "@/components/pipeline/bulk-actions-bar";
import { DealWorkspace } from "@/components/pipeline/deal-workspace";
import { DealForm } from "@/components/pipeline/deal-form";
import { KanbanBoard, type BoardStage } from "@/components/pipeline/kanban-board";
import { PipelineListView } from "@/components/pipeline/pipeline-list-view";
import { SalesHubView } from "@/components/pipeline/sales-hub-view";
import { type DealQueueSortMode } from "@/components/sales-hub/deal-queue";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  pageHeaderPrimaryCtaClass,
} from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Inclui hash dos filtros avançados na key — assim o React Query refetcha
 * quando o filtro muda. Stringificamos com chaves ordenadas pra evitar
 * cache miss falso por reordenação.
 */
function stableStringify(obj: AdvancedDealFilters): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(obj, keys);
}

const boardKey = (
  pid: string,
  status: StatusFilter = "OPEN",
  advancedFilters?: AdvancedDealFilters,
) =>
  [
    "pipeline-board",
    pid,
    status,
    advancedFilters && !isEmptyFilters(advancedFilters) ? stableStringify(advancedFilters) : "",
  ] as const;

type PipelineListItem = { id: string; name: string; isDefault?: boolean };
type FilterType = "mine" | "urgent" | "vip" | null;
type StatusFilter = "OPEN" | "WON" | "LOST" | "ALL";

const VIEW_MODE_KEY = "pipeline-view-mode";
const FILTER_STORAGE_KEY = "kanban-active-filter";
const STATUS_STORAGE_KEY = "pipeline-status-filter";

const STATUS_TABS: { value: StatusFilter; label: string; icon: typeof CheckCircle2; color: string; activeColor: string }[] = [
  // `activeColor` carrega variantes `dark:` p/ todos os tons; o variant
  // `dark:` foi reconfigurado em `globals.css` (@custom-variant) p/ disparar
  // só com classe `.dark`, então essas combinações são confiáveis nos dois temas.
  { value: "OPEN", label: "Abertos", icon: Clock, color: "text-[var(--color-ink-muted)]", activeColor: "text-blue-700 border-blue-600 bg-blue-50 dark:text-blue-300 dark:border-blue-500 dark:bg-blue-500/10" },
  { value: "WON", label: "Ganhos", icon: CheckCircle2, color: "text-[var(--color-ink-muted)]", activeColor: "text-emerald-700 border-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500 dark:bg-emerald-500/10" },
  { value: "LOST", label: "Perdidos", icon: XCircle, color: "text-[var(--color-ink-muted)]", activeColor: "text-red-700 border-red-600 bg-red-50 dark:text-red-300 dark:border-red-500 dark:bg-red-500/10" },
  { value: "ALL", label: "Todos", icon: LayoutGrid, color: "text-[var(--color-ink-muted)]", activeColor: "text-slate-800 border-slate-600 bg-slate-100 dark:text-slate-100 dark:border-slate-400 dark:bg-white/10" },
];

function loadStatusFilter(): StatusFilter {
  if (typeof window === "undefined") return "OPEN";
  const stored = localStorage.getItem(STATUS_STORAGE_KEY);
  if (stored === "OPEN" || stored === "WON" || stored === "LOST" || stored === "ALL") return stored;
  return "OPEN";
}

function saveStatusFilter(s: StatusFilter) {
  try { localStorage.setItem(STATUS_STORAGE_KEY, s); } catch { /* noop */ }
}

type ViewMode = "kanban" | "list" | "saleshub";

/**
 * Mapeamento URL <-> ViewMode interno.
 * "saleshub" é histórico interno; na URL ele aparece como "agile" para
 * combinar com o rótulo "Pipeline Ágil" e ficar amigável pra usuário.
 */
const URL_TO_VIEW: Record<string, ViewMode> = {
  kanban: "kanban",
  list: "list",
  agile: "saleshub",
};
const VIEW_TO_URL: Record<ViewMode, "kanban" | "list" | "agile"> = {
  kanban: "kanban",
  list: "list",
  saleshub: "agile",
};

export function viewSegmentToMode(seg: string | undefined | null): ViewMode | null {
  if (!seg) return null;
  return URL_TO_VIEW[seg] ?? null;
}

export function viewModeToSegment(mode: ViewMode): "kanban" | "list" | "agile" {
  return VIEW_TO_URL[mode];
}

function loadViewMode(): ViewMode {
  if (typeof window === "undefined") return "kanban";
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  if (stored === "list" || stored === "saleshub") return stored;
  return "kanban";
}

function saveViewMode(m: ViewMode) {
  try { localStorage.setItem(VIEW_MODE_KEY, m); } catch { /* noop */ }
}

const VIEW_HEADER: Record<ViewMode, { title: string; description: string }> = {
  kanban: {
    title: "Funil",
    description: "Arraste e solte negócios entre etapas do pipeline.",
  },
  list: {
    title: "Lista",
    description: "Tabela completa com filtros, ordenação e ações em massa.",
  },
  saleshub: {
    title: "Pipeline Ágil",
    description: "Fila priorizada dos próximos negócios a atacar.",
  },
};

function loadFilter(): FilterType {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(FILTER_STORAGE_KEY);
  if (stored === "mine" || stored === "urgent" || stored === "vip") return stored;
  return null;
}

function saveFilter(f: FilterType) {
  try {
    if (f) localStorage.setItem(FILTER_STORAGE_KEY, f);
    else localStorage.removeItem(FILTER_STORAGE_KEY);
  } catch { /* noop */ }
}

async function fetchPipelines(): Promise<PipelineListItem[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar pipelines");
  if (Array.isArray(data)) return data;
  const list = data.pipelines ?? data.items;
  return Array.isArray(list) ? list : [];
}

async function fetchBoardGet(
  pipelineId: string,
  status: StatusFilter,
): Promise<BoardStage[]> {
  const params = new URLSearchParams();
  if (status !== "OPEN") params.set("status", status);
  const qs = params.toString();
  const res = await fetch(
    `/api/pipelines/${pipelineId}/board${qs ? `?${qs}` : ""}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string" ? ` (${data.detail})` : "";
    const msg = typeof data?.message === "string" ? data.message : "Erro ao carregar quadro";
    throw new Error(`${msg}${detail}`);
  }
  if (Array.isArray(data)) return data as BoardStage[];
  return (Array.isArray(data.stages) ? data.stages : []) as BoardStage[];
}

async function fetchBoard(
  pipelineId: string,
  status: StatusFilter = "OPEN",
  advancedFilters?: AdvancedDealFilters,
  offsetByStage?: Record<string, number>,
): Promise<BoardStage[]> {
  const hasAdv = !!advancedFilters && !isEmptyFilters(advancedFilters);
  const hasOffsets =
    !!offsetByStage && Object.values(offsetByStage).some((v) => (v ?? 0) > 0);

  if (!hasAdv && !hasOffsets) {
    return fetchBoardGet(pipelineId, status);
  }

  const res = await fetch(`/api/pipelines/${pipelineId}/board`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      filters: advancedFilters ?? {},
      offsetByStage: offsetByStage ?? {},
    }),
  });

  // Backend desatualizado (POST não existe) → degrada para GET e aplica
  // filtros client-side no que dá. Evita travar o board inteiro só porque
  // o backend deployado não suporta filtros avançados ainda.
  if (res.status === 404 || res.status === 405) {
    if (typeof window !== "undefined") {
      console.warn(
        "[pipeline-board] POST não suportado pelo backend — usando GET + filtragem client-side. Faça redeploy do backend para filtros avançados server-side.",
      );
    }
    const fallback = await fetchBoardGet(pipelineId, status);
    const filteredByStandard = applyFiltersClientSide(fallback, advancedFilters);
    return applyCustomFieldFiltersClientSide(filteredByStandard, advancedFilters);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string" ? ` (${data.detail})` : "";
    const msg = typeof data?.message === "string" ? data.message : "Erro ao carregar quadro";
    throw new Error(`${msg}${detail}`);
  }
  return (Array.isArray(data) ? data : Array.isArray(data.stages) ? data.stages : []) as BoardStage[];
}

/**
 * Filtragem client-side sobre o resultado do GET. Usada SOMENTE quando o
 * backend está desatualizado e o POST com filtros não existe.
 *
 * Cobre os critérios mais comuns (status, owner, sources, tags, datas,
 * search) — custom fields ficam de fora porque o GET não traz os valores
 * dos campos personalizados de cada deal. O usuário pode aplicar custom
 * fields, mas para ele ter efeito é necessário redeploy do backend.
 */
function applyFiltersClientSide(
  stages: BoardStage[],
  filters: AdvancedDealFilters | undefined,
): BoardStage[] {
  if (!filters || isEmptyFilters(filters)) return stages;

  const search = (filters.search ?? "").trim().toLowerCase();
  const contactSearch = (filters.contactSearch ?? "").trim().toLowerCase();
  const ownerIds = new Set((filters.ownerIds ?? []).filter((x): x is string => !!x));
  const sources = new Set(filters.sources ?? []);
  const tagIds = new Set(filters.tagIds ?? []);
  const tagMode = filters.tagMode ?? "any";
  const statuses = new Set(filters.statuses ?? []);

  const inRange = (
    iso: string | null | undefined,
    range: { from?: string | null; to?: string | null } | undefined,
  ): boolean => {
    if (!range || (!range.from && !range.to)) return true;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    if (range.from) {
      const f = new Date(range.from).getTime();
      if (t < f) return false;
    }
    if (range.to) {
      const tEnd = new Date(range.to).getTime();
      if (t > tEnd + 24 * 60 * 60 * 1000 - 1) return false;
    }
    return true;
  };

  const matches = (deal: Record<string, unknown>): boolean => {
    if (search) {
      const hay = [
        String(deal.title ?? ""),
        String((deal.contact as Record<string, unknown> | undefined)?.name ?? ""),
        String((deal.contact as Record<string, unknown> | undefined)?.email ?? ""),
        String((deal.contact as Record<string, unknown> | undefined)?.phone ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (contactSearch) {
      const c = deal.contact as Record<string, unknown> | undefined;
      const hay = [
        String(c?.name ?? ""),
        String(c?.email ?? ""),
        String(c?.phone ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(contactSearch)) return false;
    }
    if (statuses.size > 0) {
      const st = String(deal.status ?? "");
      if (!statuses.has(st as never)) return false;
    }
    if (filters.withoutOwner) {
      const owner = deal.owner as Record<string, unknown> | null | undefined;
      if (owner && owner.id) return false;
    } else if (ownerIds.size > 0) {
      const oid = String((deal.owner as Record<string, unknown> | undefined)?.id ?? "");
      if (!ownerIds.has(oid)) return false;
    }
    if (sources.size > 0) {
      const src = String((deal.contact as Record<string, unknown> | undefined)?.source ?? "");
      if (!sources.has(src)) return false;
    }
    if (filters.withoutContact) {
      const c = deal.contact as unknown;
      if (c) return false;
    }
    if (filters.contactHasPhone === true) {
      const phone = (deal.contact as Record<string, unknown> | undefined)?.phone;
      if (!phone) return false;
    } else if (filters.contactHasPhone === false) {
      const phone = (deal.contact as Record<string, unknown> | undefined)?.phone;
      if (phone) return false;
    }
    if (filters.contactHasEmail === true) {
      const email = (deal.contact as Record<string, unknown> | undefined)?.email;
      if (!email) return false;
    } else if (filters.contactHasEmail === false) {
      const email = (deal.contact as Record<string, unknown> | undefined)?.email;
      if (email) return false;
    }
    if (!inRange(String(deal.createdAt ?? ""), filters.createdAt)) return false;
    if (!inRange(String(deal.updatedAt ?? ""), filters.updatedAt)) return false;
    if (!inRange(String(deal.closedAt ?? ""), filters.closedAt)) return false;

    if (tagIds.size > 0 || filters.withoutTags) {
      const dealTagIds = new Set(
        Array.isArray(deal.tags)
          ? (deal.tags as Array<{ tag?: { id?: string } } | { id?: string }>)
              .map((t) => {
                if (typeof t === "object" && t !== null) {
                  if ("tag" in t && t.tag) return String(t.tag.id ?? "");
                  if ("id" in t) return String(t.id ?? "");
                }
                return "";
              })
              .filter(Boolean)
          : [],
      );
      if (filters.withoutTags) {
        if (dealTagIds.size > 0) return false;
      } else {
        const ids = [...tagIds];
        if (tagMode === "all") {
          if (!ids.every((id) => dealTagIds.has(id))) return false;
        } else if (tagMode === "none") {
          if (ids.some((id) => dealTagIds.has(id))) return false;
        } else {
          if (!ids.some((id) => dealTagIds.has(id))) return false;
        }
      }
    }

    return true;
  };

  return stages.map((stage) => ({
    ...stage,
    deals: Array.isArray(stage.deals)
      ? (stage.deals as Array<Record<string, unknown>>).filter(matches)
      : [],
  }));
}

// ───────────────────────────────���─────────────────────────────────────────
// Custom-field filtering client-side (fallback p/ backend desatualizado).
//
// Quando o POST /board não está disponível, o GET retorna deals SEM os
// valores dos campos personalizados. Para o filtro de Custom Field
// realmente filtrar, fazemos um round-trip extra: buscamos os valores de
// cada deal via `/api/deals/{id}/custom-fields` (e do contato via
// `/api/contacts/{id}/custom-fields`) em paralelo limitado.
//
// Cache em memória de uma execução p/ não refetchar o mesmo deal várias
// vezes durante a mesma rodada do filter (ex.: quando há 2+ critérios de
// custom field). O React Query já dá outro nível de cache acima do
// fetchBoard.
// ────────────────────────────────────────────────────────────────────���────

type CustomFieldValuesRow = {
  fieldId: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  value: string | null;
};

async function fetchDealCustomFieldValues(
  dealId: string,
): Promise<CustomFieldValuesRow[]> {
  try {
    const res = await fetch(apiUrl(`/api/deals/${dealId}/custom-fields`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? (data as CustomFieldValuesRow[]) : [];
  } catch {
    return [];
  }
}

async function fetchContactCustomFieldValues(
  contactId: string,
): Promise<CustomFieldValuesRow[]> {
  try {
    const res = await fetch(apiUrl(`/api/contacts/${contactId}/custom-fields`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? (data as CustomFieldValuesRow[]) : [];
  } catch {
    return [];
  }
}

/** Roda promessas com concorrência limitada (sem dependências externas). */
async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function runner() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await worker(items[i]);
    }
  }
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => runner(),
  );
  await Promise.all(runners);
  return out;
}

function matchesCustomFieldFilter(
  row: CustomFieldValuesRow | undefined,
  filter: { operator?: string; value?: unknown },
): boolean {
  const op = filter.operator ?? "contains";
  const v = (row?.value ?? "").toString().trim();
  const filled = v !== "";

  switch (op) {
    case "filled":
      return filled;
    case "empty":
      return !filled;
    case "eq":
      return v.toLowerCase() === String(filter.value ?? "").toLowerCase();
    case "neq":
      return v.toLowerCase() !== String(filter.value ?? "").toLowerCase();
    case "contains":
      return v.toLowerCase().includes(String(filter.value ?? "").toLowerCase());
    case "not_contains":
      return !v.toLowerCase().includes(
        String(filter.value ?? "").toLowerCase(),
      );
    case "in":
      if (!Array.isArray(filter.value)) return false;
      return (filter.value as string[]).some(
        (x) => String(x).toLowerCase() === v.toLowerCase(),
      );
    case "gt":
      return Number(v) > Number(filter.value);
    case "lt":
      return Number(v) < Number(filter.value);
    case "before":
      return !!v && new Date(v).getTime() < new Date(String(filter.value)).getTime();
    case "after":
      return !!v && new Date(v).getTime() > new Date(String(filter.value)).getTime();
    case "between": {
      const range = filter.value as { from?: string | null; to?: string | null };
      if (!v) return false;
      const t = new Date(v).getTime();
      if (range?.from && t < new Date(range.from).getTime()) return false;
      if (range?.to && t > new Date(range.to).getTime() + 24 * 60 * 60 * 1000 - 1)
        return false;
      return true;
    }
    default:
      return true;
  }
}

async function applyCustomFieldFiltersClientSide(
  stages: BoardStage[],
  filters: AdvancedDealFilters | undefined,
): Promise<BoardStage[]> {
  const dealCfs = filters?.dealCustomFields ?? [];
  const contactCfs = filters?.contactCustomFields ?? [];
  if (dealCfs.length === 0 && contactCfs.length === 0) return stages;

  // Coleta IDs únicos pra evitar refetch quando o mesmo deal/contact
  // aparece em múltiplos estágios (raro, mas defensivo).
  const dealIds = new Set<string>();
  const contactIds = new Set<string>();
  for (const stage of stages) {
    for (const d of stage.deals as Array<Record<string, unknown>>) {
      if (d.id) dealIds.add(String(d.id));
      const cid = (d.contact as Record<string, unknown> | undefined)?.id;
      if (cid) contactIds.add(String(cid));
    }
  }

  // Concorrência 6 (= limite típico do browser p/ HTTP1.1 same-origin).
  const dealRows =
    dealCfs.length > 0
      ? await withConcurrency([...dealIds], 6, async (id) => ({
          id,
          rows: await fetchDealCustomFieldValues(id),
        }))
      : [];
  const contactRows =
    contactCfs.length > 0
      ? await withConcurrency([...contactIds], 6, async (id) => ({
          id,
          rows: await fetchContactCustomFieldValues(id),
        }))
      : [];

  const dealMap = new Map<string, CustomFieldValuesRow[]>();
  for (const r of dealRows) dealMap.set(r.id, r.rows);
  const contactMap = new Map<string, CustomFieldValuesRow[]>();
  for (const r of contactRows) contactMap.set(r.id, r.rows);

  const matches = (deal: Record<string, unknown>): boolean => {
    const dealId = String(deal.id ?? "");
    const contactId = String(
      (deal.contact as Record<string, unknown> | undefined)?.id ?? "",
    );

    for (const cf of dealCfs) {
      const rows = dealMap.get(dealId) ?? [];
      const row = rows.find((r) => r.name === cf.name);
      if (!matchesCustomFieldFilter(row, cf)) return false;
    }
    for (const cf of contactCfs) {
      const rows = contactMap.get(contactId) ?? [];
      const row = rows.find((r) => r.name === cf.name);
      if (!matchesCustomFieldFilter(row, cf)) return false;
    }
    return true;
  };

  return stages.map((stage) => ({
    ...stage,
    deals: Array.isArray(stage.deals)
      ? (stage.deals as Array<Record<string, unknown>>).filter(matches)
      : [],
  }));
}

type UserOption = { id: string; name: string };

async function fetchUserOptions(): Promise<UserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.items ?? data) as UserOption[]);
}

type PipelinePageProps = {
  /**
   * View vinda do segmento de URL (`/pipeline/kanban` | `/list` | `/agile`).
   * Se ausente, caímos no fallback de localStorage — usado pelo redirect
   * em `/pipeline` raiz que pode renderizar essa página por brevíssimo
   * instante antes do redirect efetuar.
   */
  initialView?: ViewMode;
};

export default function PipelinePage({ initialView }: PipelinePageProps = {}) {
  const queryClient = useQueryClient();
  const { data: sessionData, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const currentUserId = (sessionData?.user as { id?: string })?.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [pipelineId, setPipelineId] = React.useState("");
  const pipelineBootstrapRef = React.useRef(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createStageId, setCreateStageId] = React.useState<string | null>(null);
  const [detailDealId, setDetailDealId] = React.useState<string | null>(null);
  const [cardFields, setCardFields] = React.useState<CardVisibleFields>(loadCardFields);
  const [activeFilter, setActiveFilter] = React.useState<FilterType>(loadFilter);
  const [createLoading, setCreateLoading] = React.useState(false);

  // View vem da URL quando disponível (`/pipeline/<view>`). Localstorage só
  // alimenta o fallback do `/pipeline` raiz (redirect) — não é fonte de
  // verdade aqui dentro da página.
  const viewMode: ViewMode = initialView ?? loadViewMode();
  const setViewMode = React.useCallback(
    (next: ViewMode) => {
      saveViewMode(next);
      const qs = searchParams.toString();
      const target = `/pipeline/${viewModeToSegment(next)}${qs ? `?${qs}` : ""}`;
      router.push(target);
    },
    [router, searchParams],
  );
  const [selectedDeals, setSelectedDeals] = React.useState<Set<string>>(new Set());

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(loadStatusFilter);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [salesHubQueueSearch, setSalesHubQueueSearch] = React.useState("");
  const [salesHubSortMode, setSalesHubSortMode] = React.useState<DealQueueSortMode>(() => {
    if (typeof window === "undefined") return "message_new";
    const saved = window.localStorage.getItem("sales-hub:sort-mode");
    if (
      saved === "message_new" ||
      saved === "message_old" ||
      saved === "created_new" ||
      saved === "created_old"
    ) {
      return saved;
    }
    return "message_new";
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sales-hub:sort-mode", salesHubSortMode);
  }, [salesHubSortMode]);
  const [filterAgent, setFilterAgent] = React.useState<string>("all");
  const [filterStage, setFilterStage] = React.useState<string>("all");
  const [filterMsg, setFilterMsg] = React.useState<"all" | "unread" | "no-reply">("all");
  const [filterOverdue, setFilterOverdue] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);

  // Filtros avançados — sincronizados com URL + localStorage
  const {
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    patch: patchAdvancedFilters,
    clear: clearAdvancedFilters,
    isEmpty: advancedFiltersEmpty,
  } = useKanbanFilters();
  const [advancedPanelOpen, setAdvancedPanelOpen] = React.useState(false);
  const [savedMenuOpen, setSavedMenuOpen] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [editingSavedFilter, setEditingSavedFilter] = React.useState<SavedFilter | null>(null);
  const savedAnchorRef = React.useRef<HTMLButtonElement | null>(null);
  const searchAnchorRef = React.useRef<HTMLDivElement | null>(null);

  // Paginação por coluna ("Carregar mais"). Mapa stageId -> offset.
  // Reseta quando muda pipeline / status / filtros.
  const [stageOffsets, setStageOffsets] = React.useState<Record<string, number>>({});
  const [loadingMoreStage, setLoadingMoreStage] = React.useState<string | null>(null);

  // Reset paginação quando mudar contexto (filtros/status/pipeline).
  const offsetsKey = stableStringify(advancedFilters);
  React.useEffect(() => {
    setStageOffsets({});
    setLoadingMoreStage(null);
    // intencional: queremos resetar quando QUALQUER um desses mudar
  }, [pipelineId, statusFilter, offsetsKey]);

  const filterOptionsQuery = useQuery({
    queryKey: ["kanban-filter-options"],
    queryFn: fetchFilterOptions,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
  const filterOptions = filterOptionsQuery.data ?? null;

  const savedFiltersQuery = useQuery({
    queryKey: ["kanban-saved-filters"],
    queryFn: () => fetchSavedFilters("kanban_deals"),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const savedFilters = savedFiltersQuery.data ?? [];

  // Auto-aplica filtro default ao primeiro carregamento (se nenhum filtro
  // na URL/localStorage). Aguarda `currentUserId` chegar — durante a
  // primeira renderização a sessão NextAuth ainda está em "loading".
  const defaultAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (defaultAppliedRef.current) return;
    if (savedFiltersQuery.isLoading) return;
    if (!currentUserId) return;
    if (!advancedFiltersEmpty) {
      // Já há filtros (URL/localStorage); não sobrescrevemos.
      defaultAppliedRef.current = true;
      return;
    }
    // Procura padrão do próprio usuário primeiro, depois um shared.
    const myDefault = savedFilters.find((f) => f.isDefault && f.userId === currentUserId);
    const sharedDefault = savedFilters.find((f) => f.isDefault && f.isShared);
    const def = myDefault ?? sharedDefault;
    if (def?.filterConfig && Object.keys(def.filterConfig).length > 0) {
      setAdvancedFilters(def.filterConfig);
    }
    defaultAppliedRef.current = true;
  }, [
    savedFilters,
    savedFiltersQuery.isLoading,
    advancedFiltersEmpty,
    currentUserId,
    setAdvancedFilters,
  ]);

  const { data: userOptions = [] } = useQuery({
    queryKey: ["user-options"],
    queryFn: fetchUserOptions,
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  React.useEffect(() => {
    const dealParam = searchParams.get("deal");
    if (dealParam) {
      setDetailDealId((prev) => (prev === dealParam ? prev : dealParam));
    }
  }, [searchParams]);

  const openDeal = React.useCallback(
    (id: string) => {
      setDetailDealId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("deal", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const closeDeal = React.useCallback(() => {
    setDetailDealId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("deal");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const toggleFilter = (f: FilterType) => {
    const next = activeFilter === f ? null : f;
    setActiveFilter(next);
    saveFilter(next);
  };

  const { data: pipelines = [], isLoading: plLoading, isError: plError, error: plErr } =
    useQuery({ queryKey: ["pipelines"], queryFn: fetchPipelines, enabled: isAuthenticated });

  React.useEffect(() => {
    if (!pipelineId && pipelines.length > 0) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      if (def) setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);

  React.useEffect(() => {
    if (!pipelineId) return;
    if (!pipelineBootstrapRef.current) {
      pipelineBootstrapRef.current = true;
      return;
    }
    setDetailDealId(null);
  }, [pipelineId]);

  const stageOffsetsHash = React.useMemo(() => JSON.stringify(stageOffsets), [stageOffsets]);
  const { data: board = [], isLoading: boardLoading, isFetching: boardFetching, isError: boardError, error: boardErr } =
    useQuery({
      queryKey: [...boardKey(pipelineId, statusFilter, advancedFilters), stageOffsetsHash] as const,
      queryFn: () => fetchBoard(pipelineId, statusFilter, advancedFilters, stageOffsets),
      enabled: isAuthenticated && !!pipelineId,
    });

  /**
   * "Carregar mais" — pede +100 cards na etapa. O backend retorna o set
   * acumulado (`perStage + extra`) e marca `hasMore` apropriadamente.
   */
  const handleLoadMore = React.useCallback((stageId: string) => {
    setLoadingMoreStage(stageId);
    setStageOffsets((prev) => ({ ...prev, [stageId]: (prev[stageId] ?? 0) + 100 }));
    setTimeout(() => setLoadingMoreStage(null), 800);
  }, []);

  const stageOptionsForForm = board.map((s) => ({ id: s.id, name: s.name }));

  const handleAddCard = (stageId: string) => {
    setCreateStageId(stageId);
    setCreateOpen(true);
  };

  const hasActiveAdvancedFilter =
    filterAgent !== "all" || filterStage !== "all" || filterMsg !== "all" || filterOverdue;

  const advancedCount = countActiveFilters(advancedFilters);

  const activeFilterCount =
    (filterAgent !== "all" ? 1 : 0) +
    (filterStage !== "all" ? 1 : 0) +
    (filterMsg !== "all" ? 1 : 0) +
    (filterOverdue ? 1 : 0) +
    (activeFilter ? 1 : 0) +
    advancedCount;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterAgent("all");
    setFilterStage("all");
    setFilterMsg("all");
    setFilterOverdue(false);
    setActiveFilter(null);
    saveFilter(null);
    clearAdvancedFilters();
  };

  // Handlers de filtros salvos
  const canShareSavedFilter =
    (sessionData?.user as { role?: string } | undefined)?.role === "ADMIN" ||
    (sessionData?.user as { role?: string } | undefined)?.role === "MANAGER";

  const handleApplySaved = (sf: SavedFilter) => {
    setAdvancedFilters(sf.filterConfig ?? {});
  };

  const handleSaveCurrent = async (data: { name: string; isShared: boolean; isDefault: boolean }) => {
    try {
      if (editingSavedFilter) {
        await apiUpdateSavedFilter(editingSavedFilter.id, {
          name: data.name,
          filterConfig: advancedFilters,
          isShared: data.isShared,
          isDefault: data.isDefault,
        });
      } else {
        await apiCreateSavedFilter({
          name: data.name,
          filterConfig: advancedFilters,
          isShared: data.isShared,
          isDefault: data.isDefault,
        });
      }
      setEditingSavedFilter(null);
      queryClient.invalidateQueries({ queryKey: ["kanban-saved-filters"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar filtro.");
    }
  };

  const handleDuplicateSaved = async (sf: SavedFilter) => {
    try {
      await apiDuplicateSavedFilter(sf.id);
      queryClient.invalidateQueries({ queryKey: ["kanban-saved-filters"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao duplicar.");
    }
  };

  const handleDeleteSaved = async (sf: SavedFilter) => {
    try {
      await apiDeleteSavedFilter(sf.id);
      queryClient.invalidateQueries({ queryKey: ["kanban-saved-filters"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const handleToggleDefault = async (sf: SavedFilter) => {
    try {
      await apiUpdateSavedFilter(sf.id, { isDefault: !sf.isDefault });
      queryClient.invalidateQueries({ queryKey: ["kanban-saved-filters"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar filtro.");
    }
  };

  // `totalCount` é o filtrado completo no DB (independente do limit/paginação);
  // cai pro array carregado quando o backend antigo não devolver a chave.
  const totalDeals = board.reduce((acc, s) => acc + (s.totalCount ?? s.deals.length), 0);

  return (
    <div className="-mx-3 -mt-3 -mb-3 flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg-subtle)]/60 sm:-mx-4 sm:-mt-4 sm:-mb-4 md:-mx-8 md:-mt-8 md:-mb-8">
      {/* ═══ HEADER — 1 linha estilo Kommo ═══
          Surface translúcido baseado em tokens (`--glass-bg-overlay` +
          `--color-border`) para respeitar light/dark sem `bg-white` fixo. */}
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md">

        {/* Linha única: título | pipeline | busca | ações */}
        <div className="flex items-center gap-2 px-4 py-2 md:px-6">

          {/* Título */}
          <span className="shrink-0 text-[13px] font-semibold text-foreground">
            {VIEW_HEADER[viewMode].title}
          </span>

          <div className="h-4 w-px bg-[var(--color-border)] shrink-0" />

          {/* Pipeline selector */}
          {plLoading ? (
            <Skeleton className="h-7 w-28 rounded-lg" />
          ) : plError ? (
            <p className="text-xs text-red-500">{plErr instanceof Error ? plErr.message : "Erro"}</p>
          ) : pipelines.length <= 1 ? (
            <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">
              {pipelines[0]?.name ?? "Pipeline"}
            </span>
          ) : (
            <DropdownGlass
              options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
              value={pipelineId}
              onValueChange={(v) => setPipelineId(v)}
              triggerClassName="h-7 text-[12px] font-medium"
            />
          )}

          {boardFetching && !boardLoading && (
            <TooltipHost label="Atualizando" side="bottom">
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" aria-label="Atualizando" />
            </TooltipHost>
          )}

          {/* Busca — clicar/focar abre o dropdown de filtros avançados */}
          {viewMode !== "saleshub" && (
            <div className="relative w-56 sm:w-72">
              <div ref={searchAnchorRef} className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setAdvancedPanelOpen(true)}
                  onClick={() => setAdvancedPanelOpen(true)}
                  placeholder="Buscar e filtrar..."
                  className={cn(
                    "h-8 w-full rounded-full border bg-[var(--color-input)] pl-7 pr-12 text-[12px] text-foreground placeholder:text-[var(--color-ink-muted)] backdrop-blur transition-all hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none focus:ring-[3px] focus:ring-primary/15",
                    advancedPanelOpen
                      ? "border-primary bg-[var(--color-bg-hover)] ring-[3px] ring-primary/15"
                      : "border-[var(--color-border)]",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setAdvancedPanelOpen((v) => !v)}
                  className={cn(
                    "absolute right-1.5 top-1/2 flex h-5 -translate-y-1/2 items-center gap-0.5 rounded-full px-1 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-bg-hover)] hover:text-foreground",
                    advancedCount > 0 && "text-primary",
                  )}
                  title="Filtros avançados"
                  aria-label="Abrir filtros"
                >
                  <SlidersHorizontal className="size-3" />
                  {advancedCount > 0 && (
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                      {advancedCount}
                    </span>
                  )}
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              {/* Dropdown de filtros avançados ancorado abaixo do input */}
              <FilterDropdown
                open={advancedPanelOpen}
                onOpenChange={setAdvancedPanelOpen}
                anchorRef={searchAnchorRef}
                value={advancedFilters}
                options={filterOptions}
                optionsLoading={filterOptionsQuery.isLoading}
                optionsError={
                  filterOptionsQuery.error instanceof Error
                    ? filterOptionsQuery.error.message
                    : null
                }
                onApply={(next) => setAdvancedFilters(next)}
                onClear={clearAdvancedFilters}
                onRequestSave={(current) => {
                  setAdvancedFilters(current);
                  setEditingSavedFilter(null);
                  setSaveDialogOpen(true);
                }}
              />
            </div>
          )}

          <div className="flex-1" />

          {/* Controles direita */}
          <div className="flex items-center gap-1">
            {/* Filtros */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "h-8 gap-1 px-3 text-[12px]",
                (showFilters || hasActiveAdvancedFilter || activeFilter) &&
                  "border-primary/30 bg-[var(--color-primary-soft)] text-primary hover:bg-[var(--color-primary-soft)]/80",
              )}
            >
              <Filter className="size-3" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Filtros salvos */}
            <div className="relative">
              <Button
                ref={savedAnchorRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSavedMenuOpen((v) => !v)}
                className="h-8 gap-1 px-3 text-[12px]"
                title="Filtros salvos"
              >
                <Bookmark className="size-3" />
                <span className="hidden md:inline">Salvos</span>
                {savedFilters.some((f) => f.isDefault) && (
                  <Star className="size-2.5 fill-amber-400 text-amber-500" />
                )}
              </Button>
              <SavedFiltersMenu
                open={savedMenuOpen}
                onOpenChange={setSavedMenuOpen}
                filters={savedFilters}
                loading={savedFiltersQuery.isLoading}
                currentUserId={currentUserId}
                onApply={handleApplySaved}
                onDuplicate={handleDuplicateSaved}
                onDelete={handleDeleteSaved}
                onToggleDefault={handleToggleDefault}
                anchorRef={savedAnchorRef}
              />
            </div>

            <div className="h-4 w-px bg-[var(--color-border)]" />

            {/* View toggle */}
            <div className="flex h-7 items-center rounded-md bg-[var(--color-bg-muted)] p-0.5">
              <TooltipHost label="Kanban" side="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition",
                    viewMode === "kanban"
                      ? "bg-[var(--glass-bg-overlay)] text-foreground shadow-sm"
                      : "text-[var(--color-ink-muted)] hover:text-foreground",
                  )}
                  aria-label="Kanban"
                >
                  <LayoutGrid className="size-3" />
                </button>
              </TooltipHost>
              <TooltipHost label="Lista" side="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition",
                    viewMode === "list"
                      ? "bg-[var(--glass-bg-overlay)] text-foreground shadow-sm"
                      : "text-[var(--color-ink-muted)] hover:text-foreground",
                  )}
                  aria-label="Lista"
                >
                  <List className="size-3" />
                </button>
              </TooltipHost>
              <TooltipHost label="Pipeline Ágil" side="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeals(new Set());
                    if (detailDealId) closeDeal();
                    setViewMode("saleshub");
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition",
                    viewMode === "saleshub"
                      ? "bg-[var(--glass-bg-overlay)] text-foreground shadow-sm"
                      : "text-[var(--color-ink-muted)] hover:text-foreground",
                  )}
                  aria-label="Pipeline Ágil"
                >
                  <MessageSquare className="size-3" />
                </button>
              </TooltipHost>
            </div>

            <CardFieldsConfig fields={cardFields} onChange={setCardFields} />

            <div className="h-4 w-px bg-[var(--color-border)]" />

            <Button
              type="button"
              size="sm"
              onClick={() => { setCreateStageId(null); setCreateOpen(true); }}
              disabled={!pipelineId || stageOptionsForForm.length === 0 || createLoading}
              className={cn("h-7 gap-1 px-2.5 text-[12px]", pageHeaderPrimaryCtaClass)}
              aria-label="Novo negócio"
            >
              {createLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
              <span className="hidden sm:inline">Novo</span>
            </Button>
          </div>
        </div>

        {/* Status tabs */}
        {viewMode !== "saleshub" && (
          <div className="flex flex-wrap items-center gap-0 border-t border-[var(--color-border-soft)] px-4 md:px-6">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setStatusFilter(tab.value); saveStatusFilter(tab.value); }}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-semibold transition",
                    isActive
                      ? tab.activeColor
                      : "border-transparent text-[var(--color-ink-muted)] hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                  {isActive && totalDeals > 0 && (
                    <span className="ml-0.5 text-[10px] font-bold opacity-70">
                      {totalDeals}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Filtros avançados */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-soft)] px-4 py-2 md:px-6">
            <DropdownGlass
              options={[
                { value: "all", label: "Agente" },
                { value: "none", label: "Sem responsável" },
                ...userOptions.map((u) => ({ value: u.id, label: u.name })),
              ]}
              value={filterAgent}
              onValueChange={(v) => setFilterAgent(v)}
              triggerClassName="h-7 text-[11px] font-semibold"
            />

            <DropdownGlass
              options={[
                { value: "all", label: "Etapa" },
                ...board.map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={filterStage}
              onValueChange={(v) => setFilterStage(v)}
              triggerClassName="h-7 text-[11px] font-semibold"
            />

            <DropdownGlass
              options={[
                { value: "all", label: "Mensagens" },
                { value: "unread", label: "Não lidas" },
                { value: "no-reply", label: "Sem resposta" },
              ]}
              value={filterMsg}
              onValueChange={(v) => setFilterMsg(v as "all" | "unread" | "no-reply")}
              triggerClassName="h-7 text-[11px] font-semibold"
            />

            <button
              type="button"
              onClick={() => setFilterOverdue((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                filterOverdue
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                  : "border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-muted)]",
              )}
            >
              <Clock className="size-3" />
              Vencidas
            </button>

            {(hasActiveAdvancedFilter || activeFilter || searchQuery) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-hover)] hover:text-foreground"
              >
                <X className="size-3" />
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barra de chips dos filtros avançados ativos */}
      {advancedCount > 0 && (
        <div className="flex items-center gap-2 border-b border-[var(--color-border-soft)] bg-[var(--glass-bg-overlay)] backdrop-blur-md px-4 py-2 md:px-6">
          <FilterChips
            filters={advancedFilters}
            options={filterOptions}
            onPatch={patchAdvancedFilters}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[11px] text-[var(--color-ink-soft)]"
            onClick={() => {
              setEditingSavedFilter(null);
              setSaveDialogOpen(true);
            }}
          >
            Salvar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[11px] text-[var(--color-ink-soft)]"
            onClick={clearAdvancedFilters}
          >
            <X className="size-3" />
            Limpar
          </Button>
        </div>
      )}

      {/* ═══ BOARD AREA ═══ */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {(activeFilterCount > 0 || searchQuery) && !showFilters && advancedCount === 0 && (
          <div className="absolute left-5 top-3 z-10 flex items-center gap-1.5 rounded-full border border-blue-200 bg-[var(--glass-bg-overlay)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ink-soft)] shadow-md backdrop-blur-sm dark:border-blue-500/40">
            <Filter className="size-3 text-blue-500 dark:text-blue-400" strokeWidth={2} />
            {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
            {searchQuery && <span className="text-[var(--color-ink-muted)]">· &ldquo;{searchQuery.slice(0, 15)}&rdquo;</span>}
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-hover)] hover:text-foreground"
            >
              <X className="size-2.5" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {boardError && pipelineId && (
          <div className="flex items-center justify-center p-8">
            <div className="max-w-xl rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-[14px] text-red-800 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <div className="mb-2 font-semibold">Erro ao carregar o quadro.</div>
              <div className="text-[13px] leading-relaxed">
                {boardErr instanceof Error
                  ? boardErr.message
                  : "Tente novamente em alguns instantes."}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["pipeline", pipelineId, "board"],
                    })
                  }
                  className="rounded-md border border-red-300 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/5 dark:text-red-200 dark:hover:bg-red-500/15"
                >
                  Tentar novamente
                </button>
                {!advancedFiltersEmpty && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAdvancedFilters();
                      setStageOffsets({});
                    }}
                    className="rounded-md border border-red-300 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/5 dark:text-red-200 dark:hover:bg-red-500/15"
                  >
                    Limpar filtros e recarregar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {pipelineId && !boardLoading && board.length === 0 && !boardError && (
          <div className="flex items-center justify-center p-8">
            <p className="text-[14px] font-medium text-[var(--color-ink-soft)]">Este pipeline ainda não tem estágios configurados.</p>
          </div>
        )}

        {pipelineId && (boardLoading || board.length > 0) && (
          boardLoading ? (
            <div className="flex h-full gap-3 overflow-hidden px-4 py-3 md:px-5 md:py-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex w-[300px] shrink-0 flex-col gap-1.5">
                  <Skeleton className="h-[72px] w-full rounded-xl border border-[var(--color-border)]" />
                  <Skeleton className="h-[76px] w-full rounded-md border border-[var(--color-border)]" />
                  <Skeleton className="h-[76px] w-full rounded-md border border-[var(--color-border)]" />
                  <Skeleton className="h-[76px] w-full rounded-md border border-[var(--color-border)] opacity-60" />
                </div>
              ))}
            </div>
          ) : viewMode === "saleshub" ? (
            <SalesHubView
              pipelineId={pipelineId}
              stages={board}
              statusFilter={statusFilter}
              filter={activeFilter}
              currentUserId={currentUserId}
              searchQuery={searchQuery}
              filterAgent={filterAgent}
              filterStage={filterStage}
              filterMsg={filterMsg}
              filterOverdue={filterOverdue}
              onOpenFullDeal={openDeal}
              queueSearch={salesHubQueueSearch}
              onQueueSearchChange={setSalesHubQueueSearch}
              sortMode={salesHubSortMode}
              onSortModeChange={setSalesHubSortMode}
            />
          ) : viewMode === "list" ? (
            <PipelineListView
              stages={board}
              selectedDeals={selectedDeals}
              onSelectionChange={setSelectedDeals}
              onDealClick={(id) => openDeal(id)}
              searchQuery={searchQuery}
              filterAgent={filterAgent}
              filterStage={filterStage}
              filterMsg={filterMsg}
              filterOverdue={filterOverdue}
              filter={activeFilter}
              currentUserId={currentUserId}
            />
          ) : (
            <KanbanBoard
              pipelineId={pipelineId}
              stages={board}
              statusFilter={statusFilter}
              visibleFields={cardFields}
              onDealClick={(id) => openDeal(id)}
              onAddCard={handleAddCard}
              onLoadMore={handleLoadMore}
              loadMoreStageId={loadingMoreStage}
              filter={activeFilter}
              currentUserId={currentUserId}
              searchQuery={searchQuery}
              filterAgent={filterAgent}
              filterStage={filterStage}
              filterMsg={filterMsg}
              filterOverdue={filterOverdue}
              selectedDeals={selectedDeals}
              onSelectionChange={setSelectedDeals}
            />
          )
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Novo negócio</DialogTitle>
            <DialogDescription>Preencha os dados para criar um cartão no pipeline.</DialogDescription>
          </DialogHeader>
          {stageOptionsForForm.length > 0 ? (
            <DealForm
              mode="create"
              stages={stageOptionsForForm}
              defaultValues={createStageId ? { stageId: createStageId } : undefined}
              onSuccess={() => {
                setCreateOpen(false);
                setCreateLoading(false);
                queryClient.invalidateQueries({ queryKey: ["pipeline-board", pipelineId] });
                queryClient.invalidateQueries({ queryKey: ["pipelines"] });
              }}
              onCancel={() => setCreateOpen(false)}
            />
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">Selecione um pipeline com estágios.</p>
          )}
        </DialogContent>
      </Dialog>

      <BulkActionsBar
        selectedCount={selectedDeals.size}
        selectedIds={selectedDeals}
        onClear={() => setSelectedDeals(new Set())}
        pipelineId={pipelineId}
        stages={board.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        users={userOptions}
      />

      <DealWorkspace
        dealId={detailDealId}
        open={!!detailDealId}
        onOpenChange={(open) => { if (!open) closeDeal(); }}
        pipelineId={pipelineId}
        boardStages={board}
      />

      {/* O FilterDropdown vive ancorado no input de busca (header acima). */}

      <SaveFilterDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        defaultName={editingSavedFilter?.name ?? ""}
        canShare={canShareSavedFilter}
        onSubmit={handleSaveCurrent}
      />
    </div>
  );
}
