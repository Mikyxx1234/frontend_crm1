"use client";

import { type NodeProps } from "reactflow";

import {
  CategoryHeader,
  NodeShell,
  StepBadge,
  TargetHandle,
  stepVisual,
} from "./node-kit";

export type GotoNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * GotoNode — salto pra outro passo (terminal: sem handle de saída
 * visível, o "goto" já carrega o destino). Ícone/cor do tipo `goto`
 * (igual ao seletor).
 */
export function GotoNode({ data, selected }: NodeProps<GotoNodeData>) {
  const { Icon, tone } = stepVisual("goto");

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[210px] max-w-[270px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
      />
    </NodeShell>
  );
}
