"use client";

import { type NodeProps } from "reactflow";
import { CornerDownRight } from "lucide-react";

import {
  CategoryHeader,
  NodeShell,
  StepBadge,
  TargetHandle,
  categoryTone,
} from "./node-kit";

export type GotoNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * GotoNode — salto pra outro passo (terminal: sem handle de saída
 * visível, o "goto" já carrega o destino). Categoria salesbot (violet).
 */
export function GotoNode({ data, selected }: NodeProps<GotoNodeData>) {
  const tone = categoryTone.salesbot;

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[210px] max-w-[270px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={CornerDownRight}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
      />
    </NodeShell>
  );
}
