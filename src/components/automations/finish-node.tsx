"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { StopCircle } from "lucide-react";

import { CategoryHeader, NodeShell, StepBadge, categoryTone } from "./node-kit";

export type FinishNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * FinishNode — terminal do fluxo. Header gradiente vermelho (categoria
 * "final"), sem handle de saída. Junto do TriggerNode, são os dois nós
 * com header em gradiente — um marca início, outro marca fim.
 */
export function FinishNode({ data, selected }: NodeProps<FinishNodeData>) {
  const tone = categoryTone.final;

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[200px] max-w-[260px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ left: -6, top: "50%" }}
        className="size-3! border-2! border-[color:var(--glass-bg-base)]! bg-[color:var(--text-muted)]!"
      />

      <CategoryHeader
        tone={tone}
        icon={StopCircle}
        eyebrow="Final"
        title={data.label}
        summary={data.summary}
        variant="gradient"
        onDelete={data.onDelete}
      />
    </NodeShell>
  );
}
