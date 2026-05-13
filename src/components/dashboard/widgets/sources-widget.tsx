"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSourcesData } from "@/hooks/use-dashboard-data";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export function SourcesWidget() {
  const { data: sources, isLoading } = useSourcesData();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de fontes no período.</p>;
  }

  const chartData = sources.slice(0, 10).map((s) => ({
    name: s.source.length > 18 ? s.source.slice(0, 16) + "…" : s.source,
    contatos: s.contactCount,
    deals: s.dealCount,
    receita: s.revenue,
    conversao: s.conversionRate,
  }));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-left">
              <th className="pb-2 pr-3 font-semibold text-muted-foreground">Fonte</th>
              <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Contatos</th>
              <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Deals</th>
              <th className="pb-2 pr-3 text-right font-semibold text-muted-foreground">Receita</th>
              <th className="pb-2 text-right font-semibold text-muted-foreground">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {sources.slice(0, 8).map((s) => (
              <tr key={s.source} className="border-b border-border/20">
                <td className="py-2 pr-3 font-medium text-foreground">{s.source}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{s.contactCount}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{s.dealCount}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(s.revenue)}</td>
                <td className="py-2 text-right tabular-nums font-bold text-primary">
                  {s.conversionRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} />
            <Tooltip />
            <Bar dataKey="contatos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
