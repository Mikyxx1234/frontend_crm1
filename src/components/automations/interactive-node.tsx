"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import {
  IconAlertTriangle as AlertTriangle,
  IconArrowRight as ArrowRight,
  IconCircleCheck as CheckCircle2,
  IconCircleOff as CircleSlash,
  IconClock as Clock,
  IconHelpCircle as HelpCircle,
  IconListDetails as ListDetails,
  IconMessageQuestion as MessageCircleQuestion,
  IconClick as MousePointerClick,
} from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { isMessageChannelStep } from "@/lib/automation-workflow";
import { NodeInlineConfig } from "./node-inline-config";
import {
  channelLabelFromOptions,
  StepChannelBadge,
  StepChannelKebabMenu,
  useConnectedStepChannels,
} from "./step-channel-picker";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type InteractiveButton = {
  text?: string;
  title?: string;
  id?: string;
  gotoStepId?: string;
};

export type InteractiveNodeData = {
  stepType: string;
  label: string;
  summary: string;
  stepIndex?: number;
  incomplete?: boolean;
  buttons: InteractiveButton[];
  hasElse: boolean;
  hasTimeout: boolean;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
  isFirstMessageStep?: boolean;
};

type InteractiveRF = Node<InteractiveNodeData, "interactive">;

function buttonLabel(btn: InteractiveButton, idx: number): string {
  return btn.title || btn.text || `Opção ${idx + 1}`;
}

export function InteractiveNode({ data, selected }: NodeProps<InteractiveRF>) {
  const buttons = data.buttons ?? [];
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);
  const isQuestion = data.stepType === "question";
  const isList = data.stepType === "send_whatsapp_list";
  const Icon = isQuestion
    ? MessageCircleQuestion
    : isList
      ? ListDetails
      : MousePointerClick;
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
      accent="violet"
      stepIndex={data.stepIndex}
      expanded={selected}
      className={selected ? "max-w-[420px] min-w-[360px]" : undefined}
    >
      <CustomHandle type="target" position={Position.Left} connectionLimit={1} />
      <FlowNodeHeader
        icon={<Icon className="size-3.5" strokeWidth={2.4} />}
        title={data.label}
        subtitle={data.summary}
        badge={
          channelBadgeLabel ? <StepChannelBadge label={channelBadgeLabel} /> : undefined
        }
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

      <div className="wf-node__outs">
        {buttons.map((btn, i) => (
          <div key={btn.id || i} className="wf-node__out">
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--wf-accent)]" />
            <span className="flex-1 truncate text-[var(--text-primary)]">
              {buttonLabel(btn, i)}
            </span>
            <CustomHandle
              type="source"
              position={Position.Right}
              id={`btn_${i}`}
              connectionLimit={1}
            />
          </div>
        ))}
        <div className="wf-node__out">
          <ArrowRight className="size-3 shrink-0 text-[var(--wf-accent)]" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[var(--wf-accent)]">Continuar (todas)</span>
          <CustomHandle
            type="source"
            position={Position.Right}
            id="next"
            connectionLimit={1}
          />
        </div>
        {data.hasElse && (
          <div className="wf-node__out">
            <HelpCircle className="size-3 shrink-0 text-[var(--color-warning)]" strokeWidth={2.4} />
            <span className="flex-1 truncate">Outra resposta</span>
            <CustomHandle
              type="source"
              position={Position.Right}
              id="else"
              connectionLimit={1}
              className="wf-handle--orange"
            />
          </div>
        )}
        {data.hasTimeout && (
          <div className="wf-node__out">
            <Clock className="size-3 shrink-0" strokeWidth={2.4} />
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
          <CircleSlash className="size-3 shrink-0" strokeWidth={2.4} />
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
        stepType={data.stepType}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        isFirstMessageStep={data.isFirstMessageStep}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </FlowNodeShell>
  );
}
