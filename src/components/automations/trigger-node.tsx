"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TriggerNodeData = {
  label: string;
  summary: string;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * TriggerNode — porta de entrada da automação. Visual premium:
 * gradient brand no header, barra de brilho neon no topo, eyebrow
 * "GATILHO" em tracking-widest. Único node com header colorido —
 * sinaliza autoridade e ponto de origem do fluxo.
 */
export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <div
      className={cn(
        "min-w-[230px] max-w-[280px] overflow-hidden rounded-2xl border bg-white transition-all duration-200",
        selected
          ? "border-brand-blue/50 shadow-blue-glow ring-2 ring-brand-blue/30"
          : "border-white/60 shadow-premium hover:-translate-y-px hover:shadow-blue-glow"
      )}
    >
      {/* Header com gradient brand */}
      <div className="relative overflow-hidden bg-linear-to-br from-brand-blue via-[#5a87ff] to-[#7b9bff] px-4 py-3 text-white">
        {/* Brilho neon sutil no topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent" />
        {/* Halo radial decorativo no canto */}
        <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/15 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
            <Zap className="size-4 text-white" strokeWidth={2.6} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/85">
              Gatilho
            </p>
            <p className="mt-0.5 truncate text-[14px] font-black tracking-tighter leading-tight">
              {data.label}
            </p>
          </div>
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
          </span>
        </div>
      </div>

      {/* Body — resumo */}
      <div className="px-4 py-2.5">
        <p className="line-clamp-2 text-[12px] font-medium tracking-tight text-slate-500">
          {data.summary}
        </p>
      </div>

      {/* Stats pílulas */}
      {hasStats && (
        <TooltipHost label="Ver eventos" side="bottom">
          <button
            type="button"
            className="group/stats flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 transition-colors hover:bg-slate-50/60"
            onClick={(e) => {
              e.stopPropagation();
              data.onStatsClick?.();
            }}
            aria-label="Ver eventos"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="size-3" />
              {s.success}
            </span>
            {s.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-rose-700 ring-1 ring-rose-100">
                <AlertTriangle className="size-3" />
                {s.failed}
              </span>
            )}
          </button>
        </TooltipHost>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="size-3.5! border-2! border-white! bg-brand-blue! shadow-blue-glow!"
      />
    </div>
  );
}
