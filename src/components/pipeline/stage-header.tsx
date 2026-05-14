"use client";

import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type StageHeaderProps = {
  name: string;
  dealCount: number;
  totalValue: number;
  color: string;
  isIncoming?: boolean;
  conversionRate?: number;
  avgDaysInStage?: number;
  maxColumnValue?: number;
  className?: string;
  onAdd?: () => void;
};

export function StageHeader({
  name,
  dealCount,
  totalValue,
  color,
  maxColumnValue = 0,
}: StageHeaderProps) {
  const progressPct = maxColumnValue > 0 ? Math.min((totalValue / maxColumnValue) * 100, 100) : 0;
  const dotColor = color || "#64748b";

  return (
    <div className="px-5 pb-3 pt-4" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="size-[10px] shrink-0 rounded-full"
            style={{ backgroundColor: dotColor, boxShadow: `0 0 0 3px ${dotColor}33` }} aria-hidden />
          <h3 className="truncate text-[15px] font-bold text-[#1e293b]">{name}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#f8fafc] px-2.5 py-1 text-[12px] font-semibold text-[#64748b]">
          {dealCount}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[13px] text-[#64748b]">
        <span className="font-bold text-[#1e40af]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(totalValue)}
        </span>
      </div>

      {maxColumnValue > 0 && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
          <div className="h-full rounded-full lumen-transition" style={{ width: `${progressPct}%`, backgroundColor: dotColor }} />
        </div>
      )}
    </div>
  );
}
