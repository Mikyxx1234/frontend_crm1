"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addDealTag,
  createDeal,
  deleteDeal,
  getDealTimeline,
  listTags,
  listTeamUsers,
  moveDeal,
  removeDealTag,
  setDealStatus,
  updateDeal,
  type BoardDealDto,
  type BoardStageDto,
  type CreateDealPayload,
  type DealStatus,
  type DealTag,
  type DealTimelineEvent,
  type StatusFilter,
  type TeamUser,
  type UpdateDealPayload,
} from "../api";
import { boardKey } from "./use-board";
import { dealDetailKey } from "./use-deal-detail";

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
    mutationFn: (vars) => {
      // Backend exige `position` (inteiro >= 0). Quando o caller nao
      // sabe a posicao (ex.: StagePicker do detail panel), calculamos
      // o "fim da coluna destino" a partir do cache atual.
      let pos = vars.toIndex;
      if (pos == null) {
        const board = qc.getQueryData<BoardStageDto[]>(key);
        const target = board?.find((s) => s.id === vars.toStageId);
        // Se a posicao for igual a `length`, o deal vai pro fim. Se a
        // coluna destino contiver o proprio deal (drag dentro da
        // mesma coluna), o length ja conta com ele — usa length-1.
        const hasSelf = target?.deals.some((d) => d.id === vars.dealId);
        pos = Math.max(
          0,
          (target?.deals.length ?? 0) - (hasSelf ? 1 : 0),
        );
      }
      return moveDeal(vars.dealId, { stageId: vars.toStageId, position: pos });
    },
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

// ─────────────────────────────────────────────────────────────────
// updateDeal — usado pelo AssigneePopover (ownerId), inline-edit de
// Origem/Previsão/Notas e qualquer outro campo escalar do deal.
// ─────────────────────────────────────────────────────────────────

interface UpdateDealVars {
  dealId: string;
  payload: UpdateDealPayload;
}

export function useUpdateDeal(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const key = boardKey(pipelineId, status);

  return useMutation<{ deal: BoardDealDto }, Error, UpdateDealVars>({
    mutationFn: ({ dealId, payload }) => updateDeal(dealId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: dealDetailKey(vars.dealId) });
    },
    onError: (err) => toast.error(err.message || "Falha ao atualizar negocio"),
  });
}

// ─────────────────────────────────────────────────────────────────
// status do deal — botões Ganhar / Perder / Reabrir
// ─────────────────────────────────────────────────────────────────

interface SetStatusVars {
  dealId: string;
  status: DealStatus;
  lostReason?: string;
}

export function useSetDealStatus(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const key = boardKey(pipelineId, status);

  return useMutation<{ deal: BoardDealDto }, Error, SetStatusVars>({
    mutationFn: (vars) =>
      setDealStatus(vars.dealId, { status: vars.status, lostReason: vars.lostReason }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: dealDetailKey(vars.dealId) });
      const label =
        vars.status === "WON" ? "Negocio marcado como ganho" :
        vars.status === "LOST" ? "Negocio marcado como perdido" :
        "Negocio reaberto";
      toast.success(label);
    },
    onError: (err) => toast.error(err.message || "Falha ao alterar status"),
  });
}

// ─────────────────────────────────────────────────────────────────
// tags do deal
// ─────────────────────────────────────────────────────────────────

export function useDealTags() {
  return useQuery<DealTag[]>({
    queryKey: ["deal-tags-v2"],
    queryFn: listTags,
    staleTime: 60_000,
  });
}

export function useAddDealTag(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const boardK = boardKey(pipelineId, status);

  return useMutation<
    { ok: true },
    Error,
    { dealId: string; tagId?: string; tagName?: string; color?: string }
  >({
    mutationFn: ({ dealId, ...payload }) => addDealTag(dealId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["deal-tags-v2"] });
      qc.invalidateQueries({ queryKey: dealDetailKey(vars.dealId) });
      qc.invalidateQueries({ queryKey: boardK });
    },
    onError: (err) => toast.error(err.message || "Falha ao adicionar tag"),
  });
}

export function useRemoveDealTag(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const boardK = boardKey(pipelineId, status);

  return useMutation<{ ok: true }, Error, { dealId: string; tagId: string }>({
    mutationFn: ({ dealId, tagId }) => removeDealTag(dealId, tagId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: dealDetailKey(vars.dealId) });
      qc.invalidateQueries({ queryKey: boardK });
    },
    onError: (err) => toast.error(err.message || "Falha ao remover tag"),
  });
}

// ─────────────────────────────────────────────────────────────────
// usuários (team picker)
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// create / delete deal
// ─────────────────────────────────────────────────────────────────

export function useCreateDeal(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const key = boardKey(pipelineId, status);
  return useMutation<{ deal: BoardDealDto }, Error, CreateDealPayload>({
    mutationFn: (payload) => createDeal(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Negocio criado");
    },
    onError: (err) => toast.error(err.message || "Falha ao criar negocio"),
  });
}

export function useDeleteDeal(pipelineId: string | null, status: StatusFilter = "OPEN") {
  const qc = useQueryClient();
  const key = boardKey(pipelineId, status);
  return useMutation<void, Error, { dealId: string }>({
    mutationFn: ({ dealId }) => deleteDeal(dealId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: dealDetailKey(vars.dealId) });
      toast.success("Negocio excluido");
    },
    onError: (err) => toast.error(err.message || "Falha ao excluir negocio"),
  });
}

export function useTeamUsers(enabled: boolean = true) {
  return useQuery<TeamUser[]>({
    queryKey: ["team-users-v2"],
    queryFn: listTeamUsers,
    enabled,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────
// timeline do deal (tab Timeline do DealDetailPanel)
// ─────────────────────────────────────────────────────────────────

export function useDealTimeline(dealId: string | null) {
  return useQuery<DealTimelineEvent[]>({
    queryKey: ["deal-timeline-v2", dealId],
    queryFn: () => getDealTimeline(dealId as string),
    enabled: !!dealId,
    staleTime: 15_000,
  });
}
