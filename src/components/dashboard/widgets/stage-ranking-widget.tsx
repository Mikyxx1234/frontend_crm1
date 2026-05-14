"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Trophy } from "lucide-react";

import { SUBTLE_SPRING, formatBRL, formatCount } from "@/lib/dashboard-tokens";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";

type AgentRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  count: number;
  value: number;
};

type StageRow = {
  stageId: string;
  stageName: string;
  stageColor: string | null;
  stagePosition: number;
  totalCount: number;
  totalValue: number;
  agents: AgentRow[];
};

type StageRankingResponse = {
  pipelineId: string;
  stages: StageRow[];
};

type Pipeline = { id: string; name: string };

async function fetchPipelines(): Promise<Pipeline[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : json.pipelines ?? [];
}

async function fetchStageRanking(
  pipelineId: string,
  from: string,
  to: string,
): Promise<StageRankingResponse> {
  const params = new URLSearchParams({ pipelineId, from, to });
  const res = await fetch(apiUrl(`/api/analytics/stage-ranking?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar ranking por etapa");
  return res.json();
}

type Metric = "count" | "value";

type StageRankingProps = {
  /** Se fornecido, sobrepõe o valor do `dashboardStore.filters.pipelineId`. */
  pipelineId?: string | null;
  /** ISO range. Se não vier, usa o período do dashboardStore. */
  from?: string;
  to?: string;
};

export function StageRankingWidget(props: StageRankingProps = {}) {
  const store = useDashboardStore();
  const [metric, setMetric] = React.useState<Metric>("count");

  const pipelinesQuery = useQuery({
    queryKey: ["pipelines"],
    queryFn: fetchPipelines,
    staleTime: 5 * 60_000,
  });

  const from = props.from ?? store.from;
  const to = props.to ?? store.to;
  const pipelineId =
    props.pipelineId !== undefined
      ? props.pipelineId
      : (store.filters.pipelineId ?? pipelinesQuery.data?.[0]?.id ?? null);

  const rankingQuery = useQuery({
    queryKey: ["stage-ranking", pipelineId, from, to],
    queryFn: () => fetchStageRanking(pipelineId!, from, to),
    enabled: !!pipelineId,
    staleTime: 30_000,
  });

  if (!pipelineId) {
    return (
      <EmptyState message="Configure um pipeline para ver o ranking por etapa." />
    );
  }
  if (rankingQuery.isLoading) return <LoadingSkeleton />;
  if (rankingQuery.isError || !rankingQuery.data) {
    return <EmptyState message="Erro ao carregar ranking." />;
  }

  const stages = rankingQuery.data.stages;
  if (stages.length === 0) {
    return <EmptyState message="Nenhuma etapa configurada neste pipeline." />;
  }

  const hasAnyData = stages.some((s) => s.agents.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle count ↔ value */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Agentes por etapa do funil
        </p>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <MetricToggleBtn
            active={metric === "count"}
            onClick={() => setMetric("count")}
            label="Qtd."
          />
          <MetricToggleBtn
            active={metric === "value"}
            onClick={() => setMetric("value")}
            label="Valor"
          />
        </div>
      </div>

      {!hasAnyData ? (
        <EmptyState message="Nenhum negócio aberto com agente atribuído no período." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {stages.map((stage) => (
              <StageColumn key={stage.stageId} stage={stage} metric={metric} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function MetricToggleBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="stage-ranking-metric"
          className="absolute inset-0 rounded-md bg-card shadow-sm"
          transition={SUBTLE_SPRING}
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );
}

function StageColumn({ stage, metric }: { stage: StageRow; metric: Metric }) {
  const top = stage.agents.slice(0, 5);
  const color = stage.stageColor || "var(--color-primary)";
  const totalForBar =
    metric === "count" ? stage.totalCount : stage.totalValue;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SUBTLE_SPRING}
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/50 p-3"
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h4 className="flex-1 truncate text-[13px] font-bold text-foreground">
          {stage.stageName}
        </h4>
        <span className="text-[11px] font-bold text-muted-foreground">
          {metric === "count"
            ? formatCount(stage.totalCount)
            : formatBRL(stage.totalValue, { compact: true })}
        </span>
      </div>

      {top.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground/70">
          Sem negócios
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {top.map((agent, idx) => {
            const primary =
              metric === "count" ? agent.count : agent.value;
            const pct =
              totalForBar > 0
                ? Math.min(100, (primary / totalForBar) * 100)
                : 0;
            return (
              <li
                key={agent.userId}
                className="group/agent flex items-center gap-2"
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                    idx === 0
                      ? "bg-amber-100 text-amber-700"
                      : idx === 1
                        ? "bg-slate-100 text-foreground"
                        : idx === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx === 0 ? (
                    <Trophy className="size-3" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
                      {agent.name}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-foreground">
                      {metric === "count"
                        ? formatCount(agent.count)
                        : formatBRL(agent.value, { compact: true })}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={SUBTLE_SPRING}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {stage.agents.length > top.length && (
        <div className="flex items-center justify-end gap-1 pt-1 text-[10px] font-semibold text-muted-foreground">
          <span>+{stage.agents.length - top.length} agentes</span>
          <ChevronRight className="size-3" />
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex h-32 flex-col gap-2 rounded-xl border border-border/60 bg-muted/40 p-3"
        >
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
          <div className="h-2 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-2 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
