"use client";

import { useMemo } from "react";
import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconFilter as Filter, IconGitBranch as GitBranch } from "@tabler/icons-react";

import type { ConditionBranch } from "@/lib/automation-condition";
import { useDepartmentOptions } from "./editor-data";
import { CONDITION_FIELDS } from "./editor-fields";
import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type ConditionNodeData = {
  label: string;
  summary?: string;
  stepIndex?: number;
  branches: ConditionBranch[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type ConditionRF = Node<ConditionNodeData, "condition">;

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

const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  CONDITION_FIELDS.map((f) => [f.value, f.label])
);

function ruleSummary(
  branch: ConditionBranch,
  resolveValue: (field: string, value: unknown) => string
): string {
  if (branch.rules.length === 0) return branch.label ?? "Condição";
  const first = branch.rules[0];
  const field = FIELD_LABEL[first.field] ?? first.field ?? "—";
  const op = OP_LABEL[first.op] ?? first.op;
  const value =
    first.op === "empty" || first.op === "not_empty"
      ? ""
      : ` ${resolveValue(first.field, first.value).slice(0, 24)}`;
  const base = `${field} ${op}${value}`;
  if (branch.rules.length > 1) {
    return `${base} +${branch.rules.length - 1}`;
  }
  return base;
}

export function ConditionNode({ data, selected }: NodeProps<ConditionRF>) {
  const branches = data.branches ?? [];
  const hasBranches = branches.length > 0;

  const { options: departmentOptions } = useDepartmentOptions();
  const resolveValue = useMemo(() => {
    const byId = new Map(departmentOptions.map((o) => [o.value, o.label]));
    return (field: string, value: unknown) => {
      const raw = String(value ?? "");
      if (field === "conversation.departmentId") return byId.get(raw) ?? raw;
      return raw;
    };
  }, [departmentOptions]);

  return (
    <FlowNodeShell
      selected={selected}
      accent="cyan"
      stepIndex={data.stepIndex}
      expanded={selected}
      className={selected ? "max-w-[380px] min-w-[320px]" : "max-w-[300px] min-w-[260px]"}
    >
      <CustomHandle
        type="target"
        position={Position.Left}
        connectionLimit={1}
        className="wf-handle--cyan"
      />
      <FlowNodeHeader
        icon={<GitBranch className="size-3.5" strokeWidth={2.4} />}
        title={data.label}
        subtitle={
          hasBranches
            ? `${branches.length} ${branches.length > 1 ? "condições" : "condição"}`
            : "Clique para configurar"
        }
        actions={
          <FlowNodeDeleteButton onDelete={data.onDelete} label="Remover condição" />
        }
      />
      <div className="wf-node__outs">
        {branches.map((branch, idx) => (
          <div key={branch.id} className="wf-node__out" style={{ height: "auto", minHeight: 36, paddingBlock: 6 }}>
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[color-mix(in_srgb,var(--color-cyan)_12%,transparent)] text-[10px] font-bold tabular-nums text-[var(--color-cyan)]">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              {branch.label && (
                <p className="truncate text-[11px] font-bold text-[var(--text-primary)]">
                  {branch.label}
                </p>
              )}
              <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">
                <Filter className="mr-1 inline size-2.5 text-[var(--color-cyan)]" strokeWidth={2.4} />
                Se {ruleSummary(branch, resolveValue)}
              </p>
            </div>
            <CustomHandle
              type="source"
              position={Position.Right}
              id={`branch:${branch.id}`}
              connectionLimit={1}
              className="wf-handle--ok"
            />
          </div>
        ))}
        <div className="wf-node__out wf-node__out--err">
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[var(--color-danger-bg)] text-[10px] font-bold text-[var(--color-danger-text)]">
            ⊘
          </span>
          <p className="flex-1 truncate italic">Nenhuma das condições</p>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="else"
            connectionLimit={1}
            className="wf-handle--err"
          />
        </div>
      </div>
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "condition"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
