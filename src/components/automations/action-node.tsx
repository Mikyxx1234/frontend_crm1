"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Activity } from "lucide-react";

import {
  CategoryHeader,
  IncompleteBadge,
  MessageBubble,
  NodeShell,
  StatsBar,
  StepBadge,
  TargetHandle,
  isMessageStep,
  stepVisual,
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

/**
 * ActionNode — passo de ação linear (1 saída). Ícone e cor seguem o
 * tipo do passo (mesma identidade do seletor "O que deseja automatizar?"),
 * via `stepVisual` do node-kit. Passos de mensagem exibem o conteúdo num
 * balão de chat no corpo; caso contrário, o resumo fica no header.
 */
export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const { Icon, tone } = stepVisual(data.stepType);
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
        icon={Icon ?? Activity}
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
