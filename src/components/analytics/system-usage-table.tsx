"use client";

/**
 * Aba "Uso do sistema" — mostra por consultor:
 *  · Tempo total com o CRM aberto na janela.
 *  · Nº de sessões (aberturas do sistema).
 *  · Última vez visto + presença atual.
 *
 * NÃO confundir com o status de Distribuição (Online/Ausente/Offline)
 * — isso aqui mede tempo real de aba aberta autenticada.
 */

import { useQuery } from "@tanstack/react-query";
import { IconClockPlay, IconUserCheck } from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { UserAvatar } from "@/components/crm/user-avatar";
import { SystemPresenceIndicator } from "@/components/crm/system-presence-indicator";
import { bentoCardLargeClass, bentoLabelClass } from "@/lib/dashboard-tokens";
import { cn } from "@/lib/utils";

interface SystemUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  avatarUrl: string | null;
  totalSeconds: number;
  sessionCount: number;
  lastSeenAt: string | null;
  systemOnline: boolean;
}

interface SystemUsageResponse {
  items: SystemUsageRow[];
  pending?: boolean;
}

async function fetchSystemUsage(
  from: string,
  to: string,
): Promise<SystemUsageResponse> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/system-usage?${params}`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao carregar uso do sistema.");
  return res.json() as Promise<SystemUsageResponse>;
}

function fmtDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 60) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function SystemUsageTable({ from, to }: { from: string; to: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-system-usage", from, to],
    queryFn: () => fetchSystemUsage(from, to),
    enabled: Boolean(from && to),
  });

  const items = data?.items ?? [];
  const onlineNow = items.filter((r) => r.systemOnline).length;
  const totalSeconds = items.reduce((acc, r) => acc + r.totalSeconds, 0);

  return (
    <div className="space-y-4">
      {/* Cards resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Online agora"
          value={String(onlineNow)}
          hint={`de ${items.length} consultor${items.length === 1 ? "" : "es"}`}
          icon={<IconUserCheck size={16} />}
        />
        <SummaryCard
          label="Tempo total no CRM"
          value={fmtDuration(totalSeconds) || "0"}
          hint="soma da equipe na janela"
          icon={<IconClockPlay size={16} />}
        />
        <SummaryCard
          label="Média por consultor"
          value={
            items.length > 0
              ? fmtDuration(Math.round(totalSeconds / items.length))
              : "—"
          }
          hint="quando distribuído por usuário ativo"
          icon={<IconClockPlay size={16} />}
        />
      </div>

      <div className={cn(bentoCardLargeClass, "overflow-hidden p-0")}>
        <div className="border-b border-[var(--color-border-soft)] px-5 py-3">
          <span className={bentoLabelClass}>Uso do CRM por consultor</span>
          <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
            Presença de <b>uso</b> (aba aberta) — separada do status manual da
            Distribuição.
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[13px] text-[var(--color-ink-soft)]">
            Carregando…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[13px] text-[var(--color-danger,#dc2626)]">
            {error instanceof Error ? error.message : "Erro ao carregar."}
          </div>
        ) : data?.pending ? (
          <div className="p-8 text-center text-[13px] text-[var(--color-ink-soft)]">
            Aguardando primeira coleta de presença. Volte em instantes.
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[var(--color-ink-soft)]">
            Sem dados de uso na janela selecionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="bg-[var(--color-bg-subtle)]">
                <tr>
                  <Th>Consultor</Th>
                  <Th align="right">Tempo no CRM</Th>
                  <Th align="right">Sessões</Th>
                  <Th align="right">Última atividade</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr
                    key={r.userId}
                    className="border-t border-[var(--color-border-soft)]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <UserAvatar
                          name={r.userName ?? r.userEmail ?? "—"}
                          imageUrl={r.avatarUrl ?? null}
                          size={28}
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                            <span className="truncate">
                              {r.userName ?? "Sem nome"}
                            </span>
                            <SystemPresenceIndicator
                              systemOnline={r.systemOnline}
                              lastSeenAt={r.lastSeenAt}
                            />
                          </p>
                          <p className="truncate text-[11px] text-[var(--color-ink-soft)]">
                            {r.userEmail ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold tabular-nums text-[var(--color-text-primary)]">
                      {fmtDuration(r.totalSeconds)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] tabular-nums text-[var(--color-ink-soft)]">
                      {r.sessionCount}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] text-[var(--color-ink-soft)]">
                      {r.lastSeenAt
                        ? new Date(r.lastSeenAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-soft)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-ink-soft)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-soft)]">
          {label}
        </p>
        <p className="mt-0.5 text-[20px] font-bold leading-none text-[var(--color-text-primary)] tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">{hint}</p>
      </div>
    </div>
  );
}
