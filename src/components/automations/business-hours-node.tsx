"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Clock, Trash2 } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BusinessHoursNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * BusinessHoursNode — losango SIM/NAO usado antes pelo condition.
 * Reaproveitamos aqui porque business_hours é binário (dentro vs fora
 * do expediente). O condition agora é multi-branch e tem node próprio.
 */
export function BusinessHoursNode({ data, selected }: NodeProps<BusinessHoursNodeData>) {
  return (
    <div className="group/node relative pr-6 pb-6">
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[#1e3a8a] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-amber-500!"
      />
      <div
        className={cn(
          "relative mx-auto flex h-[120px] w-[120px] rotate-45 items-center justify-center rounded-2xl border-2 bg-white transition-all duration-200",
          selected
            ? "border-amber-400 shadow-[0_0_24px_-4px_rgba(245,158,11,0.5)] ring-2 ring-amber-300/30"
            : "border-amber-300/60 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:border-amber-400"
        )}
      >
        <div className="-rotate-45 px-2 text-center">
          <span className="mx-auto mb-1 inline-flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500 ring-1 ring-amber-100">
            <Clock className="size-3.5" strokeWidth={2.4} />
          </span>
          <p className="text-[12px] font-extrabold tracking-tighter leading-tight text-slate-900">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-medium tracking-tight text-slate-500">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover passo" side="top">
            <button
              type="button"
              className="absolute -right-12 -top-2 flex size-7 -rotate-45 items-center justify-center rounded-lg text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.();
              }}
              aria-label="Remover passo"
            >
              <Trash2 className="size-3.5" strokeWidth={2.2} />
            </button>
          </TooltipHost>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: "40%" }}
        className="size-3! border-2! border-white! bg-emerald-500! shadow-green-glow!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "50%" }}
        className="size-3! border-2! border-white! bg-rose-500!"
      />
      <span className="pointer-events-none absolute right-0 top-[36%] inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-emerald-700 ring-1 ring-emerald-100">
        DENTRO
      </span>
      <span className="pointer-events-none absolute bottom-0 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-rose-700 ring-1 ring-rose-100">
        FORA
      </span>
    </div>
  );
}
