"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import {
  CategoryHeader,
  MessageBubble,
  NodeShell,
  StatsBar,
  TargetHandle,
  stepVisual,
} from "./node-kit";

export type QuestionButton = { text: string; gotoStepId: string };

export type QuestionNodeData = {
  label: string;
  summary: string;
  buttons?: QuestionButton[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * QuestionNode — pergunta simples (sem rota por botão). Ícone/cor do
 * tipo `question` (igual ao seletor). Enunciado em balão de mensagem;
 * opções como pílulas decorativas. Roteamento único: "answered" (à
 * direita) vs "timeout" (abaixo). IDs de handle preservados.
 */
export function QuestionNode({ data, selected }: NodeProps<QuestionNodeData>) {
  const buttons = data.buttons ?? [];
  const { Icon, tone } = stepVisual("question");

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[230px] max-w-[290px]">
      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
        title={data.label}
        onDelete={data.onDelete}
        deleteLabel="Remover pergunta"
      />

      {data.summary && <MessageBubble text={data.summary} tone={tone} />}

      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3 py-2">
          {buttons.map((btn, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight"
              style={{ backgroundColor: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }}
            >
              {btn.text}
            </span>
          ))}
        </div>
      )}

      {data.stats && <StatsBar stats={data.stats} onClick={data.onStatsClick} />}

      <Handle
        type="source"
        position={Position.Right}
        id="answered"
        className="size-3! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        className="size-3! border-2! border-[color:var(--glass-bg-base)]! bg-[var(--color-warning)]!"
        style={{ left: "50%" }}
      />
    </NodeShell>
  );
}
