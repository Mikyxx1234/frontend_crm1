"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconPencil as Pencil, IconBolt as Zap } from "@tabler/icons-react";
import { IconAlertTriangle as AlertTriangle, IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { CustomHandle } from "./custom-handle";
import { FlowNodeHeader, FlowNodeShell } from "./flow-node-shell";

export type TriggerNodeData = {
  label: string;
  summary: string;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

type TriggerRF = Node<TriggerNodeData, "trigger">;

export function TriggerNode({ data, selected }: NodeProps<TriggerRF>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <FlowNodeShell selected={selected} accent="primary" className="cursor-pointer">
      <FlowNodeHeader
        icon={<Zap className="size-3.5" strokeWidth={2.6} aria-hidden />}
        eyebrow="Gatilho"
        title={data.label}
        subtitle={data.summary}
        actions={
          <span className="pointer-events-none inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)] opacity-0 transition-opacity group-hover/node:opacity-100">
            <Pencil className="size-3" strokeWidth={2.4} />
            Editar
          </span>
        }
      />
      {hasStats && (
        <TooltipHost label="Ver eventos" side="bottom">
          <button
            type="button"
            className="wf-node__stats"
            onClick={(e) => {
              e.stopPropagation();
              data.onStatsClick?.();
            }}
            aria-label="Ver eventos"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-success-text)]">
              <CheckCircle2 className="size-3" />
              {s.success}
            </span>
            {s.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-danger-text)]">
                <AlertTriangle className="size-3" />
                {s.failed}
              </span>
            )}
          </button>
        </TooltipHost>
      )}
      <CustomHandle type="source" position={Position.Right} connectionLimit={1} />
    </FlowNodeShell>
  );
}
