"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardMetrics, useRevenueData } from "@/hooks/use-dashboard-data";
import { ComparisonBadge } from "../comparison-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export function RevenueWidget() {
  const { current, previous, isLoading, hasComparison } = useDashboardMetrics();
  const { data: revenueData, isLoading: chartLoading } = useRevenueData();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const totalRevenue = current?.totalRevenue ?? 0;
  const avgDealSize = current?.avgDealSize ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Vendido
          </p>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">
            {formatCurrency(totalRevenue)}
          </p>
          {hasComparison && previous && (
            <ComparisonBadge
              current={totalRevenue}
              previous={previous.totalRevenue}
              format={formatCurrency}
            />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ticket Médio
          </p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatCurrency(avgDealSize)}
          </p>
          {hasComparison && previous && (
            <ComparisonBadge
              current={avgDealSize}
              previous={previous.avgDealSize}
              format={formatCurrency}
            />
          )}
        </div>
      </div>

      {chartLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : revenueData && revenueData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              tick={{ fontSize: 10 }}
              stroke="#94a3b8"
            />
            <YAxis
              tickFormatter={(v: number) => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return String(v);
              }}
              tick={{ fontSize: 10 }}
              stroke="#94a3b8"
              width={50}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
              labelFormatter={(v) => new Date(String(v)).toLocaleDateString("pt-BR")}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#revGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de receita no período.</p>
      )}
    </div>
  );
}
