"use client";

import { type NodeProps } from "reactflow";
import { CircleCheckBig, CircleSlash } from "lucide-react";

import {
  CategoryHeader,
  NodeShell,
  OutcomeGroup,
  OutcomePill,
  StepBadge,
  TargetHandle,
  stepVisual,
} from "./node-kit";

export type DistributionNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * DistributionNode — passo `execute_distribution`, um IF de duas saídas
 * ("havia agente disponível?"). Pílula "Distribuído" (handle "true",
 * verde) declarada PRIMEIRO — a edge linear sem sourceHandle conecta
 * nela. "Sem agente" (handle "false", vermelho) é o ramo else.
 * IDs de handle preservados.
 */
export function DistributionNode({ data, selected }: NodeProps<DistributionNodeData>) {
  const { Icon, tone } = stepVisual("execute_distribution");

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[244px] max-w-[300px]">
      {data.stepIndex != null && <StepBadge index={data.stepIndex} />}

      <TargetHandle />

      <CategoryHeader
        tone={tone}
        icon={Icon!}
        title={data.label}
        summary={data.summary}
        onDelete={data.onDelete}
      />

      <OutcomeGroup>
        <OutcomePill
          handleId="true"
          label="Distribuído"
          icon={CircleCheckBig}
          color="#16a34a"
        />
        <OutcomePill
          handleId="false"
          label="Sem agente"
          icon={CircleSlash}
          color="#ef4444"
          last
        />
      </OutcomeGroup>
    </NodeShell>
  );
}
