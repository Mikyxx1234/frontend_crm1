"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

import {
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconGridDots,
  IconLayoutKanban,
  IconList,
} from "@tabler/icons-react";

import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import {
  PAGE_FILTER_DROPDOWN_CLASS,
  PageFilterBar,
  PageSearchBar,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
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

  const [pipelineId, setPipelineId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [statusTab, setStatusTab] = useState<DealListTab>("abertos");

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

  const dealsQuery = useDealsList({
    pipelineId,
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
        <PageHeader
          icon={<IconLayoutKanban size={22} stroke={2.2} />}
          title="Pipeline"
          description="Lista completa de negócios — alterne entre Kanban e Lista"
          center={
            <PageSearchBar
              variant="compact"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título, contato, CPF, RGM…"
              aria-label="Buscar negócios"
            />
          }
          actions={<ViewSwitcher current="list" />}
        />

        <PageFilterBar className="w-full flex-wrap items-center justify-between gap-3">
          <DropdownGlass
            options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
            value={pipelineId ?? ""}
            onValueChange={(v) => {
              setPipelineId(v || undefined);
              setPage(1);
            }}
            menuLabel="Pipeline"
            triggerClassName={PAGE_FILTER_DROPDOWN_CLASS}
          />
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
        </PageFilterBar>

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
          label={`${total.toLocaleString("pt-BR")} negócios — página ${page} de ${lastPage}`}
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

function ViewSwitcher({ current }: { current: "kanban" | "list" }) {
  return (
    <div className="inline-flex rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1 shadow-[var(--glass-shadow-sm)]">
      <Link
        href="/pipeline"
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold transition-colors",
          current === "kanban"
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        )}
      >
        <IconLayoutKanban size={13} />
        Kanban
      </Link>
      <Link
        href="/pipeline/list"
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold transition-colors",
          current === "list"
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        )}
      >
        <IconList size={13} />
        Lista
      </Link>
    </div>
  );
}
