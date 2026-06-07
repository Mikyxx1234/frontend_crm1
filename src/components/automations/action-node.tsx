"use client";

import type { ComponentType } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  Activity,
  ArrowRightLeft,
  BotMessageSquare,
  Image,
  Mail,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Tag,
  UserPlus,
  Webhook,
} from "lucide-react";

import {
  CategoryHeader,
  IncompleteBadge,
  MessageBubble,
  NodeShell,
  StatsBar,
  StepBadge,
  TargetHandle,
  isMessageStep,
  stepTone,
} from "./node-kit";

export type ActionNodeData = {
  stepType: string;
  label: string;
  summary: string;
  stepIndex?: number;
  /** Step sem config mínima pra executar — destaca em âmbar. */
  incomplete?: boolean;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

const iconMap: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  send_email: Mail,
  move_stage: ArrowRightLeft,
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

/**
 * ActionNode — passo de ação linear (1 saída). Header colorido por
 * categoria (DS v2); passos de mensagem exibem o conteúdo num balão
 * de chat no corpo. Caso contrário, o resumo fica no header.
 */
export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const tone = stepTone(data.stepType);
  const Icon = iconMap[data.stepType] ?? Activity;
  const asMessage = isMessageStep(data.stepType);

  return (
    <NodeShell
      tone={tone}
      selected={selected}
      incomplete={data.incomplete}
      className="min-w-[230px] max-w-[290px]"
    >
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}
      {data.incomplete && <IncompleteBadge />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon}
        title={data.label}
        summary={asMessage ? undefined : data.summary}
        onDelete={data.onDelete}
      />

      {asMessage && data.summary && <MessageBubble text={data.summary} tone={tone} />}

      {data.stats && <StatsBar stats={data.stats} onClick={data.onStatsClick} />}

      <Handle
        type="source"
        position={Position.Right}
        className="size-3.5! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />
    </NodeShell>
  );
}
