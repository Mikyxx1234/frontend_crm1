"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  IconChartBar,
  IconClipboardList,
  IconLoader2,
  IconRefresh,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { KpiCard } from "@/components/crm/kpi-card";
import { KpiStrip } from "@/components/crm/kpi-strip";
import { DateRangePicker, type DateRange } from "@/components/crm/date-range-picker";
import { EmptyState } from "@/components/crm/empty-state";
import { ButtonGlass } from "@/components/crm/button-glass";
import { apiUrl } from "@/lib/api";
import { listTeamUsers } from "@/features/pipeline-v2/api/users";
import { useDepartments } from "@/features/conversations-settings/hooks/use-departments";
import { cn } from "@/lib/utils";

type AnalyticsResponse = {
  total: number;
  page: number;
  perPage: number;
  // Cardinalidade real — byTabulation/byUser são rankings top 20.
  distinctTabulations: number;
  distinctUsers: number;
  byTabulation: Array<{
    tabulationId: string;
    name: string;
    path: string;
    count: number;
  }>;
  byUser: Array<{ userId: string; name: string; count: number }>;
  items: Array<{
    id: string;
    occurredAt: string;
    conversationId: string | null;
    contactName: string | null;
    actorName: string | null;
    tabulationPath: string | null;
    departmentName: string | null;
  }>;
};

function defaultRange(): DateRange {
  const to = new Date();
  const from = subDays(to, 30);
  return { from, to };
}

export function TabulationsDashboard() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [actorUserId, setActorUserId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [page, setPage] = useState(1);

  const departmentsQuery = useDepartments();
  const usersQuery = useQuery({
    queryKey: ["team-users-tabulations"],
    queryFn: () => listTeamUsers(),
    staleTime: 60_000,
  });

  const fromIso = range.from?.toISOString() ?? "";
  const toIso = range.to?.toISOString() ?? "";

  const analyticsQuery = useQuery({
    queryKey: [
      "tabulation-analytics",
      fromIso,
      toIso,
      actorUserId,
      departmentId,
      page,
    ],
    queryFn: async (): Promise<AnalyticsResponse> => {
      const sp = new URLSearchParams();
      if (fromIso) sp.set("from", fromIso);
      if (toIso) sp.set("to", toIso);
      if (actorUserId) sp.set("actorUserId", actorUserId);
      if (departmentId) sp.set("departmentId", departmentId);
      sp.set("page", String(page));
      sp.set("perPage", "25");
      const res = await fetch(apiUrl(`/api/analytics/tabulations?${sp}`), {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message ?? "Erro ao carregar dashboard",
        );
      }
      return res.json();
    },
    enabled: Boolean(fromIso && toIso),
    staleTime: 15_000,
  });

  const data = analyticsQuery.data;
  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.perPage));
  }, [data]);

  const maxTab = data?.byTabulation[0]?.count ?? 1;
  const maxUser = data?.byUser[0]?.count ?? 1;
  const loadingValue = analyticsQuery.isLoading ? "…" : "—";

  return (
    <div className="flex flex-col gap-4">
      {/* z-30: o calendário do período é absolute dentro deste card, e o
          backdrop-blur do card cria um contexto de empilhamento — sem isso a
          faixa de KPIs (irmã seguinte) desenha por cima do popover. */}
      <GlassCard className="relative z-30 flex flex-wrap items-end gap-3 p-3.5">
        <div className="flex min-w-[220px] flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Período
          </span>
          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
          />
        </div>
        <label className="flex min-w-[180px] flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Usuário
          </span>
          <select
            value={actorUserId}
            onChange={(e) => {
              setActorUserId(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 text-[12.5px] text-[var(--text-primary)]"
          >
            <option value="">Todos</option>
            {(usersQuery.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Departamento
          </span>
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 text-[12.5px] text-[var(--text-primary)]"
          >
            <option value="">Todos</option>
            {(departmentsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <ButtonGlass
          type="button"
          variant="glass"
          size="sm"
          className="ml-auto"
          onClick={() => analyticsQuery.refetch()}
          disabled={analyticsQuery.isFetching}
        >
          {analyticsQuery.isFetching ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconRefresh size={14} />
          )}
          Atualizar
        </ButtonGlass>
      </GlassCard>

      {/* Sem isto uma falha na API fica idêntica a "período sem tabulação":
          os KPIs caem no traço e as listas mostram estado vazio. */}
      {analyticsQuery.isError && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/8 px-3.5 py-2.5 font-body text-[12.5px] text-[var(--color-danger)]">
          {(analyticsQuery.error as Error).message} — os números abaixo não
          refletem o período.
        </div>
      )}

      <KpiStrip aria-label="Indicadores de tabulações">
        <KpiCard
          label="Tabulações no período"
          value={data?.total ?? loadingValue}
          icon={<IconClipboardList size={20} stroke={2.2} />}
        />
        <KpiCard
          label="Motivos distintos"
          value={data?.distinctTabulations ?? loadingValue}
          icon={<IconChartBar size={20} stroke={2.2} />}
        />
        <KpiCard
          label="Agentes que tabularam"
          value={data?.distinctUsers ?? loadingValue}
          icon={<IconUsers size={20} stroke={2.2} />}
        />
        <KpiCard
          label="Top motivo"
          value={data?.byTabulation[0]?.name ?? loadingValue}
          hint={
            data?.byTabulation[0] ? `${data.byTabulation[0].count}×` : undefined
          }
          icon={<IconTrophy size={20} stroke={2.2} />}
        />
      </KpiStrip>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">
            Principais tabulações
          </h3>
          {!data?.byTabulation.length ? (
            <EmptyState
              icon={<IconChartBar size={22} />}
              title="Sem tabulações no período"
              description="Encerramentos manuais com tabulação aparecerão aqui."
              className="py-8"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.byTabulation.map((row) => (
                <li key={row.tabulationId} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span
                      className="truncate text-[var(--text-primary)]"
                      title={row.path}
                    >
                      {row.path}
                    </span>
                    <span className="shrink-0 font-medium text-[var(--text-muted)]">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(row.count / maxTab) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">
            Por usuário
          </h3>
          {!data?.byUser.length ? (
            <EmptyState
              icon={<IconUsers size={22} />}
              title="Nenhum usuário no filtro"
              description="Ajuste o período ou remova o filtro de usuário."
              className="py-8"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.byUser.map((row) => (
                <li key={row.userId} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-[var(--text-primary)]">
                      {row.name}
                    </span>
                    <span className="shrink-0 font-medium text-[var(--text-muted)]">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{ width: `${(row.count / maxUser) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Log de tabulações
          </h3>
          <span className="text-[11px] text-[var(--text-muted)]">
            {data ? `${data.total} registro(s)` : "—"}
          </span>
        </div>
        {analyticsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[var(--text-muted)]">
            <IconLoader2 size={16} className="animate-spin" />
            Carregando…
          </div>
        ) : !data?.items.length ? (
          <div className="p-6">
            <EmptyState
              icon={<IconClipboardList size={22} />}
              title="Nenhum registro"
              description="Quando um agente tabular ao encerrar, o evento aparece neste log."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-[var(--glass-bg-subtle)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Quando</th>
                  <th className="px-4 py-2.5 font-medium">Agente</th>
                  <th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 font-medium">Tabulação</th>
                  <th className="px-4 py-2.5 font-medium">Depto</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--glass-border)] text-[var(--text-primary)]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-muted)]">
                      {format(parseISO(row.occurredAt), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-4 py-2.5">{row.actorName ?? "—"}</td>
                    <td className="px-4 py-2.5">{row.contactName ?? "—"}</td>
                    <td
                      className="max-w-[280px] truncate px-4 py-2.5"
                      title={row.tabulationPath ?? ""}
                    >
                      {row.tabulationPath ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">
                      {row.departmentName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > data.perPage ? (
          <div className="flex items-center justify-between border-t border-[var(--glass-border)] px-4 py-2.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn("text-[12px] text-primary disabled:opacity-40")}
            >
              Anterior
            </button>
            <span className="text-[11px] text-[var(--text-muted)]">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-[12px] text-primary disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
