"use client";

/*
 * StagePicker — wrapper para tornar as pills de estágio do header
 * do DealDetailPanel clicáveis. Chama POST /api/deals/:id/move via
 * useMoveDeal (que tem update otimista no board).
 */

import { useMoveDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

interface StagePickerProps {
  dealId: string | null;
  currentStageId: string | null;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  children: (handlers: {
    onSelectStage: (stageId: string) => void;
    isPending: boolean;
  }) => React.ReactNode;
}

export function StagePicker({
  dealId,
  currentStageId,
  pipelineId,
  statusFilter = "OPEN",
  children,
}: StagePickerProps) {
  const move = useMoveDeal(pipelineId, statusFilter);

  function onSelectStage(stageId: string) {
    if (!dealId || !currentStageId || stageId === currentStageId) return;
    move.mutate({
      dealId,
      fromStageId: currentStageId,
      toStageId: stageId,
    });
  }

  return <>{children({ onSelectStage, isPending: move.isPending })}</>;
}
