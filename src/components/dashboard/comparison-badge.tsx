"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  current: number;
  previous: number;
  format?: (v: number) => string;
  invertColors?: boolean;
};

export function ComparisonBadge({ current, previous, format, invertColors }: Props) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="size-3" /> Sem variação
      </span>
    );
  }

  const diff = current - previous;
  const pct = previous !== 0
    ? Math.round((diff / Math.abs(previous)) * 1000) / 10
    : current > 0 ? 100 : 0;

  const isPositive = diff > 0;
  const isNeutral = diff === 0;
  const greenIsGood = !invertColors;

  const colorClass = isNeutral
    ? "text-muted-foreground"
    : (isPositive === greenIsGood)
      ? "text-emerald-600"
      : "text-red-500";

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center gap-1 text-xs font-bold", colorClass)}>
        <Icon className="size-3.5" />
        {isPositive ? "+" : ""}{pct}%
      </span>
      {format && (
        <span className="text-[10px] text-muted-foreground">
          vs {format(previous)}
        </span>
      )}
    </div>
  );
}
