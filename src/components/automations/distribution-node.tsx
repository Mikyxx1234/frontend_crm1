"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { IconCircleCheck as CircleCheckBig, IconCircleOff as CircleSlash, IconRoute as Route, IconTrash as Trash2 } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DistributionNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * DistributionNode — card do passo `execute_distribution`.
 *
 * Funciona como um IF (estilo n8n) de duas saidas, baseado em "havia agente
 * disponivel para distribuir?". Cada saida tem sua propria linha + handle a
 * direita, igual ao InteractiveNode (evita o losango apertado com textos
 * sobrepostos):
 *   • "Distribuido" (handle "true",  verde) → distribuiu → fluxo linear (SIM).
 *   • "Sem agente"  (handle "false", vermelho) → ramo `elseStepId` (NAO).
 *
 * O handle "true" e declarado PRIMEIRO, entao a edge linear (nextStepId, sem
 * sourceHandle) se conecta nele automaticamente.
 */
export function DistributionNode({ data, selected }: NodeProps<DistributionNodeData>) {
  return (
    <div
      className={cn(
        "group/node relative min-w-[244px] max-w-[300px] rounded-lg border bg-white transition-all duration-200",
        selected
          ? "border-indigo-400/60 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.4)] ring-2 ring-indigo-300/30"
          : "border-[var(--glass-border-subtle)] shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-indigo-400/60 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)]"
      )}
    >
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[var(--brand-gradient-end)] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
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
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-bg)] text-[var(--brand-primary)] ring-1 ring-indigo-100">
          <Route className="size-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold tracking-tighter leading-tight text-[var(--text-primary)]">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight text-[var(--text-muted)]">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover passo" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover/node:opacity-100"
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

      {/* Saidas (IF Sim/Nao) — cada linha com handle proprio a direita */}
      <div className="border-t border-[var(--glass-border-subtle)] bg-linear-to-b from-slate-50/40 to-transparent">
        <div className="relative flex h-9 items-center gap-2 border-b border-[var(--glass-border-subtle)]/80 px-3.5">
          <CircleCheckBig className="size-3.5 shrink-0 text-emerald-500" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[11px] font-bold tracking-tight text-[var(--color-success-text)]">
            Distribuído
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="size-3! border-2! border-white! bg-[var(--color-success)]! shadow-green-glow!"
          />
        </div>
        <div className="relative flex h-9 items-center gap-2 px-3.5">
          <CircleSlash className="size-3.5 shrink-0 text-[var(--color-danger)]" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[11px] font-bold tracking-tight text-[var(--color-danger-text)]">
            Sem agente
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="size-3! border-2! border-white! bg-[var(--color-danger)]!"
          />
        </div>
      </div>
    </div>
  );
}
