"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
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
  TriangleAlert as AlertTriangle,
  User as UserIcon,
  X,
  XCircle,
} from "lucide-react";
import {
  createSavedFilter as apiCreateSavedFilter,
  deleteSavedFilter as apiDeleteSavedFilter,
  duplicateSavedFilter as apiDuplicateSavedFilter,
  fetchBoardWithFilters,
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
  { value: "OPEN", label: "Abertos", icon: Clock, color: "text-slate-500", activeColor: "text-blue-700 border-blue-600 bg-blue-50" },
  { value: "WON", label: "Ganhos", icon: CheckCircle2, color: "text-slate-500", activeColor: "text-emerald-700 border-emerald-600 bg-emerald-50" },
  { value: "LOST", label: "Perdidos", icon: XCircle, color: "text-slate-500", activeColor: "text-red-700 border-red-600 bg-red-50" },
  { value: "ALL", label: "Todos", icon: LayoutGrid, color: "text-slate-500", activeColor: "text-slate-800 border-slate-600 bg-slate-100" },
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

/** Detecta se o backend ainda nao foi atualizado (POST nao existe). */
class BackendOutdatedError extends Error {
  constructor() {
    super(
      "O backend desta instalação ainda não foi atualizado para suportar filtros avançados. " +
        "Faça redeploy do backend (as migrations rodam automaticamente no boot).",
    );
    this.name = "BackendOutdatedError";
  }
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

  if (res.status === 404 || res.status === 405) {
    throw new BackendOutdatedError();
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

type UserOption = { id: string; name: string };

async function fetchUserOptions(): Promise<UserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.items ?? data) as UserOption[]);
}

export default function PipelinePage() {
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

  const [viewMode, setViewMode] = React.useState<ViewMode>(loadViewMode);
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
      {/* ═══ HEADER — 1 linha estilo Kommo ═══ */}
      <div className="shrink-0 border-b border-zinc-200 bg-white">

        {/* Linha única: título | pipeline | busca | ações */}
        <div className="flex items-center gap-2 px-4 py-2 md:px-6">

          {/* Título */}
          <span className="shrink-0 text-[13px] font-semibold text-zinc-800">
            {VIEW_HEADER[viewMode].title}
          </span>

          <div className="h-4 w-px bg-zinc-200 shrink-0" />

          {/* Pipeline selector */}
          {plLoading ? (
            <Skeleton className="h-7 w-28 rounded-lg" />
          ) : plError ? (
            <p className="text-xs text-red-500">{plErr instanceof Error ? plErr.message : "Erro"}</p>
          ) : pipelines.length <= 1 ? (
            <span className="text-[12px] font-medium text-zinc-600">
              {pipelines[0]?.name ?? "Pipeline"}
            </span>
          ) : (
            <div className="relative">
              <select
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                className="h-7 cursor-pointer appearance-none rounded-md border-0 bg-zinc-100 py-0 pl-2.5 pr-7 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Selecionar pipeline"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
            </div>
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
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setAdvancedPanelOpen(true)}
                  onClick={() => setAdvancedPanelOpen(true)}
                  placeholder="Buscar e filtrar..."
                  className={cn(
                    "h-7 w-full rounded-md border bg-zinc-100 pl-6 pr-12 text-[12px] text-zinc-700 placeholder:text-zinc-400 transition hover:bg-zinc-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    advancedPanelOpen
                      ? "border-blue-300 bg-white ring-2 ring-blue-500/20"
                      : "border-transparent",
                  )}
                />
                {/* Botão de filtro à direita dentro do input */}
                <button
                  type="button"
                  onClick={() => setAdvancedPanelOpen((v) => !v)}
                  className={cn(
                    "absolute right-1 top-1/2 flex h-5 -translate-y-1/2 items-center gap-0.5 rounded px-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700",
                    advancedCount > 0 && "text-blue-600",
                  )}
                  title="Filtros avançados"
                  aria-label="Abrir filtros"
                >
                  <SlidersHorizontal className="size-3" />
                  {advancedCount > 0 && (
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
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
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
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
                "h-7 gap-1 px-2 text-[12px]",
                (showFilters || hasActiveAdvancedFilter || activeFilter) &&
                  "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
              )}
            >
              <Filter className="size-3" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="flex size-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
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
                className="h-7 gap-1 px-2 text-[12px]"
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

            <div className="h-4 w-px bg-zinc-200" />

            {/* View toggle */}
            <div className="flex h-7 items-center rounded-md bg-zinc-100 p-0.5">
              <TooltipHost label="Kanban" side="bottom">
                <button
                  type="button"
                  onClick={() => { setViewMode("kanban"); saveViewMode("kanban"); setSelectedDeals(new Set()); }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition",
                    viewMode === "kanban" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600",
                  )}
                  aria-label="Kanban"
                >
                  <LayoutGrid className="size-3" />
                </button>
              </TooltipHost>
              <TooltipHost label="Lista" side="bottom">
                <button
                  type="button"
                  onClick={() => { setViewMode("list"); saveViewMode("list"); }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition",
                    viewMode === "list" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600",
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
                    setViewMode("saleshub");
                    saveViewMode("saleshub");
                    setSelectedDeals(new Set());
                    if (detailDealId) closeDeal();
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition",
                    viewMode === "saleshub" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600",
                  )}
                  aria-label="Pipeline Ágil"
                >
                  <MessageSquare className="size-3" />
                </button>
              </TooltipHost>
            </div>

            <CardFieldsConfig fields={cardFields} onChange={setCardFields} />

            <div className="h-4 w-px bg-zinc-200" />

            {/* Filtros rápidos */}
            <button
              type="button"
              onClick={() => toggleFilter("mine")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                activeFilter === "mine"
                  ? "bg-blue-100 text-blue-700"
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600",
              )}
            >
              <UserIcon className="size-3" />
              Meus
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("urgent")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                activeFilter === "urgent"
                  ? "bg-amber-100 text-amber-700"
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600",
              )}
            >
              <AlertTriangle className="size-3" />
              Urgentes
            </button>

            <div className="h-4 w-px bg-zinc-200" />

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
          <div className="flex flex-wrap items-center gap-0 border-t border-zinc-100 px-4 md:px-6">
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
                      : "border-transparent text-zinc-400 hover:text-zinc-600",
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
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-2 md:px-6">
            <div className="relative">
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className={cn(
                  "h-7 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  filterAgent !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-500",
                )}
              >
                <option value="all">Agente</option>
                <option value="none">Sem responsável</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
            </div>

            <div className="relative">
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className={cn(
                  "h-7 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  filterStage !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-500",
                )}
              >
                <option value="all">Etapa</option>
                {board.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
            </div>

            <div className="relative">
              <select
                value={filterMsg}
                onChange={(e) => setFilterMsg(e.target.value as "all" | "unread" | "no-reply")}
                className={cn(
                  "h-7 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  filterMsg !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-500",
                )}
              >
                <option value="all">Mensagens</option>
                <option value="unread">Não lidas</option>
                <option value="no-reply">Sem resposta</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
            </div>

            <button
              type="button"
              onClick={() => setFilterOverdue((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                filterOverdue
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300",
              )}
            >
              <Clock className="size-3" />
              Vencidas
            </button>

            {(hasActiveAdvancedFilter || activeFilter || searchQuery) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
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
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-white px-4 py-2 md:px-6">
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
            className="h-6 gap-1 text-[11px] text-zinc-500"
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
            className="h-6 gap-1 text-[11px] text-zinc-500"
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
          <div className="absolute left-5 top-3 z-10 flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 shadow-md backdrop-blur-sm">
            <Filter className="size-3 text-blue-500" strokeWidth={2} />
            {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
            {searchQuery && <span className="text-zinc-400">· &ldquo;{searchQuery.slice(0, 15)}&rdquo;</span>}
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
            >
              <X className="size-2.5" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {boardError && pipelineId && (
          <div className="flex items-center justify-center p-8">
            <div className="max-w-xl rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-[14px] text-red-800 shadow-sm">
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
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100"
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
                    className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100"
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
            <p className="text-[14px] font-medium text-zinc-500">Este pipeline ainda não tem estágios configurados.</p>
          </div>
        )}

        {pipelineId && (boardLoading || board.length > 0) && (
          boardLoading ? (
            <div className="flex h-full gap-3 overflow-hidden px-4 py-3 md:px-5 md:py-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex w-[300px] shrink-0 flex-col gap-1.5">
                  <Skeleton className="h-[72px] w-full rounded-xl border border-gray-200" />
                  <Skeleton className="h-[76px] w-full rounded-md border border-gray-200" />
                  <Skeleton className="h-[76px] w-full rounded-md border border-gray-200" />
                  <Skeleton className="h-[76px] w-full rounded-md border border-gray-200 opacity-60" />
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
            <p className="text-sm text-zinc-500">Selecione um pipeline com estágios.</p>
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
