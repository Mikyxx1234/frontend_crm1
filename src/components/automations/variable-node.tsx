"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import {
  CategoryHeader,
  InlineConfigSlot,
  type InlineEditData,
  NodeShell,
  StepBadge,
  TargetHandle,
  stepVisual,
} from "./node-kit";

export type VariableNodeData = InlineEditData & {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * VariableNode — set/update de variável do contexto. Ícone/cor do tipo
 * `set_variable` (igual ao seletor), saída linear única.
 */
export function VariableNode({ data, selected }: NodeProps<VariableNodeData>) {
  const { Icon, tone } = stepVisual("set_variable");

  return (
    <NodeShell
      tone={tone}
      selected={selected}
      className={data.expanded ? "w-[320px]" : "min-w-[210px] max-w-[270px]"}
    >
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
        deleteLabel="Remover variável"
      />

      <InlineConfigSlot data={data} />

      <Handle
        type="source"
        position={Position.Right}
        className="size-3.5! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />
    </NodeShell>
  );
}
