"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import {
  IconAlertTriangle as AlertTriangle,
  IconCircleCheck as CheckCircle2,
  IconClock as Clock,
  IconMessageCircle as MessageCircle,
  IconPlayerPause as Pause,
} from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { NodeInlineConfig } from "./node-inline-config";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type WaitNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  hasReceivedGoto: boolean;
  hasTimeoutGoto: boolean;
  timeoutLabel: string;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type WaitRF = Node<WaitNodeData, "wait">;

export function WaitNode({ data, selected }: NodeProps<WaitRF>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <FlowNodeShell
      selected={selected}
      accent="orange"
      stepIndex={data.stepIndex}
      expanded={selected}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<Pause className="size-3.5" strokeWidth={2.4} />}
        title={data.label}
        subtitle={data.summary}
        actions={<FlowNodeDeleteButton onDelete={data.onDelete} label="Remover espera" />}
      />
      <div className="wf-node__outs">
        <div className="wf-node__out wf-node__out--ok">
          <MessageCircle className="size-3 shrink-0" strokeWidth={2.4} />
          <span className="flex-1 truncate">Até a mensagem recebida</span>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="received"
            connectionLimit={1}
            className="wf-handle--ok"
          />
        </div>
        <div className="wf-node__out">
          <Clock className="size-3 shrink-0" strokeWidth={2.4} />
          <span className="flex-1 truncate">{data.timeoutLabel || "Cronômetro"}</span>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="timeout"
            connectionLimit={1}
            className="wf-handle--muted"
          />
        </div>
      </div>
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
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "wait_for_reply"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
