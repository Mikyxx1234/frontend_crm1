"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconClock as Timer } from "@tabler/icons-react";

import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type DelayNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type DelayRF = Node<DelayNodeData, "delay">;

export function DelayNode({ data, selected }: NodeProps<DelayRF>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="orange"
      stepIndex={data.stepIndex}
      expanded={selected}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<Timer className="size-3.5" strokeWidth={2.4} aria-hidden />}
        title={data.label}
        subtitle={data.summary}
        actions={<FlowNodeDeleteButton onDelete={data.onDelete} label="Remover atraso" />}
      />
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "delay"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
      <CustomHandle
        type="source"
        position={Position.Right}
        connectionLimit={1}
        className="wf-handle--orange"
      />
    </FlowNodeShell>
  );
}
