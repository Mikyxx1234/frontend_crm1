"use client";

import * as React from "react";
import {
  Draggable,
  Droppable,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
  type DroppableStateSnapshot,
} from "@hello-pangea/dnd";
import { MessageCircle, Plus } from "lucide-react";

import type { CardVisibleFields } from "@/components/pipeline/card-fields-config";
import { KanbanCard } from "@/components/pipeline/kanban-card";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import { cn, formatCurrency } from "@/lib/utils";
import { TooltipHost } from "@/components/ui/tooltip";

export type KanbanColumnStage = {
  id: string;
  name: string;
  color?: string;
  deals: BoardDeal[];
};

type KanbanColumnProps = {
  stage: KanbanColumnStage;
  users: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    agentStatus?: {
      status: "ONLINE" | "OFFLINE" | "AWAY";
      availableForVoiceCalls?: boolean;
      updatedAt?: string;
    } | null;
  }[];
  totalValue: number;
  visibleFields?: CardVisibleFields;
  onDealClick?: (dealId: string) => void;
  onAddCard?: (stageId: string) => void;
  onMarkWon: (dealId: string) => void;
  onMarkLost: (dealId: string, reason: string) => void;
  statusBusy: { dealId: string; kind: "won" | "lost" } | null;
  recentlyMovedId: string | null;
};

const ghostScrollStyle: React.CSSProperties = {
  scrollbarWidth: "thin" as const,
  scrollbarColor: "transparent transparent",
};

export function KanbanColumn({
  stage,
  users,
  totalValue,
  visibleFields,
  onDealClick,
  onAddCard,
  onMarkWon,
  onMarkLost,
  statusBusy,
  recentlyMovedId,
}: KanbanColumnProps) {
  const count = stage.deals.length;
  const unreadInColumn = stage.deals.reduce((a, d) => a + (d.unreadCount ?? 0), 0);
  const attentionInColumn = stage.deals.filter((d) => d.isRotting || d.priority === "HIGH").length;
  return (
    <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col self-stretch sm:w-[300px]">
      <div className="relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/60">
        <header className="shrink-0 border-b border-zinc-200/80 bg-white px-3 py-2.5">
          {/* Barra de cor da etapa — 3px no topo */}
          {stage.color ? (
            <div
              className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl"
              style={{ backgroundColor: stage.color }}
            />
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-[13px] font-semibold leading-tight text-zinc-800">
              {stage.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              {attentionInColumn > 0 ? (
                <TooltipHost label={`${attentionInColumn} negócio(s) precisam de atenção`} side="bottom">
                  <span className="flex min-w-5 items-center justify-center rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-amber-900">
                    {attentionInColumn}
                  </span>
                </TooltipHost>
              ) : null}
              {unreadInColumn > 0 ? (
                <TooltipHost label={`${unreadInColumn} mensagem(ns) não lida(s) nesta etapa`} side="bottom">
                  <span className="flex min-w-5 items-center justify-center gap-0.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-teal-600">
                    <MessageCircle className="size-3" />
                    {unreadInColumn}
                  </span>
                </TooltipHost>
              ) : null}
              <span className="flex min-w-5 items-center justify-center rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-500">{count}</span>
            </div>
          </div>
          <p className="mt-0.5 text-[11px] tabular-nums text-zinc-400">{formatCurrency(totalValue)}</p>
        </header>

        <Droppable droppableId={stage.id}>
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => {
            const droppableProps = provided.droppableProps as React.HTMLAttributes<HTMLDivElement>;
            const { style: droppableStyle, ...droppableRest } = droppableProps;
            return (
            <div
              ref={provided.innerRef}
              {...droppableRest}
              className={cn(
                "kanban-scroll flex min-h-[120px] flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden p-2",
                snapshot.isDraggingOver && "bg-blue-50/30",
              )}
              style={{ ...ghostScrollStyle, ...droppableStyle }}
            >
              {stage.deals.map((deal, index) => (
                <Draggable key={deal.id} draggableId={deal.id} index={index}>
                  {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={cn(
                        "transition-all duration-150",
                        dragSnapshot.isDragging && "opacity-95",
                      )}
                      style={{
                        ...dragProvided.draggableProps.style,
                        ...(dragSnapshot.isDragging ? { willChange: "transform" } : {}),
                      }}
                    >
                      <KanbanCard
                        deal={deal}
                        users={users}
                        dragHandleProps={dragProvided.dragHandleProps ?? {}}
                        visibleFields={visibleFields}
                        onClick={() => onDealClick?.(deal.number ? String(deal.number) : deal.id)}
                        onMarkWon={() => onMarkWon(deal.id)}
                        onMarkLost={(r) => onMarkLost(deal.id, r)}
                        statusBusy={statusBusy?.dealId === deal.id ? statusBusy.kind : null}
                        isDragging={dragSnapshot.isDragging}
                        isHighlighted={recentlyMovedId === deal.id}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              <button
                type="button"
                onClick={() => onAddCard?.(stage.id)}
                className="mt-0.5 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-200 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-600"
                aria-label={`Adicionar negócio em ${stage.name}`}
              >
                <Plus className="size-4" strokeWidth={2.5} />
                Adicionar negócio
              </button>
            </div>
            );
          }}
        </Droppable>
      </div>
    </div>
  );
}
