"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import {
  DragDropContext,
  Droppable,
  type DropResult,
  type DragStart,
  type DragUpdate,
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

const boardQueryKey = (pid: string, status: "OPEN" | "WON" | "LOST" | "ALL" = "OPEN") =>
  ["pipeline-board", pid, status] as const;
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
  statusFilter?: "OPEN" | "WON" | "LOST" | "ALL";
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
  pipelineId, stages, statusFilter = "OPEN", visibleFields, onDealClick, onAddCard,
  filter, currentUserId,
  searchQuery = "", filterAgent = "all", filterStage = "all",
  filterMsg = "all", filterOverdue = false,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [statusBusy, setStatusBusy] = React.useState<{ dealId: string; kind: "won" | "lost" } | null>(null);
  const [confirmMove, setConfirmMove] = React.useState<{ result: DropResult; stageName: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<{ dealId: string; dealLabel: string } | null>(null);
  const [recentlyMoved, setRecentlyMoved] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeStageIdx, setActiveStageIdx] = React.useState(0);
  const [scrollState, setScrollState] = React.useState({ left: 0, width: 0, client: 0 });
  const isDraggingMinimap = React.useRef(false);

  const scrollToStage = React.useCallback((idx: number) => {
    if (!scrollRef.current) return;
    const cols = scrollRef.current.querySelectorAll<HTMLElement>(':scope > [data-stage-col]');
    const col = cols[idx];
    if (!col) return;
    col.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setActiveStageIdx(idx);
  }, []);

  const scrollToPosition = React.useCallback((pct: number) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = pct * (el.scrollWidth - el.clientWidth);
  }, []);

  // Sync scroll state and active stage
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setScrollState({ left: el.scrollLeft, width: el.scrollWidth, client: el.clientWidth });
      const cols = el.querySelectorAll<HTMLElement>(':scope > [data-stage-col]');
      let closest = 0;
      let minDist = Infinity;
      cols.forEach((col, i) => {
        const dist = Math.abs(col.getBoundingClientRect().left - el.getBoundingClientRect().left);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActiveStageIdx(closest);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);
  // `isDragging` serve apenas pra exibir/ocultar a zona de exclusão
  // no rodapé. Guarda o dealId em drag para a gente poder resolver
  // o título do card sem uma segunda passada pelo board.
  const [isDragging, setIsDragging] = React.useState<string | null>(null);
  // Fallback do DnD: em alguns drops rápidos na lixeira o `destination`
  // vem `null`. Guardamos SOMENTE se o usuário estava sobre a lixeira,
  // sem interferir no drop normal entre colunas/etapas.
  const wasOverDeleteZoneRef = React.useRef(false);
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
      await queryClient.cancelQueries({ queryKey: boardQueryKey(pipelineId, statusFilter) });
      const prev = queryClient.getQueriesData<BoardStage[]>({ queryKey: boardQueryKey(pipelineId, statusFilter) });
      queryClient.setQueriesData<BoardStage[]>(
        { queryKey: boardQueryKey(pipelineId, statusFilter) },
        (current) =>
          current
            ? applyDragToBoard(
                current,
                v.dealId,
                v.fromStageId,
                v.fromIndex,
                v.toStageId,
                v.toIndex,
              )
            : current,
      );
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
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(e instanceof Error ? e.message : "Erro ao mover negócio");
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: boardQueryKey(pipelineId, statusFilter) }); },
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
      await queryClient.cancelQueries({ queryKey: boardQueryKey(pipelineId, statusFilter) });
      const prev = queryClient.getQueryData<BoardStage[]>(boardQueryKey(pipelineId, statusFilter));
      if (prev && (input.status === "WON" || input.status === "LOST")) {
        queryClient.setQueryData(boardQueryKey(pipelineId, statusFilter), cloneBoard(prev).map((col) => ({ ...col, deals: col.deals.filter((d) => d.id !== input.dealId) })));
      }
      return { prev };
    },
    onSuccess: (_d, input) => {
      toast.success(input.status === "WON" ? "Negócio ganho!" : "Negócio marcado como perdido", { duration: 2500 });
    },
    onError: (e, _i, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(boardQueryKey(pipelineId, statusFilter), ctx.prev);
      toast.error(e instanceof Error ? e.message : "Erro");
    },
    onSettled: () => { setStatusBusy(null); queryClient.invalidateQueries({ queryKey: boardQueryKey(pipelineId, statusFilter) }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Não foi possível excluir o negócio.");
      return data;
    },
    onMutate: async (dealId) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey(pipelineId, statusFilter) });
      const prev = queryClient.getQueryData<BoardStage[]>(boardQueryKey(pipelineId, statusFilter));
      if (prev) {
        queryClient.setQueryData(
          boardQueryKey(pipelineId, statusFilter),
          cloneBoard(prev).map((col) => ({ ...col, deals: col.deals.filter((d) => d.id !== dealId) })),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success("Negócio excluído", { duration: 2500 });
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(boardQueryKey(pipelineId, statusFilter), ctx.prev);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir negócio");
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: boardQueryKey(pipelineId, statusFilter) }); },
  });

  const executeDrag = React.useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const fromIdxResolved = stages
      .find((s) => s.id === source.droppableId)
      ?.deals.findIndex((d) => d.id === draggableId);
    const realFromIndex = fromIdxResolved != null && fromIdxResolved >= 0 ? fromIdxResolved : source.index;
    const toIdxResolved = stages
      .find((s) => s.id === destination.droppableId)
      ?.deals.findIndex((d) => d.id === draggableId);
    const realToIndex = toIdxResolved != null && toIdxResolved >= 0 ? toIdxResolved : destination.index;
    moveMutation.mutate({
      dealId: draggableId, fromStageId: source.droppableId, fromIndex: realFromIndex,
      toStageId: destination.droppableId, toIndex: realToIndex,
    });
  }, [moveMutation, stages]);

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
    wasOverDeleteZoneRef.current = false;
  }, []);

  const onDragUpdate = React.useCallback((update: DragUpdate) => {
    wasOverDeleteZoneRef.current = update.destination?.droppableId === DELETE_DROPPABLE_ID;
  }, []);

  const onDragEnd = React.useCallback((result: DropResult) => {
    setIsDragging(null);
    const { destination, draggableId } = result;
    const droppedInDeleteZone =
      destination?.droppableId === DELETE_DROPPABLE_ID ||
      (!destination && wasOverDeleteZoneRef.current);
    wasOverDeleteZoneRef.current = false;

    // Drop na zona de exclusão: abre confirmação. A deleção real só
    // acontece após o usuário confirmar no AlertDialog — protege contra
    // drop acidental durante scroll horizontal do kanban.
    if (droppedInDeleteZone) {
      setConfirmDelete({ dealId: draggableId, dealLabel: resolveDealLabel(draggableId) });
      return;
    }
    if (!destination) return;

    const destStage = stages.find((s) => s.id === destination.droppableId);
    if (destStage && TERMINAL_STAGE_NAMES.includes(destStage.name.toLowerCase())) {
      setConfirmMove({ result, stageName: destStage.name });
      return;
    }
    executeDrag(result);
  }, [stages, executeDrag, resolveDealLabel]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <DragDropContext onDragStart={onDragStart} onDragUpdate={onDragUpdate} onDragEnd={onDragEnd}>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          {/* Kanban scroll area — full height, native scrollbar hidden */}
          <div
            ref={scrollRef}
            className="flex h-full min-h-0 min-w-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-3 pt-3 pb-0 sm:gap-4 sm:px-5 sm:pt-5 md:px-6"
            style={{ scrollbarWidth: "none" }}
            role="region"
            aria-label="Pipeline Kanban"
          >
            {filteredStages.map((stage, idx) => {
              const totalValue = stage.deals.reduce((a, d) => a + dealNumericValue(d.value), 0);
              return (
                <div key={stage.id} data-stage-col={idx} className="flex h-full min-h-0 shrink-0 flex-col self-stretch">
                  <KanbanColumn
                    stage={{ id: stage.id, name: stage.name, color: stage.color, deals: stage.deals }}
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
                </div>
              );
            })}
          </div>

          {/* Minimap — floating bottom-right, Kommo style */}
          {scrollState.width > scrollState.client + 10 && (
            <div
              className="group absolute bottom-3 right-4 z-40 cursor-pointer"
              onMouseDown={(e) => {
                const bar = e.currentTarget.querySelector<HTMLElement>('[data-minimap-bar]');
                if (!bar) return;
                const barRect = bar.getBoundingClientRect();
                const onMove = (me: MouseEvent) => {
                  const pct = Math.max(0, Math.min(1, (me.clientX - barRect.left) / barRect.width));
                  scrollToPosition(pct);
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            >
              <div
                data-minimap-bar
                className="relative h-10 w-44 max-w-[200px] min-h-[40px] cursor-pointer overflow-hidden rounded-md bg-zinc-300 opacity-60 transition-all duration-200 group-hover:opacity-100 group-hover:shadow-[var(--shadow-md)] sm:w-48 sm:max-w-[220px]"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  scrollToPosition(pct);
                }}
              >
                {filteredStages.map((_, i) => i > 0 && (
                  <div
                    key={i}
                    className="absolute top-0 h-full w-px bg-white/60"
                    style={{ left: `${(i / filteredStages.length) * 100}%` }}
                  />
                ))}
                <div
                  className="absolute inset-y-0 rounded-md bg-zinc-500 transition-[left,width] duration-75 group-hover:bg-primary"
                  style={{
                    width: `${Math.max(8, (scrollState.client / scrollState.width) * 100)}%`,
                    left: `${scrollState.width > scrollState.client
                      ? (scrollState.left / (scrollState.width - scrollState.client)) * (100 - Math.max(8, (scrollState.client / scrollState.width) * 100))
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
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
    </div>
  );
}
