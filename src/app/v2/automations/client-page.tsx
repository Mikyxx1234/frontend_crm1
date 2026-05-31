"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { IconBolt, IconCircleCheck, IconCircleOff } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { SearchInput } from "@/components/crm/search-input";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";

import { useAutomations } from "@/features/automations-v2/hooks";

import { cn } from "@/lib/utils";

const PER_PAGE = 30;

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export default function V2AutomationsClientPage() {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "on" | "off">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const active =
    activeFilter === "all" ? undefined : activeFilter === "on" ? true : false;

  const query = useAutomations({
    active,
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
          icon={<IconBolt size={22} />}
          title="Automações"
          description="Fluxos disparados por eventos do CRM"
          center={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome..."
            />
          }
          actions={
            <div className="inline-flex rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1 shadow-[var(--glass-shadow-sm)]">
              {([
                { id: "all" as const, label: "Todas" },
                { id: "on" as const, label: "Ativas" },
                { id: "off" as const, label: "Pausadas" },
              ]).map((f) => {
                const isOn = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveFilter(f.id);
                      setPage(1);
                    }}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1 font-display text-[12px] font-bold transition-colors",
                      isOn
                        ? "bg-[var(--brand-primary)] text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
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
              icon={<IconBolt size={28} />}
              title="Nenhuma automação"
              description="Crie automações para disparar fluxos em eventos do CRM (mensagens, deals, contatos)."
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => router.push(`/v2/automations/${a.id}`)}
                className="flex cursor-pointer flex-col items-stretch gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 text-left shadow-[var(--glass-shadow)] backdrop-blur-md transition-transform hover:-translate-y-0.5 hover:bg-white/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                    <IconBolt size={20} />
                  </div>
                  {a.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-success-text)]">
                      <IconCircleCheck size={12} />
                      Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/60 px-2 py-0.5 font-display text-[11px] font-bold text-[var(--text-muted)]">
                      <IconCircleOff size={12} />
                      Pausada
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
                    {a.name}
                  </h3>
                  {a.description && (
                    <p className="mt-1 line-clamp-2 font-body text-[12px] text-[var(--text-muted)]">
                      {a.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[var(--glass-border-subtle)] pt-2 text-[11px]">
                  <span className="font-display font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    {a.triggerType}
                  </span>
                  <span className="font-display text-[var(--text-muted)]">
                    {a.stepCount} passos · {fmtDateBR(a.updatedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} automações — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
        />
      </main>
    </div>
  );
}
