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
    <div className="flex w-[280px] shrink-0 flex-col sm:w-[300px]">
      <div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-sm">
        <header className="shrink-0 border-b border-border/80 bg-card px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">{stage.name}</h3>
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
                  <span className="flex min-w-5 items-center justify-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700">
                    <MessageCircle className="size-3" />
                    {unreadInColumn}
                  </span>
                </TooltipHost>
              ) : null}
              <span className="flex min-w-5 items-center justify-center rounded bg-muted px-1 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>
            </div>
          </div>
          <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">{formatCurrency(totalValue)}</p>
        </header>

        <Droppable droppableId={stage.id}>
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2.5",
                snapshot.isDraggingOver && "bg-accent/5",
              )}
              style={{ scrollbarWidth: "thin" }}
            >
              {stage.deals.map((deal, index) => (
                <Draggable key={deal.id} draggableId={deal.id} index={index}>
                  {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={cn(
                        "transition-all duration-200",
                        dragSnapshot.isDragging && "opacity-95 scale-[1.02]",
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
                className="mt-0.5 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
                aria-label={`Adicionar negócio em ${stage.name}`}
              >
                <Plus className="size-4" strokeWidth={2.5} />
                Adicionar negócio
              </button>
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}
