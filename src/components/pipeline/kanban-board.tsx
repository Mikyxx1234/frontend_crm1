"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import {
  DragDropContext,
  Droppable,
  type DropResult,
  type DragStart,
} from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { CardVisibleFields } from "@/components/pipeline/card-fields-config";
import { KanbanColumn } from "@/components/pipeline/kanban-column";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, dealNumericValue, pipelineDealMatchesSearch } from "@/lib/utils";

const DELETE_DROPPABLE_ID = "__delete_zone__";

export type BoardStage = {
  id: string;
  name: string;
  color: string;
  position: number;
  winProbability: number;
  rottingDays: number;
  pipelineId?: string;
  isIncoming?: boolean;
  conversionRate?: number;
  avgDaysInStage?: number;
  deals: BoardDeal[];
};

type MoveVars = {
  dealId: string;
  fromStageId: string;
  fromIndex: number;
  toStageId: string;
  toIndex: number;
};

function cloneBoard(stages: BoardStage[]): BoardStage[] {
  return stages.map((s) => ({ ...s, deals: s.deals.map((d) => ({ ...d })) }));
}

function applyDragToBoard(
  stages: BoardStage[], dealId: string,
  srcId: string, srcIdx: number, dstId: string, dstIdx: number,
): BoardStage[] {
  const next = cloneBoard(stages);
  const src = next.find((s) => s.id === srcId);
  const dst = next.find((s) => s.id === dstId);
  if (!src || !dst) return stages;
  const [moved] = src.deals.splice(srcIdx, 1);
  if (!moved) return stages;
  dst.deals.splice(dstIdx, 0, moved);
  for (const col of next) col.deals.forEach((d, i) => { d.position = i; });
  return next;
}

const boardQueryKey = (pid: string) => ["pipeline-board", pid] as const;
type BoardUserOption = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  agentStatus?: {
    status: "ONLINE" | "OFFLINE" | "AWAY";
    availableForVoiceCalls?: boolean;
    updatedAt?: string;
  } | null;
};

async function fetchUsers(): Promise<BoardUserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? data) as BoardUserOption[];
}

const TERMINAL_STAGE_NAMES = ["fechado", "perdido", "ganho", "won", "lost", "closed"];

type KanbanBoardProps = {
  pipelineId: string;
  stages: BoardStage[];
  visibleFields?: CardVisibleFields;
  onDealClick?: (dealId: string) => void;
  onAddCard?: (stageId: string) => void;
  filter?: "mine" | "urgent" | "vip" | null;
  currentUserId?: string;
  searchQuery?: string;
  filterAgent?: string;
  filterStage?: string;
  filterMsg?: "all" | "unread" | "no-reply";
  filterOverdue?: boolean;
};

export function KanbanBoard({
  pipelineId, stages, visibleFields, onDealClick, onAddCard,
  filter, currentUserId,
  searchQuery = "", filterAgent = "all", filterStage = "all",
  filterMsg = "all", filterOverdue = false,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [statusBusy, setStatusBusy] = React.useState<{ dealId: string; kind: "won" | "lost" } | null>(null);
  const [confirmMove, setConfirmMove] = React.useState<{ result: DropResult; stageName: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<{ dealId: string; dealLabel: string } | null>(null);
  const [recentlyMoved, setRecentlyMoved] = React.useState<string | null>(null);
  // `isDragging` serve apenas pra exibir/ocultar a zona de exclusão
  // no rodapé. Guarda o dealId em drag para a gente poder resolver
  // o título do card sem uma segunda passada pelo board.
  const [isDragging, setIsDragging] = React.useState<string | null>(null);
  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 5 * 60_000,
  });

  const filteredStages = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasAny = filter || q || filterAgent !== "all" || filterStage !== "all" || filterMsg !== "all" || filterOverdue;
    if (!hasAny) return stages;

    const stagesSource = filterStage !== "all" ? stages.filter((s) => s.id === filterStage) : stages;

    return stagesSource.map((s) => ({
      ...s,
      deals: s.deals.filter((d) => {
        if (filter === "mine" && d.owner?.id !== currentUserId) return false;
        if (filter === "urgent" && !(d.priority === "HIGH" || d.isRotting)) return false;
        if (filter === "vip" && !d.tags?.some((t) => t.name.toLowerCase() === "vip")) return false;

        if (filterAgent === "none" && d.owner) return false;
        if (filterAgent !== "all" && filterAgent !== "none" && d.owner?.id !== filterAgent) return false;

        if (filterMsg === "unread" && !(d.unreadCount && d.unreadCount > 0)) return false;
        if (filterMsg === "no-reply" && d.lastMessage?.direction !== "in") return false;

        if (filterOverdue && !d.hasOverdueActivity) return false;

        if (q) {
          const ok = pipelineDealMatchesSearch(searchQuery, {
            title: d.title,
            contactName: d.contact?.name,
            contactEmail: d.contact?.email,
            contactPhone: d.contact?.phone,
            ownerName: d.owner?.name,
            productName: d.productName,
            tagNames: d.tags?.map((t) => t.name),
            dealNumber: d.number,
          });
          if (!ok) return false;
        }

        return true;
      }),
    }));
  }, [stages, filter, currentUserId, searchQuery, filterAgent, filterStage, filterMsg, filterOverdue]);

  const moveMutation = useMutation({
    mutationFn: async (vars: MoveVars) => {
      const res = await fetch(apiUrl(`/api/deals/${vars.dealId}/move`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: vars.toStageId, position: vars.toIndex }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Não foi possível mover o negócio.");
      return data;
    },
    onMutate: async (v: MoveVars) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey(pipelineId) });
      const prev = queryClient.getQueryData<BoardStage[]>(boardQueryKey(pipelineId));
      if (prev) queryClient.setQueryData(boardQueryKey(pipelineId), applyDragToBoard(prev, v.dealId, v.fromStageId, v.fromIndex, v.toStageId, v.toIndex));
      return { prev };
    },
    onSuccess: (_d, v) => {
      const destStage = stages.find((s) => s.id === v.toStageId);
      if (destStage) {
        toast.success(`Movido para "${destStage.name}"`, { duration: 2000 });
      }
      setRecentlyMoved(v.dealId);
      setTimeout(() => setRecentlyMoved(null), 3000);
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(boardQueryKey(pipelineId), ctx.prev);
      toast.error(e instanceof Error ? e.message : "Erro ao mover negócio");
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: boardQueryKey(pipelineId) }); },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { dealId: string; status: "WON" | "LOST"; lostReason?: string }) => {
      const res = await fetch(apiUrl(`/api/deals/${input.dealId}/status`), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.status === "LOST" ? { status: "LOST", lostReason: input.lostReason } : { status: input.status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Não foi possível atualizar o status.");
      return data;
    },
    onMutate: async (input) => {
      setStatusBusy({ dealId: input.dealId, kind: input.status === "LOST" ? "lost" : "won" });
      await queryClient.cancelQueries({ queryKey: boardQueryKey(pipelineId) });
      const prev = queryClient.getQueryData<BoardStage[]>(boardQueryKey(pipelineId));
      if (prev && (input.status === "WON" || input.status === "LOST")) {
        queryClient.setQueryData(boardQueryKey(pipelineId), cloneBoard(prev).map((col) => ({ ...col, deals: col.deals.filter((d) => d.id !== input.dealId) })));
      }
      return { prev };
    },
    onSuccess: (_d, input) => {
      toast.success(input.status === "WON" ? "Negócio ganho!" : "Negócio marcado como perdido", { duration: 2500 });
    },
    onError: (e, _i, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(boardQueryKey(pipelineId), ctx.prev);
      toast.error(e instanceof Error ? e.message : "Erro");
    },
    onSettled: () => { setStatusBusy(null); queryClient.invalidateQueries({ queryKey: boardQueryKey(pipelineId) }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Não foi possível excluir o negócio.");
      return data;
    },
    onMutate: async (dealId) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey(pipelineId) });
      const prev = queryClient.getQueryData<BoardStage[]>(boardQueryKey(pipelineId));
      if (prev) {
        queryClient.setQueryData(
          boardQueryKey(pipelineId),
          cloneBoard(prev).map((col) => ({ ...col, deals: col.deals.filter((d) => d.id !== dealId) })),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success("Negócio excluído", { duration: 2500 });
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(boardQueryKey(pipelineId), ctx.prev);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir negócio");
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: boardQueryKey(pipelineId) }); },
  });

  const executeDrag = React.useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    moveMutation.mutate({
      dealId: draggableId, fromStageId: source.droppableId, fromIndex: source.index,
      toStageId: destination.droppableId, toIndex: destination.index,
    });
  }, [moveMutation]);

  const resolveDealLabel = React.useCallback((dealId: string): string => {
    for (const s of stages) {
      const d = s.deals.find((x) => x.id === dealId);
      if (d) {
        return d.title?.trim() || d.contact?.name?.trim() || `#${d.number ?? dealId.slice(0, 8)}`;
      }
    }
    return "este negócio";
  }, [stages]);

  const onDragStart = React.useCallback((start: DragStart) => {
    setIsDragging(start.draggableId);
  }, []);

  const onDragEnd = React.useCallback((result: DropResult) => {
    setIsDragging(null);
    const { destination, draggableId } = result;
    if (!destination) return;

    // Drop na zona de exclusão: abre confirmação. A deleção real só
    // acontece após o usuário confirmar no AlertDialog — protege contra
    // drop acidental durante scroll horizontal do kanban.
    if (destination.droppableId === DELETE_DROPPABLE_ID) {
      setConfirmDelete({ dealId: draggableId, dealLabel: resolveDealLabel(draggableId) });
      return;
    }

    const destStage = stages.find((s) => s.id === destination.droppableId);
    if (destStage && TERMINAL_STAGE_NAMES.includes(destStage.name.toLowerCase())) {
      setConfirmMove({ result, stageName: destStage.name });
      return;
    }
    executeDrag(result);
  }, [stages, executeDrag, resolveDealLabel]);

  return (
    <>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          className="flex h-full gap-3 overflow-x-auto px-3 pb-4 pt-3 sm:gap-4 sm:px-5 sm:pb-6 sm:pt-5 md:px-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#06b6d4 transparent" }}
          role="region"
          aria-label="Pipeline Kanban"
        >
          {filteredStages.map((stage) => {
            const totalValue = stage.deals.reduce((a, d) => a + dealNumericValue(d.value), 0);

            return (
              <KanbanColumn
                key={stage.id}
                stage={{ id: stage.id, name: stage.name, deals: stage.deals }}
                users={users}
                totalValue={totalValue}
                visibleFields={visibleFields}
                onDealClick={onDealClick}
                onAddCard={onAddCard}
                onMarkWon={(dealId) => statusMutation.mutate({ dealId, status: "WON" })}
                onMarkLost={(dealId, reason) => statusMutation.mutate({ dealId, status: "LOST", lostReason: reason })}
                statusBusy={statusBusy}
                recentlyMovedId={recentlyMoved}
              />
            );
          })}
        </div>

        {/* Zona de exclusão — SEMPRE renderizada no DOM (mesmo sem drag ativo).
            Se a gente montasse o Droppable dinamicamente dentro de AnimatePresence
            só quando isDragging=true, o @hello-pangea/dnd não registraria o
            droppable a tempo: ele faz a leitura da geometria no momento em que
            o drag começa, e droppables que aparecem DURANTE o drag ficam fora
            da lista — resultado: o drop não é reconhecido e o card "congela"
            em cima da barra sem disparar onDragEnd corretamente.
            Solução: deixa o Droppable fixo e anima apenas a aparência (opacity +
            translateY). Pointer-events são zerados fora de drag pra não
            capturar cliques acidentais. */}
        <Droppable droppableId={DELETE_DROPPABLE_ID}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 transition-all duration-200 ease-out sm:pb-6",
                isDragging
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-20 opacity-0",
              )}
              aria-hidden={!isDragging}
            >
              <div
                className={cn(
                  "flex w-full max-w-xl items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-[13px] font-semibold transition-all sm:text-[14px]",
                  snapshot.isDraggingOver
                    ? "scale-105 border-rose-400 bg-rose-500 text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.6)]"
                    : "border-rose-200 bg-white/95 text-rose-600 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.18)] backdrop-blur-sm",
                )}
                aria-label="Solte aqui para excluir o negócio"
              >
                <Trash2
                  className={cn(
                    "size-5 shrink-0 transition-transform",
                    snapshot.isDraggingOver && "rotate-12",
                  )}
                  strokeWidth={2.2}
                />
                <span>
                  {snapshot.isDraggingOver
                    ? "Solte para excluir"
                    : "Arraste aqui para excluir"}
                </span>
              </div>
              {/* Placeholder precisa estar dentro do ref. Fica com display
                  fora da zona visual porque a lista nunca recebe o card
                  visualmente — vai direto pro dialog de confirmação. */}
              <div style={{ display: "none" }}>{provided.placeholder}</div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <AlertDialog open={!!confirmMove} onOpenChange={(open) => { if (!open) setConfirmMove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para &ldquo;{confirmMove?.stageName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta é uma etapa terminal. Tem certeza que deseja mover este negócio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmMove(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmMove) { executeDrag(confirmMove.result); setConfirmMove(null); } }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{confirmDelete?.dealLabel}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O negócio será removido do pipeline junto com
              seu histórico, atividades e tarefas vinculadas. Não será possível
              desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deleteMutation.mutate(confirmDelete.dealId);
                  setConfirmDelete(null);
                }
              }}
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40"
            >
              Excluir negócio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
