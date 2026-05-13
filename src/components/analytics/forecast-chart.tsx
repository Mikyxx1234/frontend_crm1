"use client";

import { useId, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

export type ForecastMonth = {
  month: string;
  predictedRevenue: number;
};

type ForecastResponse = {
  forecast: ForecastMonth[];
  totalWeightedValue: number;
};

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

async function fetchForecast(
  pipelineId?: string
): Promise<ForecastResponse> {
  const params = new URLSearchParams();
  if (pipelineId) params.set("pipelineId", pipelineId);
  const q = params.toString();
  const res = await fetch(
    q ? `/api/analytics/forecast?${q}` : "/api/analytics/forecast"
  );
  if (!res.ok) throw new Error("Falha ao carregar previsão");
  return res.json() as Promise<ForecastResponse>;
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: { value?: number; dataKey?: string }[];
}) {
  if (!active || !payload?.length) return null;
  const bar = payload.find((p) => p.dataKey === "predictedRevenue");
  const v = Number(bar?.value ?? payload[0]?.value);
  return (
    <div className="rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      {label ? (
        <p className="text-xs font-medium text-foreground">{label}</p>
      ) : null}
      <p className="text-muted-foreground">Previsão mensal</p>
      <p className="font-semibold">{formatCurrency(v)}</p>
    </div>
  );
}

export function ForecastChart({
  pipelineId,
  className,
}: {
  pipelineId?: string;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-forecast", pipelineId ?? "all"],
    queryFn: () => fetchForecast(pipelineId),
  });

  const chartRows = useMemo(() => {
    const f = data?.forecast ?? [];
    return f.map((row) => ({
      ...row,
      label: formatMonthLabel(row.month),
    }));
  }, [data?.forecast]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/80 bg-gradient-to-br from-indigo-500/10 via-background to-violet-500/5 shadow-sm sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Pipeline ponderado</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {isLoading ? (
                <Skeleton className="h-9 w-40" />
              ) : (
                formatCurrency(data?.totalWeightedValue ?? 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Soma do valor dos negócios abertos × probabilidade da etapa
              {pipelineId ? " (pipeline selecionado)" : " (todos os pipelines)"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Previsão — próximos meses</CardTitle>
          <CardDescription>
            Receita prevista por mês (ponderada + distribuição do saldo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full rounded-xl" />
          ) : isError ? (
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar a previsão.
            </p>
          ) : chartRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem dados de previsão.
            </p>
          ) : (
            <div className="w-full" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={chartRows}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`fcBar-${gradId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-border/60"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        maximumFractionDigits: 0,
                      }).format(Number(v))
                    }
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ForecastTooltip />} />
                  <Bar
                    dataKey="predictedRevenue"
                    fill={`url(#fcBar-${gradId})`}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line
                    type="monotone"
                    dataKey="predictedRevenue"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
