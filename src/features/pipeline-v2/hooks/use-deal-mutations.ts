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

export interface MoveVars {
  dealId: string;
  fromStageId: string;
  toStageId: string;
  toIndex?: number;
  /** Motivo da perda — obrigatório no fluxo de mover para o estágio Perdido. */
  lostReason?: string;
  /**
   * Funil de destino quando diferente do atual — usado para invalidar
   * o cache do board do funil destino após a mutação e desabilitar o
   * update otimista local (que assume board único).
   */
  toPipelineId?: string | null;
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
      // o "fim da coluna destino" a partir do cache atual. Para moves
      // cross-pipeline, o board do funil destino pode nao estar
      // carregado — usamos posicao 0 como fallback (backend clampa).
      let pos = vars.toIndex;
      if (pos == null) {
        const board = qc.getQueryData<BoardStageDto[]>(key);
        const target = board?.find((s) => s.id === vars.toStageId);
        if (target) {
          const hasSelf = target.deals.some((d) => d.id === vars.dealId);
          pos = Math.max(0, target.deals.length - (hasSelf ? 1 : 0));
        } else {
          pos = 0;
        }
      }
      return moveDeal(vars.dealId, {
        stageId: vars.toStageId,
        position: pos,
        lostReason: vars.lostReason,
      });
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardStageDto[]>(key);
      if (!prev) return { prev };
      const next = prev.map((s) => ({ ...s, deals: [...s.deals] }));
      const fromIdx = next.findIndex((s) => s.id === vars.fromStageId);
      const toIdx = next.findIndex((s) => s.id === vars.toStageId);
      // Cross-pipeline: destino nao pertence ao board atual — apenas
      // remove o card do estagio origem (evita ficar "flutuando" enquanto
      // o servidor responde). O board de destino sera revalidado no
      // onSettled abaixo.
      if (fromIdx !== -1 && toIdx === -1) {
        const dealIdx = next[fromIdx].deals.findIndex((d) => d.id === vars.dealId);
        if (dealIdx !== -1) {
          next[fromIdx].deals.splice(dealIdx, 1);
          next[fromIdx].totalCount =
            (next[fromIdx].totalCount ?? next[fromIdx].deals.length + 1) - 1;
          qc.setQueryData(key, next);
        }
        return { prev };
      }
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
    onSuccess: (data, vars) => {
      // IB1: feedback visivel — antes a UI atualizava (ou nao) sem
      // qualquer toast e o operador nao tinha certeza de que tinha
      // funcionado. O backend POST /move retorna o deal direto
      // (NextResponse.json(deal)) — nao envelopado em { deal }. O
      // tipo do front diz `{ deal: BoardDealDto }`, mas na pratica
      // o campo `stage.name` e `stage.pipeline` vem no nivel raiz.
      const root = data as
        | {
            stage?: { name?: string; pipeline?: { id?: string; name?: string } | null };
            deal?: { stage?: { name?: string; pipeline?: { id?: string; name?: string } | null } };
          }
        | undefined;
      const toStage = root?.stage ?? root?.deal?.stage;
      const toName = toStage?.name ?? null;
      const toPipeName = toStage?.pipeline?.name ?? null;
      const crossPipeline =
        !!vars.toPipelineId && vars.toPipelineId !== pipelineId;
      toast.success(
        crossPipeline && toPipeName
          ? `Movido para "${toPipeName} → ${toName ?? "fase"}"`
          : toName
            ? `Fase atualizada para "${toName}"`
            : "Fase atualizada",
      );
    },
    onSettled: (_data, _err, vars) => {
      // IB1: usar refetchQueries (em vez de invalidate) garante que as
      // queries ativas no inbox sejam re-buscadas imediatamente — o
      // invalidate marca como stale mas pode deixar a UI com o valor
      // antigo ate o proximo trigger. `type: "active"` evita refetch
      // de queries de outras orgs / paineis nao montados.
      qc.refetchQueries({ queryKey: key, type: "active" });
      qc.refetchQueries({ queryKey: ["contact-sidebar"], type: "active" });
      qc.refetchQueries({ queryKey: dealDetailKey(vars.dealId), type: "active" });
      // Cross-pipeline: invalida TODOS os boards (o funil destino pode
      // estar aberto em outra aba/tela) — refetch ativo garante que a
      // UI do funil destino reflita o card recem-chegado.
      if (vars.toPipelineId && vars.toPipelineId !== pipelineId) {
        qc.refetchQueries({ queryKey: ["pipeline-board"], type: "active" });
      } else {
        // Catch-all: qualquer outro consumidor de board (ex.: kanban em
        // outro pipeline) so' marca como stale.
        qc.invalidateQueries({ queryKey: ["pipeline-board"], type: "inactive" });
      }
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
