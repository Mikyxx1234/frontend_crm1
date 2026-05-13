"use client";

import { apiUrl } from "@/lib/api";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

export type SourceRow = {
  source: string;
  contactCount: number;
  dealCount: number;
  revenue: number;
  conversionRate: number;
};

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
];

function normalizeSources(json: unknown): SourceRow[] {
  if (Array.isArray(json)) return json as SourceRow[];
  if (
    json &&
    typeof json === "object" &&
    "sources" in json &&
    Array.isArray((json as { sources: unknown }).sources)
  ) {
    return (json as { sources: SourceRow[] }).sources;
  }
  return [];
}

async function fetchSources(
  from: string,
  to: string
): Promise<SourceRow[]> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/analytics/sources?${params}`));
  if (!res.ok) throw new Error("Falha ao carregar fontes");
  const json: unknown = await res.json();
  return normalizeSources(json);
}

function SourcesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: SourceRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row?.source) return null;
  return (
    <div className="rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="font-medium">{row.source}</p>
      <p className="text-muted-foreground">
        {row.contactCount} contatos · {row.dealCount} negócios
      </p>
      <p className="text-xs text-muted-foreground">
        Receita: {formatCurrency(row.revenue)} · Conv.:{" "}
        {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
          row.conversionRate
        )}
        %
      </p>
    </div>
  );
}

export function SourcesChart({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-sources", from, to],
    queryFn: () => fetchSources(from, to),
    enabled: Boolean(from && to),
  });

  const rows = data ?? [];

  const pieData = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        name: r.source,
        value: r.contactCount,
      })),
    [rows]
  );

  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader>
        <CardTitle>Fontes de leads</CardTitle>
        <CardDescription>
          Distribuição de contatos e performance por origem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar as fontes.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma fonte no período.
          </p>
        ) : (
          <>
            <div className="mx-auto w-full max-w-md" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PALETTE[i % PALETTE.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<SourcesTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-left">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Fonte
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Contatos
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Negócios
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Receita
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Conversão
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.source}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: PALETTE[i % PALETTE.length],
                            }}
                          />
                          <span className="font-medium">{row.source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.contactCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.dealCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {new Intl.NumberFormat("pt-BR", {
                          maximumFractionDigits: 1,
                        }).format(row.conversionRate)}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
