"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import {
  IconCircleCheck as CircleCheckBig,
  IconCircleOff as CircleSlash,
  IconRoute as Route,
} from "@tabler/icons-react";

import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type DistributionNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type DistributionRF = Node<DistributionNodeData, "distribution">;

export function DistributionNode({ data, selected }: NodeProps<DistributionRF>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="primary"
      stepIndex={data.stepIndex}
      expanded={selected}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<Route className="size-3.5" strokeWidth={2.4} />}
        title={data.label}
        subtitle={data.summary}
        actions={<FlowNodeDeleteButton onDelete={data.onDelete} />}
      />
      <div className="wf-node__outs">
        <div className="wf-node__out wf-node__out--ok">
          <CircleCheckBig className="size-3.5 shrink-0" strokeWidth={2.4} />
          <span className="flex-1 truncate">Distribuído</span>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="true"
            connectionLimit={1}
            className="wf-handle--ok"
          />
        </div>
        <div className="wf-node__out wf-node__out--err">
          <CircleSlash className="size-3.5 shrink-0" strokeWidth={2.4} />
          <span className="flex-1 truncate">Sem agente</span>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="false"
            connectionLimit={1}
            className="wf-handle--err"
          />
        </div>
      </div>
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "execute_distribution"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
