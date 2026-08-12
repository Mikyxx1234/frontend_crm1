"use client";

import type { ComponentType } from "react";
import { Position, type Node, type NodeProps } from "@xyflow/react";
import {
  IconActivity as Activity,
  IconAlertTriangle as AlertTriangle,
  IconArrowsLeftRight as ArrowRightLeft,
  IconRobotFace as BotMessageSquare,
  IconCircleCheck as CheckCircle2,
  IconCircleOff as CircleSlash,
  IconCircleX as CircleX,
  IconClock as Clock,
  IconPhoto as Image,
  IconMail as Mail,
  IconMessage as MessageSquare,
  IconClick as MousePointerClick,
  IconPencil as Pencil,
  IconTag as Tag,
  IconTrophy as Trophy,
  IconUserPlus as UserPlus,
  IconWebhook as Webhook,
} from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { NodeInlineConfig } from "./node-inline-config";
import {
  channelLabelFromOptions,
  StepChannelBadge,
  StepChannelKebabMenu,
  useConnectedStepChannels,
} from "./step-channel-picker";
import { isMessageChannelStep } from "@/lib/automation-workflow";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type ActionNodeData = {
  stepType: string;
  label: string;
  summary: string;
  stepIndex?: number;
  incomplete?: boolean;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
  isFirstMessageStep?: boolean;
};

type ActionRF = Node<ActionNodeData, "action">;

const iconMap: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  send_email: Mail,
  move_stage: ArrowRightLeft,
  mark_deal_won: Trophy,
  mark_deal_lost: CircleX,
  assign_owner: UserPlus,
  add_tag: Tag,
  remove_tag: Tag,
  update_field: Pencil,
  create_activity: Activity,
  send_whatsapp_message: MessageSquare,
  send_whatsapp_template: MessageSquare,
  send_whatsapp_media: Image,
  send_whatsapp_interactive: MousePointerClick,
  webhook: Webhook,
  update_lead_score: Activity,
  transfer_to_ai_agent: BotMessageSquare,
};

const META_LINEAR_FAILURE_TYPES = new Set([
  "send_whatsapp_message",
  "send_whatsapp_template",
  "send_whatsapp_media",
]);

const META_WAIT_TIMEOUT_TYPES = new Set([
  "send_whatsapp_message",
  "send_whatsapp_template",
]);

function StepIcon({ type }: { type: string }) {
  const Icon = iconMap[type] ?? Activity;
  return <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />;
}

export function ActionNode({ data, selected }: NodeProps<ActionRF>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);
  const hasFailureOutput = META_LINEAR_FAILURE_TYPES.has(data.stepType);
  const hasTimeoutOutput = META_WAIT_TIMEOUT_TYPES.has(data.stepType);
  const isChannelStep = isMessageChannelStep(data.stepType);
  const channelId =
    isChannelStep && data.config && typeof data.config.channelId === "string"
      ? (data.config.channelId as string)
      : "";
  const { options: channelOptions } = useConnectedStepChannels(data.stepType, {
    enabled: isChannelStep,
  });
  const channelBadgeLabel = channelLabelFromOptions(channelOptions, channelId);

  return (
    <FlowNodeShell
      selected={selected}
      incomplete={data.incomplete}
      accent="primary"
      stepIndex={data.stepIndex}
      expanded={selected}
      className={cn(
        (data.stepType === "add_tag" || data.stepType === "remove_tag") &&
          selected &&
          "z-20 overflow-visible",
        selected && data.stepType === "webhook" && "wf-node--wide"
      )}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<StepIcon type={data.stepType} />}
        title={data.label}
        subtitle={data.summary}
        badge={channelBadgeLabel ? <StepChannelBadge label={channelBadgeLabel} /> : undefined}
        actions={
          <>
            {isChannelStep && (
              <StepChannelKebabMenu
                stepType={data.stepType}
                channelId={channelId}
                isFirstMessageStep={!!data.isFirstMessageStep}
                onChange={(v) =>
                  data.onConfigChange?.({ ...(data.config ?? {}), channelId: v })
                }
              />
            )}
            <FlowNodeDeleteButton onDelete={data.onDelete} />
          </>
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
      {hasFailureOutput ? (
        <div className="wf-node__outs">
          <div className="wf-node__out wf-node__out--ok">
            <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.4} />
            <span className="flex-1 truncate">Enviado</span>
            <CustomHandle
              type="source"
              position={Position.Right}
              id="next"
              connectionLimit={1}
              className="wf-handle--ok"
            />
          </div>
          {hasTimeoutOutput && (
            <div className="wf-node__out">
              <Clock className="size-3.5 shrink-0" strokeWidth={2.4} />
              <span className="flex-1 truncate">Sem resposta</span>
              <CustomHandle
                type="source"
                position={Position.Right}
                id="timeout"
                connectionLimit={1}
                className="wf-handle--muted"
              />
            </div>
          )}
          <div className="wf-node__out wf-node__out--err">
            <CircleSlash className="size-3.5 shrink-0" strokeWidth={2.4} />
            <span className="flex-1 truncate">Falha ao enviar</span>
            <CustomHandle
              type="source"
              position={Position.Right}
              id="failure"
              connectionLimit={1}
              className="wf-handle--err"
            />
          </div>
        </div>
      ) : (
        <CustomHandle type="source" position={Position.Right} connectionLimit={1} />
      )}
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        isFirstMessageStep={data.isFirstMessageStep}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
