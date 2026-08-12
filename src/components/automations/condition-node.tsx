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
  FlowNodeStats,
} from "./flow-node-shell";
import { cn } from "@/lib/utils";

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
  if (branch.rules.length === 0) return "Sem regras — clique para configurar";
  const first = branch.rules[0];
  const field = FIELD_LABEL[first.field] ?? first.field ?? "—";
  const op = OP_LABEL[first.op] ?? first.op;
  const value =
    first.op === "empty" || first.op === "not_empty"
      ? ""
      : ` ${resolveValue(first.field, first.value)}`;
  const base = `${field} ${op}${value}`;
  if (branch.rules.length > 1) {
    return `${base} (+${branch.rules.length - 1})`;
  }
  return base;
}

export function ConditionNode({ data, selected }: NodeProps<ConditionRF>) {
  const branches = data.branches ?? [];
  const hasBranches = branches.length > 0;
  const s = data.stats;

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
      type="condition"
      accent="cyan"
      stepIndex={data.stepIndex}
      expanded={selected}
      className={cn("wf-node--condition", selected && "wf-node--lg")}
    >
      <CustomHandle
        type="target"
        position={Position.Left}
        connectionLimit={1}
        className="fx-port--flow"
      />
      <FlowNodeHeader
        icon={<GitBranch className="size-3.5" strokeWidth={2.4} />}
        title={data.label || "Condição"}
        subtitle={
          selected
            ? hasBranches
              ? `Faça filtros para seguir caminhos diferentes`
              : "Clique para adicionar uma condição"
            : hasBranches
              ? `${branches.length} ${branches.length > 1 ? "ramos" : "ramo"}`
              : "Faça filtros para seguir caminhos diferentes"
        }
        actions={
          <FlowNodeDeleteButton onDelete={data.onDelete} label="Remover condição" />
        }
      />
      <div
        className={cn(
          "wf-node__outs wf-node__outs--branches",
          selected && "wf-node__outs--editing"
        )}
      >
        {branches.map((branch, idx) => {
          const title =
            (branch.label && branch.label.trim()) || `Ramo ${idx + 1}`;
          const desc = ruleSummary(branch, resolveValue);
          return (
            <div key={branch.id}>
              <div
                className={cn(
                  "wf-cond-card fx-item",
                  selected && "wf-cond-card--handle"
                )}
              >
                <span className="wf-branch-num">{idx + 1}</span>
                <div className="wf-cond-card__text fx-item__text">
                  <p className="wf-cond-card__title fx-item__title">{title}</p>
                  {!selected && (
                    <p className="wf-cond-card__desc fx-item__sub">
                      <Filter className="inline size-2.5 opacity-60" strokeWidth={2.2} />{" "}
                      {desc}
                    </p>
                  )}
                </div>
              </div>
              <div className="fx-item-out">
                <span>Se esta condição for verdadeira</span>
                <CustomHandle
                  type="source"
                  position={Position.Right}
                  id={`branch:${branch.id}`}
                  connectionLimit={1}
                  className="fx-port--cond"
                />
              </div>
            </div>
          );
        })}
        <div
          className={cn(
            "wf-cond-card wf-cond-card--else fx-out fx-out--error",
            selected && "wf-cond-card--handle"
          )}
        >
          <span className="wf-branch-num wf-branch-num--err">⊘</span>
          <div className="wf-cond-card__text">
            <p className="wf-cond-card__title">
              {selected ? "Senão" : "Quando não atender a nenhuma condição"}
            </p>
            {!selected && (
              <p className="wf-cond-card__desc">Caminho alternativo do fluxo</p>
            )}
          </div>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="else"
            connectionLimit={1}
            className="fx-port--error"
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
      {s && (
        <FlowNodeStats
          success={s.success}
          warning={s.skipped}
          error={s.failed}
          onClick={data.onStatsClick}
        />
      )}
    </FlowNodeShell>
  );
}
