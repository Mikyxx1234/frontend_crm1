"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { IconFilter, IconLayoutKanban, IconList } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { SearchInput } from "@/components/crm/search-input";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { DealListTable } from "@/components/crm/deal-list-table";

import { useDealsList } from "@/features/pipeline-v2/hooks";
import { usePipelines } from "@/features/pipeline-v2/hooks";
import { toDealListRow } from "@/features/pipeline-v2/adapters";

import { cn } from "@/lib/utils";

const PER_PAGE = 30;

/**
 * Visão "Lista" do pipeline /v2 — cabeada em `GET /api/deals`.
 *
 * - Switcher Kanban/Lista no topo (alterna entre `/v2/pipeline` e
 *   `/v2/pipeline/list`).
 * - Filtro por pipeline (dropdown nativo, escolha o pipeline default).
 * - Busca por título/contato (debounce 300ms).
 * - Paginação server-side (campo `total` do endpoint).
 *
 * O componente da tabela já controla as tabs Abertos/Ganhos/Perdidos/Todos
 * client-side. Quando o volume crescer, podemos elevar o filtro de status
 * para a query (`?status=OPEN`) e a ordenação para `?sortBy/sortOrder`.
 */
export default function V2PipelineListClientPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [pipelineId, setPipelineId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  // Debounce 300ms para a busca.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const pipelinesQuery = usePipelines(isAuthenticated);
  const pipelines = pipelinesQuery.data ?? [];

  // Pipeline default: o `isDefault` se existir, senão o primeiro.
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
    perPage: PER_PAGE,
    enabled: isAuthenticated && !!pipelineId,
  });

  const total = dealsQuery.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const items = dealsQuery.data?.items ?? [];
  const rows = items.map(toDealListRow);

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconList size={22} />}
          title="Pipeline"
          description="Lista completa de negócios — alterne entre Kanban e Lista"
          center={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título, e-mail..."
            />
          }
          actions={
            <>
              {/* Filtro de pipeline (nativo, simples). */}
              <label className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 shadow-[var(--glass-shadow-sm)]">
                <IconFilter size={14} className="text-[var(--text-muted)]" />
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Pipeline
                </span>
                <select
                  className="cursor-pointer border-0 bg-transparent font-display text-[13px] font-semibold text-[var(--text-primary)] outline-none"
                  value={pipelineId ?? ""}
                  onChange={(e) => {
                    setPipelineId(e.target.value || undefined);
                    setPage(1);
                  }}
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <ViewSwitcher current="list" />
            </>
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
            onRowClick={(id) => router.push(`/pipeline/${id}`)}
          />
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} negócios — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
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
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-display text-[12px] font-bold transition-colors",
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
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-display text-[12px] font-bold transition-colors",
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
