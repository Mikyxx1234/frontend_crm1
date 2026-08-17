"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconVariable as Variable } from "@tabler/icons-react";

import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type VariableNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type VariableRF = Node<VariableNodeData, "variable">;

export function VariableNode({ data, selected }: NodeProps<VariableRF>) {
  return (
    <FlowNodeShell
      selected={selected}
      type="fields"
      accent="violet"
      stepIndex={data.stepIndex}
      expanded={selected}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<Variable className="size-3.5" strokeWidth={2.4} aria-hidden />}
        title={data.label}
        subtitle={data.summary}
        actions={
          <FlowNodeDeleteButton onDelete={data.onDelete} label="Remover variável" />
        }
      />
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "set_variable"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
      <CustomHandle type="source" position={Position.Right} connectionLimit={1} />
    </FlowNodeShell>
  );
}
