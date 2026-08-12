"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconCornerDownRight as CornerDownRight } from "@tabler/icons-react";

import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type GotoNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type GotoRF = Node<GotoNodeData, "goto">;

export function GotoNode({ data, selected }: NodeProps<GotoRF>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="cyan"
      stepIndex={data.stepIndex}
      expanded={selected}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<CornerDownRight className="size-3.5" strokeWidth={2.4} aria-hidden />}
        title={data.label}
        subtitle={data.summary}
        actions={<FlowNodeDeleteButton onDelete={data.onDelete} />}
      />
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "goto"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
