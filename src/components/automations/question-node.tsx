"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Trash2,
} from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type QuestionButton = { text: string; gotoStepId: string };

export type QuestionNodeData = {
  label: string;
  summary: string;
  buttons?: QuestionButton[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * QuestionNode — pergunta simples (sem rota por botão). Accent violet
 * (família "salesbot/conversacional"). Renderiza as opções como
 * pílulas dentro do card, mas o roteamento é único (handle "answered"
 * vs "timeout" no fundo).
 */
export function QuestionNode({ data, selected }: NodeProps<QuestionNodeData>) {
  const buttons = data.buttons ?? [];
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <div
      className={cn(
        "group/node relative min-w-[230px] max-w-[290px] rounded-2xl border bg-white transition-all duration-200",
        selected
          ? "border-violet-400/60 ring-2 ring-violet-300/30 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.4)]"
          : "border-slate-100 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-violet-300/50 hover:shadow-[0_10px_30px_-10px_rgba(139,92,246,0.3)]"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-slate-300!"
      />
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500 ring-1 ring-violet-100">
          <HelpCircle className="size-4" strokeWidth={2.4} />
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
          <TooltipHost label="Remover pergunta" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.();
              }}
              aria-label="Remover pergunta"
            >
              <Trash2 className="size-3.5" strokeWidth={2.2} />
            </button>
          </TooltipHost>
        )}
      </div>

      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-slate-100 bg-linear-to-b from-slate-50/40 to-transparent px-3 py-2">
          {buttons.map((btn, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-violet-700 ring-1 ring-violet-100"
            >
              {btn.text}
            </span>
          ))}
        </div>
      )}

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

      <Handle
        type="source"
        position={Position.Right}
        id="answered"
        className="size-3! border-2! border-white! bg-violet-500!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        className="size-3! border-2! border-white! bg-amber-500!"
        style={{ left: "50%" }}
      />
    </div>
  );
}
