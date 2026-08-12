"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import {
  IconAlertTriangle as AlertTriangle,
  IconCircleCheck as CheckCircle2,
  IconHelpCircle as HelpCircle,
} from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type QuestionButton = { text: string; gotoStepId: string };

export type QuestionNodeData = {
  label: string;
  summary: string;
  buttons?: QuestionButton[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

type QuestionRF = Node<QuestionNodeData, "question">;

export function QuestionNode({ data, selected }: NodeProps<QuestionRF>) {
  const buttons = data.buttons ?? [];
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <FlowNodeShell selected={selected} accent="violet">
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<HelpCircle className="size-3.5" strokeWidth={2.4} />}
        title={data.label}
        subtitle={data.summary}
        actions={
          <FlowNodeDeleteButton onDelete={data.onDelete} label="Remover pergunta" />
        }
      />
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-[var(--wf-node-border)] px-3 py-2">
          {buttons.map((btn, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)] bg-[color-mix(in_srgb,var(--wf-accent)_12%,transparent)]"
            >
              {btn.text}
            </span>
          ))}
        </div>
      )}
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
      <CustomHandle
        type="source"
        position={Position.Right}
        id="answered"
        connectionLimit={1}
      />
      <CustomHandle
        type="source"
        position={Position.Bottom}
        id="timeout"
        connectionLimit={1}
        className="wf-handle--orange"
        style={{ left: "50%" }}
      />
    </FlowNodeShell>
  );
}
