"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { CornerDownRight, Trash2 } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type GotoNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * GotoNode — salto pra outro passo da automação (terminal: sem handle
 * de saída visível, o "goto" já carrega o destino). Accent sky pra
 * sinalizar redirecionamento.
 */
export function GotoNode({ data, selected }: NodeProps<GotoNodeData>) {
  return (
    <div
      className={cn(
        "group/node relative min-w-[210px] max-w-[270px] rounded-2xl border bg-white transition-all duration-200",
        selected
          ? "border-sky-400/60 ring-2 ring-sky-300/30 shadow-[0_10px_30px_-10px_rgba(14,165,233,0.4)]"
          : "border-slate-100 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-sky-300/50 hover:shadow-[0_10px_30px_-10px_rgba(14,165,233,0.3)]"
      )}
    >
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[#1e3a8a] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-slate-300!"
      />
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500 ring-1 ring-sky-100">
          <CornerDownRight className="size-4" strokeWidth={2.4} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold tracking-tighter leading-tight text-slate-900">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight text-slate-500">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover passo" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
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
    </div>
  );
}
