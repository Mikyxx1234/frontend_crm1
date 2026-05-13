"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageCircle,
  Pause,
  Trash2,
} from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type WaitNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  hasReceivedGoto: boolean;
  hasTimeoutGoto: boolean;
  timeoutLabel: string;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * WaitNode — espera mensagem ou cronômetro estourar. Card premium com
 * 2 sub-rows: "received" (verde) e "timeout" (cinza), cada uma com
 * seu handle saindo lateralmente. Accent orange (família do Delay).
 */
export function WaitNode({ data, selected }: NodeProps<WaitNodeData>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <div
      className={cn(
        "group/node relative min-w-[250px] max-w-[310px] rounded-2xl border bg-white transition-all duration-200",
        selected
          ? "border-orange-400/60 ring-2 ring-orange-300/30 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.4)]"
          : "border-slate-100 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-orange-300/50 hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)]"
      )}
    >
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-brand-navy to-[#1e3a8a] text-[10px] font-black tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-slate-300!"
      />

      {/* Header */}
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-100">
          <Pause className="size-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black tracking-tighter leading-tight text-slate-900">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight text-slate-500">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover espera" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.();
              }}
              aria-label="Remover espera"
            >
              <Trash2 className="size-3.5" strokeWidth={2.2} />
            </button>
          </TooltipHost>
        )}
      </div>

      {/* Condition rows */}
      <div className="border-t border-slate-100 bg-linear-to-b from-slate-50/40 to-transparent">
        <div className="relative flex h-8 items-center gap-2 border-b border-slate-100/80 px-3.5">
          <MessageCircle className="size-3 shrink-0 text-emerald-500" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[11px] font-bold tracking-tight text-emerald-700">
            Até a mensagem recebida
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="received"
            className="size-3! border-2! border-white! bg-emerald-500!"
          />
        </div>

        <div className="relative flex h-8 items-center gap-2 px-3.5">
          <Clock className="size-3 shrink-0 text-slate-400" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[11px] font-medium tracking-tight text-slate-500">
            {data.timeoutLabel || "Cronômetro"}
          </span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="timeout"
            className="size-3! border-2! border-white! bg-slate-400!"
            style={{ left: "70%" }}
          />
        </div>
      </div>

      {/*
        NB: o "Aguardar resposta" só tem DUAS saídas legítimas — o handle
        verde "received" (id="received", topo à direita) e o cinza
        "timeout" (id="timeout", abaixo). O executor só lê
        `cfg.receivedGotoStepId` e `cfg.timeoutGotoStepId`; qualquer
        edge sem sourceHandle seria silenciosamente ignorado. Antes
        tínhamos um terceiro handle laranja aqui "main flow" (sem id),
        que aparecia sobreposto ao verde e levava o operador a crer
        que existia um caminho "padrão" adicional — removido.
      */}

      {/* Stats */}
      {hasStats && (
        <TooltipHost label="Ver eventos" side="bottom">
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3.5 py-2 transition-colors hover:bg-slate-50/60"
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
    </div>
  );
}
