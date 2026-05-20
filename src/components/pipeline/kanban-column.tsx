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
  /** Total real (independente do limit do board). */
  totalCount?: number;
  hasMore?: boolean;
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
  onLoadMore?: (stageId: string) => void;
  loadingMore?: boolean;
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
  onLoadMore,
  loadingMore,
  onMarkWon,
  onMarkLost,
  statusBusy,
  recentlyMovedId,
}: KanbanColumnProps) {
  const visibleCount = stage.deals.length;
  // `count` prefere o total do servidor (independente do limit). Cai pro
  // visível só quando a info ainda não chegou (board legado).
  const count = stage.totalCount ?? visibleCount;
  const unreadInColumn = stage.deals.reduce((a, d) => a + (d.unreadCount ?? 0), 0);
  const attentionInColumn = stage.deals.filter((d) => d.isRotting || d.priority === "HIGH").length;
  const remaining = Math.max(0, (stage.totalCount ?? visibleCount) - visibleCount);
  return (
    <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col self-stretch sm:w-[300px]">
      {/* Surface da coluna: tokens de glass do tema (substituem `bg-white/30`
          que ficava esbranquiçado em dark). Listras laterais suavizadas com
          borda única usando `--glass-border-subtle`. */}
      <div className="relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-[22px] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
        <header className="relative shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-3 py-2.5 backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate font-display text-[13px] font-semibold leading-tight text-foreground">
              {stage.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              {attentionInColumn > 0 ? (
                <TooltipHost label={`${attentionInColumn} negócio(s) precisam de atenção`} side="bottom">
                  <span className="flex min-w-5 items-center justify-center rounded-full border border-amber-300/40 bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
                    {attentionInColumn}
                  </span>
                </TooltipHost>
              ) : null}
              {unreadInColumn > 0 ? (
                <TooltipHost label={`${unreadInColumn} mensagem(ns) não lida(s) nesta etapa`} side="bottom">
                  <span className="flex min-w-5 items-center justify-center gap-0.5 rounded-full border border-emerald-300/30 bg-emerald-50/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <MessageCircle className="size-3" />
                    {unreadInColumn}
                  </span>
                </TooltipHost>
              ) : null}
              <span className="flex min-w-5 items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-ink-soft)]">{count}</span>
            </div>
          </div>
          {/* Faixa de cor da etapa — agora ABAIXO do nome (era no topo
              da coluna). Posicionada como underline do título, com cantos
              arredondados próprios. Mantém opacidade reduzida em dark
              mode pra não competir com o glass escuro. */}
          {stage.color ? (
            <div
              className="mt-1.5 h-[2px] w-full rounded-full opacity-90 dark:opacity-60"
              style={{ backgroundColor: stage.color }}
              aria-hidden
            />
          ) : null}
          <p className="mt-1.5 text-[11px] tabular-nums text-[var(--color-ink-muted)]">{formatCurrency(totalValue)}</p>
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
                snapshot.isDraggingOver && "bg-primary/10 dark:bg-primary/15",
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

              {stage.hasMore && remaining > 0 && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => onLoadMore?.(stage.id)}
                  className="mt-0.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 py-2 text-[11px] font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/10 disabled:opacity-60"
                >
                  {loadingMore ? "Carregando..." : `Carregar mais (${remaining})`}
                </button>
              )}

              <button
                type="button"
                onClick={() => onAddCard?.(stage.id)}
                className="mt-0.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--glass-border-subtle)] py-2 text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:border-primary/40 hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
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
