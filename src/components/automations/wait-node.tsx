"use client";

import { type NodeProps } from "reactflow";
import { Clock, MessageCircle } from "lucide-react";

import {
  CategoryHeader,
  NodeShell,
  OutcomeGroup,
  OutcomePill,
  StatsBar,
  StepBadge,
  TargetHandle,
  stepVisual,
} from "./node-kit";

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
};

/**
 * WaitNode — espera mensagem ou cronômetro. Duas saídas-pílula:
 * "received" (verde) e "timeout" (cinza), cada uma com handle dedicado.
 * Ícone/cor do tipo `wait_for_reply` (igual ao seletor). IDs de handle
 * preservados.
 */
export function WaitNode({ data, selected }: NodeProps<WaitNodeData>) {
  const { Icon, tone } = stepVisual("wait_for_reply");

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[250px] max-w-[310px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
        deleteLabel="Remover espera"
      />

      <OutcomeGroup>
        <OutcomePill
          handleId="received"
          label="Até a mensagem recebida"
          icon={MessageCircle}
          color="#16a34a"
        />
        <OutcomePill
          handleId="timeout"
          label={data.timeoutLabel || "Cronômetro"}
          icon={Clock}
          color="#94a3b8"
          muted
          last
        />
      </OutcomeGroup>

      {data.stats && <StatsBar stats={data.stats} onClick={data.onStatsClick} />}
    </NodeShell>
  );
}
