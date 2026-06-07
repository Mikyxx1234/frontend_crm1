"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import {
  CategoryHeader,
  NodeShell,
  StepBadge,
  TargetHandle,
  stepVisual,
} from "./node-kit";

export type DelayNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * DelayNode — pausa controlada entre passos. Ícone/cor seguem o tipo
 * `delay` do seletor (relógio, laranja), saída linear única.
 */
export function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  const { Icon, tone } = stepVisual("delay");

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[210px] max-w-[270px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
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
