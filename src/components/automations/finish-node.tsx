"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconPlayerStop as StopCircle } from "@tabler/icons-react";

import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type FinishNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type FinishRF = Node<FinishNodeData, "finish">;

export function FinishNode({ data, selected }: NodeProps<FinishRF>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="rose"
      stepIndex={data.stepIndex}
      expanded={selected}
    >
      <CustomHandle
        type="target"
        position={Position.Left}
        id="input"
        connectionLimit={1}
        className="wf-handle--muted"
      />
      <FlowNodeHeader
        icon={<StopCircle className="size-3.5" strokeWidth={2.4} aria-hidden />}
        eyebrow="Final"
        title={data.label}
        subtitle={data.summary}
        actions={<FlowNodeDeleteButton onDelete={data.onDelete} />}
      />
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "finish"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
