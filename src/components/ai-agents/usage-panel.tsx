"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Hash,
  Loader2,
} from "lucide-react";
import * as React from "react";

type Stats = {
  windowDays: number;
  totals: {
    runs: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  statusCounts: Record<string, number>;
  perDay: Array<{ day: string; runs: number; tokens: number; cost: number }>;
  lastRuns: Array<{
    id: string;
    source: string;
    status: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    responsePreview: string | null;
    errorMessage: string | null;
    createdAt: string;
    finishedAt: string | null;
  }>;
  draftsPending: number;
};

/**
 * Painel de uso de um agente: números agregados dos últimos 7 dias,
 * sparkline simples e últimos 10 runs com preview. Usado na aba "Uso"
 * do dialog de edição e embeddable no /monitor.
 */
export function UsagePanel({ agentId }: { agentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-agent-stats", agentId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/ai-agents/${agentId}/stats?days=7`));
      if (!res.ok) throw new Error("Falha ao carregar estatísticas.");
      return (await res.json()) as Stats;
    },
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Carregando uso...
      </div>
    );
  }

  const { totals, perDay, lastRuns, draftsPending } = data;
  const maxTokens = Math.max(1, ...perDay.map((d) => d.tokens));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          icon={<Hash className="size-3.5" />}
          label={`Runs (${data.windowDays}d)`}
          value={totals.runs.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={<Hash className="size-3.5" />}
          label="Tokens"
          value={(totals.inputTokens + totals.outputTokens).toLocaleString(
            "pt-BR",
          )}
          sub={`${totals.inputTokens.toLocaleString("pt-BR")} in • ${totals.outputTokens.toLocaleString("pt-BR")} out`}
        />
        <StatCard
          icon={<DollarSign className="size-3.5" />}
          label="Custo"
          value={`US$ ${totals.costUsd.toFixed(4)}`}
        />
        <StatCard
          icon={<Clock className="size-3.5" />}
          label="Rascunhos pendentes"
          value={String(draftsPending)}
          sub={
            draftsPending > 0
              ? "Aguardando aprovação humana"
              : "Nenhum aguardando"
          }
        />
      </div>

      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h5 className="text-xs font-semibold text-foreground/80">
            Tokens por dia (últimos {data.windowDays}d)
          </h5>
          <span className="text-[11px] text-muted-foreground">
            máx {maxTokens.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="flex h-24 items-end gap-1">
          {perDay.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Sem dados no período.
            </div>
          ) : (
            perDay.map((d) => {
              const pct = Math.max(4, (d.tokens / maxTokens) * 100);
              return (
                <div
                  key={d.day}
                  className="group flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-t bg-indigo-400/70 transition-colors group-hover:bg-indigo-500"
                    style={{ height: `${pct}%` }}
                    title={`${new Date(d.day).toLocaleDateString("pt-BR")}: ${d.tokens.toLocaleString("pt-BR")} tokens, US$ ${d.cost.toFixed(4)}`}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(d.day).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h5 className="mb-2 text-xs font-semibold text-foreground/80">
          Últimos runs
        </h5>
        {lastRuns.length === 0 ? (
          <div className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
            Nenhum run ainda. Use o playground pra testar.
          </div>
        ) : (
          <div className="space-y-1.5">
            {lastRuns.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RunRow({ run }: { run: Stats["lastRuns"][number] }) {
  const isError = run.status === "FAILED";
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-card p-2 text-xs">
      <div
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
          isError
            ? "bg-destructive/15 text-destructive"
            : run.status === "HANDOFF"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
        }`}
      >
        {isError ? (
          <AlertCircle className="size-3" />
        ) : (
          <ArrowRight className="size-3" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{run.source}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {run.status}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {new Date(run.createdAt).toLocaleString("pt-BR")}
          </span>
        </div>
        {isError ? (
          <p className="mt-0.5 line-clamp-2 text-destructive">
            {run.errorMessage}
          </p>
        ) : (
          run.responsePreview && (
            <p className="mt-0.5 line-clamp-2 text-muted-foreground">
              {run.responsePreview}
            </p>
          )
        )}
        <div className="mt-1 text-[10px] text-muted-foreground">
          {(run.inputTokens + run.outputTokens).toLocaleString("pt-BR")} tokens •{" "}
          US$ {run.costUsd.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
