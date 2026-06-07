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

export type BusinessHoursNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  onDelete?: () => void;
};

/**
 * BusinessHoursNode — IF binário "dentro vs fora do expediente".
 * Usa o mesmo card padrão dos demais nós (tom lógico), com duas
 * pílulas de saída: "Dentro" (handle "true", verde) declarada PRIMEIRO
 * para a edge linear, e "Fora" (handle "false", vermelho) como else.
 * IDs de handle "true"/"false" preservados.
 */
export function BusinessHoursNode({ data, selected }: NodeProps<BusinessHoursNodeData>) {
  const { Icon, tone } = stepVisual("business_hours");

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
          label="Dentro do expediente"
          icon={CircleCheckBig}
          color="#16a34a"
        />
        <OutcomePill
          handleId="false"
          label="Fora do expediente"
          icon={CircleSlash}
          color="#ef4444"
          last
        />
      </OutcomeGroup>
    </NodeShell>
  );
}
