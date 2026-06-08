"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Ban, Filter } from "lucide-react";

import type { ConditionBranch } from "@/lib/automation-condition";

import {
  CategoryHeader,
  NodeShell,
  OutcomeGroup,
  StepBadge,
  stepVisual,
} from "./node-kit";

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
 * ConditionNode — bifurcação multi-branch. Uma pílula por branch
 * (+ "Nenhuma das condições" no fim), cada uma com handle source
 * dedicado (`branch:<id>` / `else`). Ícone/cor do tipo `condition`
 * (ramo, cyan) — igual ao seletor.
 * IDs de handle preservados — buildEdges depende deles.
 */
export function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const branches = data.branches ?? [];
  const hasBranches = branches.length > 0;
  const { Icon, tone } = stepVisual("condition");

  return (
    <NodeShell tone={tone} selected={selected} className="w-[300px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
        title={data.label}
        summary={
          hasBranches
            ? `${branches.length} condição${branches.length > 1 ? "s" : ""}`
            : "Clique para configurar"
        }
        onDelete={data.onDelete}
        deleteLabel="Remover condição"
      />

      <OutcomeGroup>
        {branches.map((branch, idx) => (
          <div
            key={branch.id}
            className="relative flex items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-2"
          >
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold tabular-nums"
              style={{ backgroundColor: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              {branch.label && (
                <p className="truncate text-[11px] font-bold tracking-tight text-[var(--text-primary)]">
                  {branch.label}
                </p>
              )}
              <p className="truncate text-[11px] font-medium tracking-tight text-[var(--text-secondary)]">
                <Filter className="mr-1 inline size-2.5" strokeWidth={2.4} style={{ color: tone.fg }} />
                Se {ruleSummary(branch)}
              </p>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={`branch:${branch.id}`}
              className="size-2.5! border-2! border-[color:var(--glass-bg-base)]! bg-[var(--color-success)]!"
              style={{ top: "50%" }}
            />
          </div>
        ))}

        {/* Else / Nenhuma das condições */}
        <div className="relative flex items-center gap-2 px-3 py-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
            <Ban className="size-3" strokeWidth={2.4} />
          </span>
          <p className="flex-1 truncate text-[11px] font-medium italic tracking-tight text-[var(--text-muted)]">
            Nenhuma das condições
          </p>
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            className="size-2.5! border-2! border-[color:var(--glass-bg-base)]! bg-[var(--color-danger)]!"
            style={{ top: "50%" }}
          />
        </div>
      </OutcomeGroup>
    </NodeShell>
  );
}
