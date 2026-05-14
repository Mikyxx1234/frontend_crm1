"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { StopCircle, Trash2 } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FinishNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * FinishNode — terminal do fluxo. Visual distinto: header gradient
 * rose (semantica de "fim/parar") + eyebrow "FINAL" branca. Sem
 * handle de saída. É o único node que mantém header colorido junto
 * do TriggerNode — um marca início, outro marca fim.
 */
export function FinishNode({ data, selected }: NodeProps<FinishNodeData>) {
  return (
    <div
      className={cn(
        "group/node relative min-w-[200px] max-w-[260px] rounded-2xl border bg-white transition-all duration-200",
        selected
          ? "border-rose-400/60 ring-2 ring-rose-300/30 shadow-[0_10px_30px_-10px_rgba(244,63,94,0.4)]"
          : "border-white/60 shadow-[var(--shadow-lg)] hover:-translate-y-px hover:shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)]"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ left: -6, top: "50%" }}
        className="size-3! border-2! border-white! bg-slate-300!"
      />

      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[#1e3a8a] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      <div className="overflow-hidden rounded-2xl">
        {/* Header rose distinto, igual em estrutura ao TriggerNode pra
            fechar o fluxo visualmente */}
        <div className="relative overflow-hidden bg-linear-to-br from-rose-500 via-rose-500 to-rose-600 px-4 py-3 text-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/15 blur-2xl" />

          <div className="relative flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <StopCircle className="size-4" strokeWidth={2.4} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/85">
                Final
              </p>
              <p className="mt-0.5 truncate text-[14px] font-extrabold tracking-tighter leading-tight">
                {data.label}
              </p>
            </div>
            {data.onDelete && (
              <TooltipHost label="Remover passo" side="top">
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/70 opacity-0 transition-all hover:bg-white/15 hover:text-white group-hover/node:opacity-100"
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

        {data.summary && (
          <div className="px-4 py-2.5">
            <p className="line-clamp-2 text-[12px] font-medium tracking-tight text-slate-500">
              {data.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
