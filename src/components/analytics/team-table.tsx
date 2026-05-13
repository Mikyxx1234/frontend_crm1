"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, getInitials } from "@/lib/utils";

export type TeamRow = {
  userId: string;
  userName: string;
  dealsWon: number;
  dealsLost: number;
  revenue: number;
  activitiesCompleted: number;
  avgCycleTime: number;
};

function normalizeTeam(json: unknown): TeamRow[] {
  if (Array.isArray(json)) return json as TeamRow[];
  if (
    json &&
    typeof json === "object" &&
    "team" in json &&
    Array.isArray((json as { team: unknown }).team)
  ) {
    return (json as { team: TeamRow[] }).team;
  }
  return [];
}

async function fetchTeam(
  from?: string,
  to?: string
): Promise<TeamRow[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  const res = await fetch(
    q ? `/api/analytics/team?${q}` : "/api/analytics/team"
  );
  if (!res.ok) throw new Error("Falha ao carregar equipe");
  const json: unknown = await res.json();
  return normalizeTeam(json);
}

type SortKey =
  | "userName"
  | "dealsWon"
  | "dealsLost"
  | "revenue"
  | "activitiesCompleted"
  | "avgCycleTime";

export function TeamTable({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-team", from, to],
    queryFn: () => fetchTeam(from, to),
    enabled: Boolean(from && to),
  });

  const rows = data ?? [];

  const topUserId = useMemo(() => {
    if (!rows.length) return null;
    let best = rows[0]!;
    for (const r of rows) {
      if (r.revenue > best.revenue) best = r;
    }
    return best.userId;
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb, "pt-BR") * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "userName" ? "asc" : "desc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return <ArrowUpDown className="size-3.5 opacity-40" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    );
  }

  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader>
        <CardTitle>Desempenho da equipe</CardTitle>
        <CardDescription>
          Ganhos, receita e atividades no período selecionado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full rounded-xl" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar a equipe.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40">
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-left hover:text-foreground"
                      onClick={() => toggleSort("userName")}
                    >
                      Vendedor
                      <SortIcon column="userName" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => toggleSort("dealsWon")}
                    >
                      Ganhos
                      <SortIcon column="dealsWon" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => toggleSort("dealsLost")}
                    >
                      Perdidos
                      <SortIcon column="dealsLost" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => toggleSort("revenue")}
                    >
                      Receita
                      <SortIcon column="revenue" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => toggleSort("activitiesCompleted")}
                    >
                      Atividades
                      <SortIcon column="activitiesCompleted" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => toggleSort("avgCycleTime")}
                    >
                      Tempo médio
                      <SortIcon column="avgCycleTime" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const isTop = row.userId === topUserId && row.revenue > 0;
                  return (
                    <tr
                      key={row.userId}
                      className={cn(
                        "border-b border-border/60 transition-colors",
                        isTop && "bg-indigo-500/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm",
                              isTop
                                ? "bg-indigo-600 text-white"
                                : "bg-muted text-foreground"
                            )}
                          >
                            {getInitials(row.userName || "?")}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-medium">
                                {row.userName}
                              </span>
                              {isTop ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                >
                                  Destaque
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.dealsWon}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.dealsLost}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.activitiesCompleted}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {new Intl.NumberFormat("pt-BR", {
                          maximumFractionDigits: 1,
                        }).format(row.avgCycleTime)}{" "}
                        dias
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
