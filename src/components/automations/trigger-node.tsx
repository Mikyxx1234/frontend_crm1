"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconPencil as Pencil, IconBolt as Zap } from "@tabler/icons-react";

import { CustomHandle } from "./custom-handle";
import { FlowNodeHeader, FlowNodeShell, FlowNodeStats } from "./flow-node-shell";

export type TriggerNodeData = {
  label: string;
  summary: string;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

type TriggerRF = Node<TriggerNodeData, "trigger">;

export function TriggerNode({ data, selected }: NodeProps<TriggerRF>) {
  const s = data.stats;

  return (
    <FlowNodeShell
      selected={selected}
      type="trigger"
      accent="primary"
      className="cursor-pointer"
    >
      <FlowNodeHeader
        icon={<Zap className="size-3.5" strokeWidth={2.6} aria-hidden />}
        title={data.label}
        subtitle={data.summary}
        actions={
          <span className="pointer-events-none inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fx-type)] opacity-0 transition-opacity group-hover/node:opacity-100">
            <Pencil className="size-3" strokeWidth={2.4} />
            Editar
          </span>
        }
      />
      {s && (
        <FlowNodeStats
          success={s.success}
          warning={s.skipped}
          error={s.failed}
          onClick={data.onStatsClick}
        />
      )}
      <CustomHandle
        type="source"
        position={Position.Right}
        connectionLimit={1}
        className="fx-port--flow"
      />
    </FlowNodeShell>
  );
}
