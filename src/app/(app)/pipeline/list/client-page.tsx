"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconGridDots,
  IconList,
  IconMenu2,
  IconSettings,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageSegmentedControl } from "@/components/crm/page-toolbar";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { PipelineSwitcher } from "@/features/pipeline-v2/extras";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  DealListTable,
  type DealListTab,
} from "@/components/crm/deal-list-table";
import { PipelineSearchFilterBar } from "@/components/pipeline/kanban-filters/v2/search-filter-bar";
import { FilterChips } from "@/components/pipeline/kanban-filters/filter-chips";
import { fetchFilterOptions } from "@/components/pipeline/kanban-filters/api";
import { useKanbanFilters } from "@/components/pipeline/kanban-filters/use-kanban-filters";
import {
  isEmptyFilters,
  type AdvancedDealFilters,
  type FilterOptionsResponse,
} from "@/components/pipeline/kanban-filters/types";

import { useDealsList, usePipelines } from "@/features/pipeline-v2/hooks";
import { toDealListRow } from "@/features/pipeline-v2/adapters";

import { cn } from "@/lib/utils";

const DEFAULT_PER_PAGE = 25;
const PIPELINE_SEARCH_LS = "kanban-pipeline-search:v1";
const PIPELINE_SORT_LS = "kanban-pipeline-sort:v1";

type SortKey =
  | "default"
  | "interaction_newest"
  | "interaction_oldest"
  | "name_az"
  | "name_za"
  | "created_newest"
  | "created_oldest";

const STATUS_TABS: { id: DealListTab; label: string; icon: React.ReactNode }[] = [
  { id: "abertos", label: "Abertos", icon: <IconClock size={13} /> },
  { id: "ganhos", label: "Ganhos", icon: <IconCircleCheck size={13} /> },
  { id: "perdidos", label: "Perdidos", icon: <IconCircleX size={13} /> },
  { id: "todos", label: "Todos", icon: <IconGridDots size={13} /> },
];

function statusFromTab(tab: DealListTab): "OPEN" | "WON" | "LOST" | undefined {
  if (tab === "abertos") return "OPEN";
  if (tab === "ganhos") return "WON";
  if (tab === "perdidos") return "LOST";
  return undefined;
}

export default function V2PipelineListClientPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(PIPELINE_SEARCH_LS) ?? "";
    } catch {
      return "";
    }
  });
  const [debounced, setDebounced] = useState(search);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [statusTab, setStatusTab] = useState<DealListTab>("abertos");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const { filters, setFilters, patch: patchFilters, clear: clearFilters } = useKanbanFilters();
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "default";
    try {
      const raw = localStorage.getItem(PIPELINE_SORT_LS);
      if (
        raw === "default" ||
        raw === "interaction_newest" ||
        raw === "interaction_oldest" ||
        raw === "name_az" ||
        raw === "name_za" ||
        raw === "created_newest" ||
        raw === "created_oldest"
      ) {
        return raw;
      }
    } catch {
      /* noop */
    }
    return "default";
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      localStorage.setItem(PIPELINE_SEARCH_LS, search);
    } catch {
      /* noop */
    }
  }, [search]);

  useEffect(() => {
    try {
      localStorage.setItem(PIPELINE_SORT_LS, sortKey);
    } catch {
      /* noop */
    }
  }, [sortKey]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const pipelinesQuery = usePipelines(isAuthenticated);
  const pipelines = pipelinesQuery.data ?? [];

  useEffect(() => {
    if (!pipelineId && pipelines.length) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setFilterOptionsLoading(true);
    fetchFilterOptions()
      .then((opts) => {
        if (!cancelled) setFilterOptions(opts);
      })
      .catch(() => {
        /* mantém opções já carregadas */
      })
      .finally(() => {
        if (!cancelled) setFilterOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Busca vai no query `search`; demais critérios no JSON `filters`
  // (evita AND duplicado do mesmo termo).
  const advancedForList = useMemo(() => {
    const { search: _ignore, ...rest } = filters;
    return rest;
  }, [filters]);

  const dealsQuery = useDealsList({
    pipelineId: pipelineId ?? undefined,
    search: debounced || undefined,
    status: statusFromTab(statusTab),
    page,
    perPage,
    filters: isEmptyFilters(advancedForList) ? undefined : advancedForList,
    enabled: isAuthenticated && !!pipelineId,
  });

  const total = dealsQuery.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const items = dealsQuery.data?.items ?? [];
  const rows = items.map(toDealListRow);

  const tabCounts = useMemo(
    () => ({
      abertos: rows.filter((d) => d.status === "OPEN").length,
      ganhos: rows.filter((d) => d.status === "WON").length,
      perdidos: rows.filter((d) => d.status === "LOST").length,
      todos: rows.length,
    }),
    [rows],
  );

  const hasActiveFilters = !isEmptyFilters(filters) || !!search.trim();

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PipelineHeader
          activeView="list"
          onViewChange={(view) => {
            if (view === "kanban") router.push("/pipeline");
          }}
          titleAccessory={
            <PipelineSwitcher
              variant="icon"
              selectedId={pipelineId}
              onChange={(id) => {
                setPipelineId(id);
                setPage(1);
              }}
            />
          }
          searchSlot={
            <PipelineSearchFilterBar
              search={search}
              onSearch={setSearch}
              filters={filters}
              onApplyFilters={setFilters}
              onClearFilters={() => {
                clearFilters();
                setSearch("");
              }}
              options={filterOptions}
              optionsLoading={filterOptionsLoading}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
              placeholder="Buscar por título, contato, CPF, RGM…"
            />
          }
          tabsOverride={
            <PageSegmentedControl
              size="compact"
              aria-label="Filtrar negócios por status"
              items={STATUS_TABS.map((t) => ({
                value: t.id,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {t.icon}
                    {t.label}
                    <span className="min-w-[18px] rounded-full bg-[var(--glass-bg-strong)] px-1.5 text-center text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
                      {tabCounts[t.id]}
                    </span>
                  </span>
                ),
              }))}
              value={statusTab}
              onChange={(v) => setStatusTab(v as DealListTab)}
            />
          }
          menuSlot={
            <div ref={menuWrapRef} className="relative">
              <TooltipGlass label="Ações do pipeline" side="bottom">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Ações do pipeline"
                  aria-expanded={menuOpen}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    menuOpen
                      ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                      : "text-[var(--brand-primary)] hover:bg-[var(--color-primary-soft)]",
                  )}
                >
                  <IconMenu2 size={18} stroke={2.2} />
                </button>
              </TooltipGlass>
              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/settings/pipeline");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                  >
                    <IconSettings size={15} className="shrink-0 text-[var(--brand-primary)]" />
                    Configurar pipeline
                  </button>
                </div>
              )}
            </div>
          }
        />

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
              Filtros ativos
            </span>
            {!isEmptyFilters(filters) && (
              <FilterChips
                filters={filters}
                options={filterOptions}
                onPatch={patchFilters}
              />
            )}
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-medium text-primary"
              >
                Busca: {search.trim()}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setSearch("");
              }}
              className="font-display text-[11px] font-semibold text-[var(--text-muted)] underline-offset-2 hover:text-[var(--brand-primary)] hover:underline"
            >
              Limpar todos
            </button>
          </div>
        )}

        {dealsQuery.isLoading && rows.length === 0 ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : dealsQuery.error ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {dealsQuery.error instanceof Error
              ? dealsQuery.error.message
              : "Erro ao carregar negócios."}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconList size={28} />}
              title="Nenhum negócio encontrado"
              description={
                hasActiveFilters
                  ? "Nenhum negócio corresponde aos filtros. Ajuste ou limpe os critérios."
                  : "Crie um novo negócio no Kanban para vê-lo aqui."
              }
            />
          </div>
        ) : (
          <DealListTable
            deals={rows}
            statusTab={statusTab}
            onRowClick={(id) => router.push(`/pipeline/${id}`)}
          />
        )}

        <PaginationGlass
          total={total}
          entityLabel="negócios"
          page={page}
          lastPage={lastPage}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
          perPage={perPage}
          onPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
        />
      </main>
    </div>
  );
}
