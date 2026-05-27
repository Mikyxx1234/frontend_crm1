"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { moveDeal, type BoardDealDto, type BoardStageDto, type StatusFilter } from "../api";
import { boardKey } from "./use-board";

interface MoveVars {
  dealId: string;
  fromStageId: string;
  toStageId: string;
  toIndex?: number;
}

/**
 * Move um deal entre estágios — com update otimista do cache do
 * board ativo. Em erro, reverte ao snapshot anterior.
 */
export function useMoveDeal(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const key = boardKey(pipelineId, status);

  return useMutation<{ deal: BoardDealDto }, Error, MoveVars, { prev?: BoardStageDto[] }>({
    mutationFn: (vars) =>
      moveDeal(vars.dealId, { stageId: vars.toStageId, position: vars.toIndex }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardStageDto[]>(key);
      if (!prev) return { prev };
      const next = prev.map((s) => ({ ...s, deals: [...s.deals] }));
      const fromIdx = next.findIndex((s) => s.id === vars.fromStageId);
      const toIdx = next.findIndex((s) => s.id === vars.toStageId);
      if (fromIdx === -1 || toIdx === -1) return { prev };
      const dealIdx = next[fromIdx].deals.findIndex((d) => d.id === vars.dealId);
      if (dealIdx === -1) return { prev };
      const [moved] = next[fromIdx].deals.splice(dealIdx, 1);
      const insertAt = vars.toIndex ?? next[toIdx].deals.length;
      next[toIdx].deals.splice(Math.min(insertAt, next[toIdx].deals.length), 0, moved);
      next[fromIdx].totalCount = (next[fromIdx].totalCount ?? next[fromIdx].deals.length + 1) - 1;
      next[toIdx].totalCount = (next[toIdx].totalCount ?? next[toIdx].deals.length - 1) + 1;
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(err.message || "Falha ao mover deal");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
