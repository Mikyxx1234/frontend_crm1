"use client";

import * as React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { IconChevronUp, IconPlus } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { ScrollMap } from "@/components/crm/scroll-map";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { cn } from "@/lib/utils";
import type { DemandBoardDetail, DemandItem } from "./types";
import { KIND_LABEL, PRIORITY_LABEL } from "./types";

function kindVariant(kind: DemandItem["kind"]): "default" | "warning" | "destructive" | "secondary" | "muted" {
  if (kind === "BUG") return "destructive";
  if (kind === "FEATURE") return "default";
  if (kind === "IMPROVEMENT") return "secondary";
  if (kind === "TASK") return "muted";
  return "warning";
}

function DemandCard({
  item,
  index,
  onOpen,
  onVote,
}: {
  item: DemandItem;
  index: number;
  onOpen: (id: string) => void;
  onVote: (id: string) => void;
}) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(item.id)}
          className={cn(
            "cursor-pointer rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-3.5 shadow-[var(--glass-shadow-sm)] transition-colors",
            snapshot.isDragging && "bg-[var(--glass-bg-strong)]",
          )}
        >
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              className="flex min-w-[36px] shrink-0 flex-col items-center rounded-md border border-[var(--glass-border)] px-1.5 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] hover:border-primary/40 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onVote(item.id);
              }}
              title="Votar"
            >
              <IconChevronUp size={16} />
              {item.votesCount}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-[var(--text-muted)]">
                #{item.number}
              </div>
              <h3 className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--text-primary)]">
                {item.title}
              </h3>
              {item.description.trim() ? (
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                  {item.description.trim()}
                </p>
              ) : (
                <p className="mt-1.5 text-[12px] italic text-[var(--text-muted)]">
                  Sem descrição
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={kindVariant(item.kind)}>{KIND_LABEL[item.kind]}</Badge>
                {item.priority !== "NONE" && (
                  <Badge variant={item.priority === "URGENT" || item.priority === "HIGH" ? "warning" : "muted"}>
                    {PRIORITY_LABEL[item.priority]}
                  </Badge>
                )}
                {item.assignee && (
                  <span className="truncate text-[11px] text-[var(--text-secondary)]">
                    {item.assignee.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      )}
    </Draggable>
  );
}

export function DemandKanban({
  board,
  onOpenItem,
  onVote,
  onMove,
  onAddInStage,
  canMove,
}: {
  board: DemandBoardDetail;
  onOpenItem: (id: string) => void;
  onVote: (id: string) => void;
  onMove: (itemId: string, stageId: string, beforeId: string | null, afterId: string | null) => void;
  onAddInStage: (stageId: string) => void;
  canMove: boolean;
}) {
  const onDragEnd = (result: DropResult) => {
    if (!canMove) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    const destStage = board.stages.find((s) => s.id === destination.droppableId);
    if (!destStage) return;
    const siblings = destStage.items.filter((i) => i.id !== draggableId);
    const after = siblings[destination.index - 1]?.id ?? null;
    const before = siblings[destination.index]?.id ?? null;
    onMove(draggableId, destStage.id, before, after);
  };

  const boardRef = React.useRef<HTMLDivElement>(null);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = boardRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const col = (e.target as HTMLElement | null)?.closest(".kanban-scroll");
    if (col instanceof HTMLElement && col.scrollHeight > col.clientHeight) {
      const atTop = col.scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        col.scrollTop + col.clientHeight >= col.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBottom) return;
    }
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        ref={boardRef}
        onWheel={onWheel}
        className="kanban-board-hscroll flex h-full min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-auto overflow-y-hidden"
      >
        {board.stages.map((stage) => {
          const stageColor = stage.color || "var(--color-primary)";
          return (
          <Droppable droppableId={stage.id} key={stage.id}>
            {(provided, snapshot) => (
              <section
                aria-label={`Coluna ${stage.name}`}
                className={cn(
                  "kanban-col flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
                  snapshot.isDraggingOver && "border-primary/30",
                )}
              >
                <header className="relative shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-3 py-2.5 backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <h3 className="min-w-0 truncate font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
                        {stage.name}
                      </h3>
                      <span
                        className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 font-display text-[11px] font-bold text-white"
                        style={{ background: stageColor }}
                      >
                        {stage.items.length}
                      </span>
                    </div>
                    <TooltipGlass label="Nova demanda nesta fase" side="top">
                      <button
                        type="button"
                        onClick={() => onAddInStage(stage.id)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:text-white"
                        onMouseEnter={(e) => {
                          const btn = e.currentTarget;
                          btn.style.background = stageColor;
                          btn.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          const btn = e.currentTarget;
                          btn.style.background = "";
                          btn.style.color = "";
                        }}
                      >
                        <IconPlus size={15} />
                      </button>
                    </TooltipGlass>
                  </div>
                  <div
                    className="mt-1.5 h-[2px] w-full rounded-full opacity-90"
                    style={{ backgroundColor: stageColor }}
                    aria-hidden
                  />
                </header>
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="kanban-scroll flex min-h-[120px] flex-1 flex-col gap-1.5 overflow-x-clip overflow-y-auto px-2 pb-2 pt-3"
                >
                  {stage.items.map((item, index) => (
                    <DemandCard
                      key={item.id}
                      item={item}
                      index={index}
                      onOpen={onOpenItem}
                      onVote={onVote}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              </section>
            )}
          </Droppable>
          );
        })}
      </div>
      <ScrollMap
        boardRef={boardRef}
        columnCount={board.stages.length}
        className="max-md:hidden"
      />
      </div>
    </DragDropContext>
  );
}
