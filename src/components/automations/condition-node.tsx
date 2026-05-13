"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Filter, GitBranch, Trash2 } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import type { ConditionBranch } from "@/lib/automation-condition";
import { cn } from "@/lib/utils";

export type ConditionNodeData = {
  label: string;
  summary?: string;
  stepIndex?: number;
  branches: ConditionBranch[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

const OP_LABEL: Record<string, string> = {
  eq: "Igual a",
  ne: "Diferente de",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  includes: "Contém",
  starts_with: "Começa com",
  ends_with: "Termina com",
  empty: "Vazio",
  not_empty: "Preenchido",
};

function ruleSummary(branch: ConditionBranch): string {
  if (branch.rules.length === 0) return branch.label ?? "Condição";
  const first = branch.rules[0];
  const field = first.field || "—";
  const op = OP_LABEL[first.op] ?? first.op;
  const value =
    first.op === "empty" || first.op === "not_empty"
      ? ""
      : ` ${String(first.value ?? "").slice(0, 18)}`;
  const base = `${field} ${op}${value}`;
  if (branch.rules.length > 1) {
    return `${base} +${branch.rules.length - 1}`;
  }
  return base;
}

/**
 * ConditionNode — bifurcação multi-branch estilo Kommo. Substitui o
 * losango SIM/NÃO binário por um card retangular listando uma linha
 * por branch (+ "Nenhuma das condições" no fim). Cada linha expõe um
 * handle source próprio, permitindo o usuário ligar cada caminho a um
 * step diferente. Layout coerente com ActionNode (radius, sombra,
 * label com indice numerado).
 */
export function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const branches = data.branches ?? [];
  const hasBranches = branches.length > 0;

  return (
    <div className="group/node relative">
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-brand-navy to-[#1e3a8a] text-[10px] font-black tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-cyan-500!"
      />

      <div
        className={cn(
          "relative w-[300px] overflow-hidden rounded-2xl border bg-white transition-all duration-200",
          selected
            ? "border-cyan-400 shadow-cyan-glow ring-2 ring-cyan-300/30"
            : "border-cyan-200/80 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:border-cyan-300 hover:shadow-cyan-glow"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-cyan-100/70 bg-cyan-50/50 px-3 py-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-white text-cyan-500 ring-1 ring-cyan-100">
            <GitBranch className="size-3.5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-black tracking-tighter text-slate-900">
              {data.label}
            </p>
            <p className="truncate text-[10px] font-medium tracking-tight text-slate-500">
              {hasBranches
                ? `${branches.length} condição${branches.length > 1 ? "s" : ""}`
                : "Clique para configurar"}
            </p>
          </div>
          {data.onDelete && (
            <TooltipHost label="Remover condição" side="top">
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete?.();
                }}
                aria-label="Remover condição"
              >
                <Trash2 className="size-3.5" strokeWidth={2.2} />
              </button>
            </TooltipHost>
          )}
        </div>

        {/* Branches */}
        <ul className="flex flex-col">
          {branches.map((branch, idx) => (
            <li
              key={branch.id}
              className="relative flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-cyan-50/30"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-cyan-50 text-[10px] font-black tabular-nums text-cyan-600 ring-1 ring-cyan-100">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                {branch.label && (
                  <p className="truncate text-[11px] font-bold tracking-tight text-slate-800">
                    {branch.label}
                  </p>
                )}
                <p className="truncate text-[11px] font-medium tracking-tight text-slate-600">
                  <Filter className="mr-1 inline size-2.5 text-cyan-500" strokeWidth={2.4} />
                  Se {ruleSummary(branch)}
                </p>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`branch:${branch.id}`}
                className="size-2.5! border-2! border-white! bg-emerald-500!"
                style={{ top: "50%" }}
              />
            </li>
          ))}

          {/* Else / Nenhuma das condições */}
          <li className="relative flex items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-3 py-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-rose-50 text-[10px] font-black text-rose-600 ring-1 ring-rose-100">
              ⊘
            </span>
            <p className="flex-1 truncate text-[11px] font-medium italic tracking-tight text-slate-500">
              Nenhuma das condições
            </p>
            <Handle
              type="source"
              position={Position.Right}
              id="else"
              className="size-2.5! border-2! border-white! bg-rose-500!"
              style={{ top: "50%" }}
            />
          </li>
        </ul>
      </div>
    </div>
  );
}
