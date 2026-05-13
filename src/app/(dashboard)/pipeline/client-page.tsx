"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
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
  TriangleAlert as AlertTriangle,
  User as UserIcon,
  X,
  XCircle,
} from "lucide-react";
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
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  pageHeaderDescriptionClass,
  pageHeaderTitleClass,
} from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const boardKey = (pid: string, status: StatusFilter = "OPEN") => ["pipeline-board", pid, status] as const;

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

async function fetchBoard(pipelineId: string, status: StatusFilter = "OPEN"): Promise<BoardStage[]> {
  const params = new URLSearchParams();
  if (status !== "OPEN") params.set("status", status);
  const qs = params.toString();
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/board${qs ? `?${qs}` : ""}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar quadro");
  if (Array.isArray(data)) return data;
  return Array.isArray(data.stages) ? data.stages : [];
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
  const [filterAgent, setFilterAgent] = React.useState<string>("all");
  const [filterStage, setFilterStage] = React.useState<string>("all");
  const [filterMsg, setFilterMsg] = React.useState<"all" | "unread" | "no-reply">("all");
  const [filterOverdue, setFilterOverdue] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);

  const { data: userOptions = [] } = useQuery({
    queryKey: ["user-options"],
    queryFn: fetchUserOptions,
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  React.useEffect(() => {
    // Quando estamos no SalesHub, o `?deal=` representa a selecao local
    // do painel (nao deve abrir o <DealDetail> sheet por cima). O
    // SalesHub cuida do deep-link consumindo o param direto na sua
    // inicializacao; aqui apenas evitamos abrir o modal pra nao tampar
    // a tela que o usuario acabou de escolher.
    if (viewMode === "saleshub") return;
    const dealParam = searchParams.get("deal");
    if (dealParam && dealParam !== detailDealId) {
      setDetailDealId(dealParam);
    }
  }, [searchParams, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  React.useEffect(() => { setDetailDealId(null); }, [pipelineId]);

  const { data: board = [], isLoading: boardLoading, isFetching: boardFetching, isError: boardError, error: boardErr } =
    useQuery({ queryKey: boardKey(pipelineId, statusFilter), queryFn: () => fetchBoard(pipelineId, statusFilter), enabled: isAuthenticated && !!pipelineId });

  const stageOptionsForForm = board.map((s) => ({ id: s.id, name: s.name }));

  const handleAddCard = (stageId: string) => {
    setCreateStageId(stageId);
    setCreateOpen(true);
  };

  const hasActiveAdvancedFilter =
    filterAgent !== "all" || filterStage !== "all" || filterMsg !== "all" || filterOverdue;

  const activeFilterCount =
    (filterAgent !== "all" ? 1 : 0) +
    (filterStage !== "all" ? 1 : 0) +
    (filterMsg !== "all" ? 1 : 0) +
    (filterOverdue ? 1 : 0) +
    (activeFilter ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterAgent("all");
    setFilterStage("all");
    setFilterMsg("all");
    setFilterOverdue(false);
    setActiveFilter(null);
    saveFilter(null);
  };

  const totalDeals = board.reduce((acc, s) => acc + s.deals.length, 0);

  return (
    <div className="-mx-3 -mt-3 flex flex-1 flex-col overflow-hidden bg-slate-50/60 sm:-mx-4 md:-mx-8 md:-mt-2">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white">
        {/* Row 0: Título da página — igual às outras áreas do dashboard
            (Conversas, Empresas, Contatos, etc.). Fica ANTES da toolbar
            do pipeline pra que o usuário veja imediatamente em qual
            seção do CRM está; antes só o nome do pipeline aparecia
            pequeno (text-[13px]) no meio de outros controles, o que
            causava desalinhamento visual entre páginas. */}
        <div className="flex items-center gap-3.5 px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-2.5 md:px-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
            <Filter className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className={pageHeaderTitleClass}>Sales Hub</h1>
            <p className={cn(pageHeaderDescriptionClass, "mt-0.5")}>
              Acompanhe seus negócios por etapa do funil.
            </p>
          </div>
        </div>

        {/* Row 1: Pipeline + Search + Actions
            Mobile: flex-wrap pra evitar overflow horizontal e gap menor.
            View toggle de 3 botoes cabe inteiro em 360px. */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap sm:gap-2.5 sm:px-4 md:px-5">
          {/* Pipeline selector */}
          {plLoading ? (
            <Skeleton className="h-8 w-32 rounded-lg" />
          ) : plError ? (
            <p className="text-xs text-red-500">{plErr instanceof Error ? plErr.message : "Erro"}</p>
          ) : pipelines.length <= 1 ? (
            <span className="text-[13px] font-bold text-slate-800">
              {pipelines[0]?.name ?? "Pipeline"}
            </span>
          ) : (
            <div className="relative">
              <select
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                className="h-8 cursor-pointer appearance-none rounded-lg border-0 bg-slate-100 py-0 pl-3 pr-8 text-[13px] font-bold text-slate-800 transition hover:bg-slate-200/80 focus:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Selecionar pipeline"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          )}

          {boardFetching && !boardLoading && (
            <TooltipHost label="Atualizando" side="bottom">
              <span className="size-2 rounded-full bg-blue-500 animate-pulse" aria-label="Atualizando" />
            </TooltipHost>
          )}

          {/* Search (escondido no Sales Hub — a fila tem busca própria). */}
          {viewMode !== "saleshub" && (
            <div className="relative ml-1 flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="h-8 w-full rounded-lg border-0 bg-slate-100 pl-8 pr-7 text-[13px] text-slate-700 placeholder:text-slate-400 transition hover:bg-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition",
                showFilters || hasActiveAdvancedFilter || activeFilter
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              <Filter className="size-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* View toggle */}
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
              <TooltipHost label="Kanban" side="bottom">
                <button
                  type="button"
                  onClick={() => { setViewMode("kanban"); saveViewMode("kanban"); setSelectedDeals(new Set()); }}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    viewMode === "kanban" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Kanban"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
              </TooltipHost>
              <TooltipHost label="Lista" side="bottom">
                <button
                  type="button"
                  onClick={() => { setViewMode("list"); saveViewMode("list"); }}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Lista"
                >
                  <List className="size-3.5" />
                </button>
              </TooltipHost>
              <TooltipHost label="Sales Hub" side="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("saleshub");
                    saveViewMode("saleshub");
                    setSelectedDeals(new Set());
                    // Se o DealDetail estiver aberto, fecha antes de entrar
                    // no SalesHub — senao o modal tampa o painel bimodal.
                    if (detailDealId) closeDeal();
                  }}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    viewMode === "saleshub" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Sales Hub"
                >
                  <MessageSquare className="size-3.5" />
                </button>
              </TooltipHost>
            </div>

            <CardFieldsConfig fields={cardFields} onChange={setCardFields} />

            <button
              type="button"
              onClick={() => { setCreateStageId(null); setCreateOpen(true); }}
              disabled={!pipelineId || stageOptionsForForm.length === 0 || createLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              aria-label="Novo negócio"
            >
              {createLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" strokeWidth={2.5} />}
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status tabs (Abertos/Ganhos/Perdidos/Todos) +
            quick filters. Ocultos no Sales Hub: ganha-se uma linha
            inteira de altura que a StageRibbon usa melhor, e o
            pipeline de vendas naturalmente foca em deals OPEN. */}
        {viewMode !== "saleshub" && (
        <div className="flex flex-wrap items-center gap-0 border-t border-slate-100 px-3 sm:px-4 md:px-5">
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
                    : "border-transparent text-slate-400 hover:text-slate-600",
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

          {/* Quick filters inline when filters panel is closed */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleFilter("mine")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition",
                activeFilter === "mine"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
              )}
            >
              <UserIcon className="size-3" />
              Meus
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("urgent")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition",
                activeFilter === "urgent"
                  ? "bg-amber-100 text-amber-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
              )}
            >
              <AlertTriangle className="size-3" />
              Urgentes
            </button>
          </div>
        </div>
        )}

        {/* Row 3: Advanced filters (collapsible) */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 md:px-5">
            <div className="relative">
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className={cn(
                  "h-7 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  filterAgent !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600",
                )}
              >
                <option value="all">Agente</option>
                <option value="none">Sem responsável</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className={cn(
                  "h-7 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  filterStage !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600",
                )}
              >
                <option value="all">Etapa</option>
                {board.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={filterMsg}
                onChange={(e) => setFilterMsg(e.target.value as "all" | "unread" | "no-reply")}
                className={cn(
                  "h-7 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  filterMsg !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600",
                )}
              >
                <option value="all">Mensagens</option>
                <option value="unread">Não lidas</option>
                <option value="no-reply">Sem resposta</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => setFilterOverdue((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                filterOverdue
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              <Clock className="size-3" />
              Vencidas
            </button>

            {(hasActiveAdvancedFilter || activeFilter || searchQuery) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-3" />
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ BOARD AREA ═══ */}
      <div className="relative flex-1 overflow-hidden">
        {/* Active filter badge */}
        {(activeFilterCount > 0 || searchQuery) && !showFilters && (
          <div className="absolute left-5 top-3 z-10 flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-md backdrop-blur-sm">
            <Filter className="size-3 text-blue-500" strokeWidth={2} />
            {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
            {searchQuery && <span className="text-slate-400">· &ldquo;{searchQuery.slice(0, 15)}&rdquo;</span>}
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="size-2.5" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {boardError && pipelineId && (
          <div className="flex items-center justify-center p-8">
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-[14px] font-medium text-red-700 shadow-sm">
              {boardErr instanceof Error ? boardErr.message : "Erro ao carregar o quadro."}
            </div>
          </div>
        )}

        {pipelineId && !boardLoading && board.length === 0 && !boardError && (
          <div className="flex items-center justify-center p-8">
            <p className="text-[14px] font-medium text-slate-500">Este pipeline ainda não tem estágios configurados.</p>
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
              visibleFields={cardFields}
              onDealClick={(id) => openDeal(id)}
              onAddCard={handleAddCard}
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
            <p className="text-sm text-[#64748b]">Selecione um pipeline com estágios.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedDeals.size}
        selectedIds={selectedDeals}
        onClear={() => setSelectedDeals(new Set())}
        pipelineId={pipelineId}
        stages={board.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        users={userOptions}
      />

      {/* Workspace fullscreen — variante kanban */}
      <DealWorkspace
        dealId={detailDealId}
        open={!!detailDealId}
        onOpenChange={(open) => { if (!open) closeDeal(); }}
        pipelineId={pipelineId}
        boardStages={board}
      />
    </div>
  );
}
