"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Variable } from "lucide-react";

import {
  CategoryHeader,
  NodeShell,
  StepBadge,
  TargetHandle,
  categoryTone,
} from "./node-kit";

export type VariableNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * VariableNode — set/update de variável do contexto. Categoria salesbot
 * (violet), saída linear única.
 */
export function VariableNode({ data, selected }: NodeProps<VariableNodeData>) {
  const tone = categoryTone.salesbot;

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[210px] max-w-[270px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Variable}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
        deleteLabel="Remover variável"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="size-3.5! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />
    </NodeShell>
  );
}
