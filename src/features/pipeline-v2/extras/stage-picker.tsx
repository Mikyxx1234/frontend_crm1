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
  /**
   * Interceptador opcional do move — usado pelo Kanban v2 para abrir a
   * tabulação de motivo da perda antes de mover para o estágio Perdido.
   * Quando presente, substitui a mutação interna (o caller decide quando
   * efetivamente mover). `toPipelineId` acompanha para casos cross-funil.
   */
  onRequestMove?: (vars: {
    dealId: string;
    fromStageId: string;
    toStageId: string;
    toPipelineId?: string | null;
  }) => void;
  children: (handlers: {
    /**
     * Seleciona um estágio de destino. `pipelineId` opcional identifica
     * o funil destino quando diferente do atual — usado para invalidação
     * cruzada de cache e roteamento de motivo de perda.
     */
    onSelectStage: (stageId: string, toPipelineId?: string | null) => void;
    isPending: boolean;
  }) => React.ReactNode;
}

export function StagePicker({
  dealId,
  currentStageId,
  pipelineId,
  statusFilter = "OPEN",
  onRequestMove,
  children,
}: StagePickerProps) {
  const move = useMoveDeal(pipelineId, statusFilter);

  function onSelectStage(stageId: string, toPipelineId?: string | null) {
    if (!dealId || !currentStageId || stageId === currentStageId) return;
    const vars = {
      dealId,
      fromStageId: currentStageId,
      toStageId: stageId,
      toPipelineId: toPipelineId ?? null,
    };
    if (onRequestMove) {
      onRequestMove(vars);
      return;
    }
    move.mutate(vars);
  }

  return <>{children({ onSelectStage, isPending: move.isPending })}</>;
}
