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

import { useDealsList, usePipelines } from "@/features/pipeline-v2/hooks";
import { toDealListRow } from "@/features/pipeline-v2/adapters";

import { cn } from "@/lib/utils";

const DEFAULT_PER_PAGE = 25;

const STATUS_TABS: { id: DealListTab; label: string; icon: React.ReactNode }[] = [
  { id: "abertos", label: "Abertos", icon: <IconClock size={13} /> },
  { id: "ganhos", label: "Ganhos", icon: <IconCircleCheck size={13} /> },
  { id: "perdidos", label: "Perdidos", icon: <IconCircleX size={13} /> },
  { id: "todos", label: "Todos", icon: <IconGridDots size={13} /> },
];

export default function V2PipelineListClientPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [statusTab, setStatusTab] = useState<DealListTab>("abertos");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

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

  const dealsQuery = useDealsList({
    pipelineId: pipelineId ?? undefined,
    search: debounced || undefined,
    page,
    perPage,
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
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por título, contato, CPF, RGM…"
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
                debounced
                  ? `Sem resultados para "${debounced}". Tente outros termos.`
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
