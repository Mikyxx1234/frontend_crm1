"use client";

import { type NodeProps } from "reactflow";
import { Clock, HelpCircle, MessageCircleQuestion, MousePointerClick } from "lucide-react";

import {
  CategoryHeader,
  IncompleteBadge,
  MessageBubble,
  NodeShell,
  OutcomeGroup,
  OutcomePill,
  StatsBar,
  StepBadge,
  TargetHandle,
  stepTone,
} from "./node-kit";

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
  /** Step sem body ou sem botões — sinaliza em âmbar. */
  incomplete?: boolean;
  buttons: InteractiveButton[];
  hasElse: boolean;
  hasTimeout: boolean;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

function buttonLabel(btn: InteractiveButton, idx: number): string {
  return btn.title || btn.text || `Opção ${idx + 1}`;
}

/**
 * InteractiveNode — pergunta com botões, cada um com destino próprio
 * (`btn_0`, `btn_1`, ...) + opcional `else` + `timeout`. Cada saída é
 * uma pílula com handle dedicado à direita (DS v2). O enunciado aparece
 * como balão de mensagem no corpo.
 *
 * IDs de handle preservados (`btn_N`, `else`, `timeout`) — buildEdges
 * depende deles.
 */
export function InteractiveNode({ data, selected }: NodeProps<InteractiveNodeData>) {
  const buttons = data.buttons ?? [];
  const tone = stepTone(data.stepType);
  const isQuestion = data.stepType === "question";
  const Icon = isQuestion ? MessageCircleQuestion : MousePointerClick;

  return (
    <NodeShell
      tone={tone}
      selected={selected}
      incomplete={data.incomplete}
      className="min-w-[260px] max-w-[320px]"
    >
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}
      {data.incomplete && <IncompleteBadge />}

      <TargetHandle />

      <CategoryHeader tone={tone} icon={Icon} title={data.label} onDelete={data.onDelete} />

      {data.summary && <MessageBubble text={data.summary} tone={tone} />}

      {(buttons.length > 0 || data.hasElse || data.hasTimeout) && (
        <OutcomeGroup>
          {buttons.map((btn, i) => (
            <OutcomePill
              key={btn.id || i}
              handleId={`btn_${i}`}
              label={buttonLabel(btn, i)}
              color={tone.fg}
            />
          ))}
          {data.hasElse && (
            <OutcomePill
              handleId="else"
              label="Outra resposta"
              icon={HelpCircle}
              color="#d97706"
            />
          )}
          {data.hasTimeout && (
            <OutcomePill
              handleId="timeout"
              label="Sem resposta"
              icon={Clock}
              color="#94a3b8"
              muted
              last
            />
          )}
        </OutcomeGroup>
      )}

      {data.stats && <StatsBar stats={data.stats} onClick={data.onStatsClick} />}
    </NodeShell>
  );
}
