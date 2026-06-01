"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { IconBuilding } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { SearchInput } from "@/components/crm/search-input";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";

import { useCompanies } from "@/features/directory-v2/hooks";

const PER_PAGE = 30;

export default function V2CompaniesClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useCompanies({
    search: debounced || undefined,
    page,
    perPage: PER_PAGE,
    enabled: isAuthenticated,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconBuilding size={22} />}
          title="Empresas"
          description="Empresas cadastradas no CRM"
          center={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, domínio..."
            />
          }
        />

        {query.isLoading && items.length === 0 ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : query.error ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconBuilding size={28} />}
              title="Nenhuma empresa encontrada"
              description={
                debounced
                  ? `Sem resultados para "${debounced}".`
                  : "Crie empresas via POST /api/companies ou pela edição de contatos."
              }
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-[var(--glass-bg-overlay)] backdrop-blur-md">
                  <tr className="border-b border-[var(--glass-border-subtle)]">
                    <Th>Nome</Th>
                    <Th>Domínio</Th>
                    <Th>Setor</Th>
                    <Th>Telefone</Th>
                    <Th>Contatos</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--glass-border-subtle)] hover:bg-[var(--glass-bg-overlay)]"
                    >
                      <Td>
                        <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                          {c.name}
                        </span>
                      </Td>
                      <Td muted>{c.domain ?? "—"}</Td>
                      <Td muted>{c.industry ?? "—"}</Td>
                      <Td muted>{c.phone ?? "—"}</Td>
                      <Td>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-enterprise-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--brand-primary)]">
                          {c._count.contacts}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} empresas — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
        />
      </main>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 text-left font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
      {children}
    </th>
  );
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className="px-3 py-3">
      <span
        className={`font-display text-[13px] ${
          muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
        }`}
      >
        {children}
      </span>
    </td>
  );
}
