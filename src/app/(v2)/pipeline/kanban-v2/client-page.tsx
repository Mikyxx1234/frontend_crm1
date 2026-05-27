"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import { NavRail } from "@/components/crm/nav-rail";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { KanbanColumn } from "@/components/crm/kanban-column";
import { DealCard } from "@/components/crm/deal-card";
import { DealDetailPanel, type DealDetail } from "@/components/crm/deal-detail-panel";

import {
  toKanbanColumns,
  type KanbanColumnView,
} from "@/features/pipeline-v2/adapters";
import { avatarInitials } from "@/features/inbox-v2/adapters";
import {
  useBoard,
  useDealDetail,
  useMoveDeal,
  usePipelines,
} from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

type TabId = "abertos" | "ganhos" | "perdidos" | "todos";

const TAB_TO_STATUS: Record<TabId, StatusFilter> = {
  abertos: "OPEN",
  ganhos: "WON",
  perdidos: "LOST",
  todos: "ALL",
};

export default function KanbanV2ClientPage() {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [activeTab, setActiveTab] = useState<TabId>("abertos");
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const status = TAB_TO_STATUS[activeTab];
  const { data: pipelines } = usePipelines(isAuthenticated);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (!pipelineId && pipelines?.length) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);

  const { data: board = [] } = useBoard({
    pipelineId,
    status,
    enabled: isAuthenticated,
  });

  const moveDeal = useMoveDeal(pipelineId, status);

  const columns: KanbanColumnView[] = useMemo(
    () => toKanbanColumns(board),
    [board],
  );

  const { data: dealDetail } = useDealDetail(activeDealId);

  // Encontra o stage corrente do deal aberto pra alimentar o header de pills.
  const activeDealStageName = useMemo(() => {
    if (!activeDealId) return undefined;
    const stage = board.find((s) => s.deals.some((d) => d.id === activeDealId));
    return stage?.name;
  }, [activeDealId, board]);

  const dealDetailVm: DealDetail | null = useMemo(() => {
    if (!dealDetail) return null;
    const contactName = dealDetail.contact?.name?.trim() || dealDetail.title || "Sem nome";
    const ownerName = dealDetail.owner?.name?.trim() || "Sem responsavel";
    return {
      id: dealDetail.id,
      name: contactName,
      initials: avatarInitials(contactName),
      avatarColor: avatarColorSlugFromName(contactName),
      phone: dealDetail.contact?.phone ?? undefined,
      online: undefined,
      stage: activeDealStageName,
      owner: {
        initials: avatarInitials(ownerName),
        name: ownerName,
        avatarColor: avatarColorSlugFromName(ownerName),
      },
    };
  }, [dealDetail, activeDealStageName]);

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    moveDeal.mutate({
      dealId: draggableId,
      fromStageId: source.droppableId,
      toStageId: destination.droppableId,
      toIndex: destination.index,
    });
  }

  return (
    <div className="grid h-dvh grid-cols-[72px_1fr] gap-4 p-4">
      <NavRail />
      <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
        <PipelineHeader
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t)}
        />

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-3.5 overflow-x-auto pb-2">
            {columns.map((col) => (
              <DroppableColumn
                key={col.stageId}
                column={col}
                onDealClick={setActiveDealId}
              />
            ))}
            {columns.length === 0 ? (
              <EmptyBoard isAuthenticated={isAuthenticated} />
            ) : null}
          </div>
        </DragDropContext>
      </div>

      <DealDetailPanel
        isOpen={!!activeDealId}
        onClose={() => setActiveDealId(null)}
        deal={dealDetailVm ?? undefined}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Coluna drop-friendly: re-renderiza a KanbanColumn original com
// uma área Droppable em cima dos cards.
// ─────────────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  onDealClick,
}: {
  column: KanbanColumnView;
  onDealClick: (id: string) => void;
}) {
  return (
    <Droppable droppableId={column.stageId}>
      {(provided, snapshot) => (
        <KanbanColumn
          title={column.title}
          color={column.color}
          count={column.count}
          total={column.total}
          deals={column.deals}
          onDealClick={onDealClick}
          onAddDeal={() => {
            /* TODO: abrir dialog de novo deal (Fase 11) */
          }}
          dealsContainerRef={provided.innerRef}
          dealsContainerProps={{
            ...provided.droppableProps,
            "aria-label": `Coluna ${column.title}`,
            style: snapshot.isDraggingOver
              ? {
                  background: "rgba(91,111,245,0.05)",
                  borderRadius: "var(--radius-lg)",
                }
              : undefined,
          }}
          placeholderSlot={provided.placeholder}
          renderDeal={(deal, index) => (
            <Draggable key={deal.id} draggableId={deal.id} index={index}>
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  {...dragProvided.dragHandleProps}
                  style={{
                    ...dragProvided.draggableProps.style,
                    opacity: dragSnapshot.isDragging ? 0.85 : 1,
                  }}
                >
                  <DealCard deal={deal} onClick={() => onDealClick(deal.id)} />
                </div>
              )}
            </Draggable>
          )}
        />
      )}
    </Droppable>
  );
}

function EmptyBoard({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="grid w-full place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-12 text-center backdrop-blur-md">
      <div>
        <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
          {isAuthenticated ? "Selecione um pipeline" : "Carregando..."}
        </h2>
        <p className="mt-1 max-w-sm text-[12.5px] text-[var(--text-muted)]">
          Pipeline ativo nao retornou estagios. Verifique a configuracao no painel
          de administracao.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helper: nome → slug de cor do v0 (av-blue, av-orange, ...).
// O novo DealDetailPanel usa `av-${avatarColor}` direto no className,
// então precisamos retornar um dos slugs definidos em globals-v2.css.
// ─────────────────────────────────────────────────────────────────

const AVATAR_SLUGS = [
  "green",
  "blue",
  "orange",
  "purple",
  "pink",
  "coral",
  "teal",
  "mint",
  "gray",
] as const;

function avatarColorSlugFromName(name: string | null | undefined): string {
  const safe = (name ?? "").trim();
  if (!safe) return "gray";
  let sum = 0;
  for (let i = 0; i < safe.length; i += 1) sum += safe.charCodeAt(i);
  return AVATAR_SLUGS[sum % AVATAR_SLUGS.length];
}
