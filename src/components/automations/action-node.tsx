"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Activity } from "lucide-react";

import type { AutomationStep } from "@/lib/automation-workflow";

import {
  CategoryHeader,
  ErrorOutcome,
  IncompleteBadge,
  InlineConfigSlot,
  type InlineEditData,
  MessageBubble,
  NodeShell,
  StatsBar,
  StepBadge,
  TargetHandle,
  isMessageStep,
  messagePrimaryField,
  stepVisual,
} from "./node-kit";

export type ActionNodeData = InlineEditData & {
  stepType: string;
  label: string;
  summary: string;
  stepIndex?: number;
  /** Step sem config mínima pra executar — destaca em âmbar. */
  incomplete?: boolean;
  /** Passo falível → renderiza a saída de fallback ("passo B"). */
  hasErrorBranch?: boolean;
  /** Label da pílula de erro (ex.: "Falha ao enviar a mensagem"). */
  errorLabel?: string;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * ActionNode — passo de ação linear (1 saída). Ícone e cor seguem o
 * tipo do passo (mesma identidade do seletor "O que deseja automatizar?"),
 * via `stepVisual` do node-kit. Passos de mensagem exibem o conteúdo num
 * balão de chat no corpo; caso contrário, o resumo fica no header.
 * Quando `expanded`, embute o formulário de configuração inline.
 */
export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const { Icon, tone } = stepVisual(data.stepType);
  const asMessage = isMessageStep(data.stepType);
  // Campo do config que guarda o texto da bolha (null = bolha read-only).
  const msgField = asMessage ? messagePrimaryField(data.stepType) : null;
  const bubbleEditable = !!(msgField && data.step && data.onComplete);
  // Editável → mostra o texto cru do config (round-trip correto). Caso
  // contrário, usa o resumo formatado já calculado pelo canvas.
  const rawMsg =
    msgField && data.step
      ? String((data.step.config as Record<string, unknown>)?.[msgField] ?? "")
      : "";
  const bubbleText = bubbleEditable ? rawMsg : data.summary;

  // Autosave da bolha: grava o texto no campo primário e reaproveita o
  // pipeline de normalização/persistência do StepConfigForm (onComplete).
  const commitMessage = (next: string) => {
    if (!msgField || !data.step || !data.onComplete) return;
    const cfg = { ...(data.step.config as Record<string, unknown>), [msgField]: next };
    data.onComplete({ ...data.step, config: cfg } as AutomationStep);
  };

  return (
    <NodeShell
      tone={tone}
      selected={selected}
      incomplete={data.incomplete}
      className={data.expanded ? "w-[320px]" : "min-w-[230px] max-w-[290px]"}
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

      {asMessage && (bubbleText || bubbleEditable) && (
        <MessageBubble
          text={bubbleText}
          tone={tone}
          editable={bubbleEditable}
          onCommit={commitMessage}
        />
      )}

      {data.stats && <StatsBar stats={data.stats} onClick={data.onStatsClick} />}

      <InlineConfigSlot data={data} />

      {data.hasErrorBranch && (
        <ErrorOutcome label={data.errorLabel ?? "Em caso de falha"} />
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="size-3.5! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: tone.fg }}
      />
    </NodeShell>
  );
}
