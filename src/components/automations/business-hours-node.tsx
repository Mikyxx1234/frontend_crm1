"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Clock, Trash2 } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { StepBadge, categoryTone } from "./node-kit";

export type BusinessHoursNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * BusinessHoursNode — losango SIM/NÃO (binário: dentro vs fora do
 * expediente). Mantém a geometria em losango (distinta do condition
 * multi-branch), reestilizada com tokens DS v2 (categoria lógica).
 * IDs de handle "true"/"false" preservados.
 */
export function BusinessHoursNode({ data, selected }: NodeProps<BusinessHoursNodeData>) {
  const tone = categoryTone.logic;

  return (
    <div className="group/node relative pb-6 pr-6">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />
      <div
        className={cn(
          "relative mx-auto flex size-[120px] rotate-45 items-center justify-center rounded-[var(--radius-xl)] border-2 bg-[var(--glass-bg-base)] backdrop-blur-[10px] transition-all duration-200"
        )}
        style={{
          borderColor: selected ? tone.fg : "var(--glass-border)",
          boxShadow: selected
            ? `0 0 0 2px ${tone.ring}, 0 14px 40px -16px ${tone.fg}`
            : "var(--glass-shadow-sm)",
        }}
      >
        <div className="-rotate-45 px-2 text-center">
          <span
            className="mx-auto mb-1 inline-flex size-7 items-center justify-center rounded-[var(--radius-md)]"
            style={{ backgroundColor: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }}
          >
            <Clock className="size-3.5" strokeWidth={2.4} />
          </span>
          <p className="text-[12px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-medium tracking-tight text-[var(--text-muted)]">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover passo" side="top">
            <button
              type="button"
              className="absolute -right-12 -top-2 flex size-7 -rotate-45 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover/node:opacity-100"
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
        className="size-3! border-2! border-[color:var(--glass-bg-base)]! bg-[var(--color-success)]!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "50%" }}
        className="size-3! border-2! border-[color:var(--glass-bg-base)]! bg-[var(--color-danger)]!"
      />
      <span
        className="pointer-events-none absolute right-0 top-[36%] inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
        style={{ backgroundColor: "var(--color-success-bg)", color: "var(--color-success-text)" }}
      >
        DENTRO
      </span>
      <span
        className="pointer-events-none absolute bottom-0 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
        style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger-text)" }}
      >
        FORA
      </span>
    </div>
  );
}
