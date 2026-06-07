"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Timer } from "lucide-react";

import {
  CategoryHeader,
  NodeShell,
  StepBadge,
  TargetHandle,
  categoryTone,
} from "./node-kit";

export type DelayNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * DelayNode — pausa controlada entre passos. Categoria lógica (orange,
 * família "tempo"), saída linear única.
 */
export function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  const tone = categoryTone.logic;

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[210px] max-w-[270px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Timer}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
        deleteLabel="Remover atraso"
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
