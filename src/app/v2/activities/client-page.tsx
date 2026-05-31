"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import {
  IconBriefcase,
  IconChecklist,
  IconCircleCheck,
  IconClock,
  IconMail,
  IconPhone,
  IconUsers,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";

import {
  useActivities,
} from "@/features/directory-v2/hooks";
import type { ActivityTypeDto } from "@/features/directory-v2/api";

import { cn } from "@/lib/utils";

const PER_PAGE = 30;

const TYPE_META: Record<
  ActivityTypeDto,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  CALL: { label: "Ligação", icon: <IconPhone size={14} />, tone: "text-[var(--brand-primary)]" },
  MEETING: {
    label: "Reunião",
    icon: <IconUsers size={14} />,
    tone: "text-[var(--brand-secondary)]",
  },
  EMAIL: { label: "E-mail", icon: <IconMail size={14} />, tone: "text-[var(--color-info)]" },
  TASK: {
    label: "Tarefa",
    icon: <IconBriefcase size={14} />,
    tone: "text-[var(--text-secondary)]",
  },
  OTHER: {
    label: "Outro",
    icon: <IconChecklist size={14} />,
    tone: "text-[var(--text-muted)]",
  },
};

const STATUS_FILTERS: { id: "pending" | "done" | "all"; label: string; icon: React.ReactNode }[] = [
  { id: "pending", label: "Pendentes", icon: <IconClock size={14} /> },
  { id: "done", label: "Concluídas", icon: <IconCircleCheck size={14} /> },
  { id: "all", label: "Todas", icon: <IconChecklist size={14} /> },
];

function fmtDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function V2ActivitiesClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [statusFilter, setStatusFilter] = useState<"pending" | "done" | "all">("pending");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeDto | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const completed =
    statusFilter === "pending" ? false : statusFilter === "done" ? true : undefined;

  const query = useActivities({
    type: typeFilter === "ALL" ? undefined : typeFilter,
    completed,
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
          icon={<IconChecklist size={22} />}
          title="Atividades"
          description="Tarefas, ligações, reuniões e e-mails da operação"
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="inline-flex rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1 shadow-[var(--glass-shadow-sm)]">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.id);
                    setPage(1);
                  }}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-display text-[12px] font-bold transition-colors",
                    active
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  {f.icon}
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Type filter */}
          <label className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 shadow-[var(--glass-shadow-sm)]">
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Tipo
            </span>
            <select
              className="cursor-pointer border-0 bg-transparent font-display text-[13px] font-semibold text-[var(--text-primary)] outline-none"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ActivityTypeDto | "ALL");
                setPage(1);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="TASK">Tarefa</option>
              <option value="CALL">Ligação</option>
              <option value="MEETING">Reunião</option>
              <option value="EMAIL">E-mail</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>
        </div>

        {query.isLoading && items.length === 0 ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : query.error ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconChecklist size={28} />}
              title="Nenhuma atividade"
              description="Crie tarefas, reuniões e ligações para acompanhar a operação."
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-[var(--glass-bg-overlay)] backdrop-blur-md">
                  <tr className="border-b border-[var(--glass-border-subtle)]">
                    <Th>Tipo</Th>
                    <Th>Título</Th>
                    <Th>Contato</Th>
                    <Th>Negócio</Th>
                    <Th>Responsável</Th>
                    <Th>Agendada</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => {
                    const meta = TYPE_META[a.type] ?? TYPE_META.OTHER;
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-[var(--glass-border-subtle)] hover:bg-[var(--glass-bg-overlay)]"
                      >
                        <Td>
                          <span className={cn("inline-flex items-center gap-1.5", meta.tone)}>
                            {meta.icon}
                            <span className="font-display text-[12px] font-bold">
                              {meta.label}
                            </span>
                          </span>
                        </Td>
                        <Td>
                          <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                            {a.title}
                          </span>
                        </Td>
                        <Td muted>{a.contact?.name ?? "—"}</Td>
                        <Td muted>{a.deal?.title ?? "—"}</Td>
                        <Td muted>{a.user?.name ?? "—"}</Td>
                        <Td muted>{fmtDateTimeBR(a.scheduledAt)}</Td>
                        <Td>
                          {a.completed ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-success-text)]">
                              <IconCircleCheck size={12} /> Concluída
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-primary)]/20 bg-[var(--color-enterprise-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--brand-primary)]">
                              <IconClock size={12} /> Pendente
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} atividades — página ${page} de ${lastPage}`}
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
