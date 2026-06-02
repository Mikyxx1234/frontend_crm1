"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import { IconArrowsExchange, IconChevronDown, IconDotsVertical, IconPencil, IconPlus, IconTrophy } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { NavRail } from "@/components/crm/nav-rail";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { KanbanColumn } from "@/components/crm/kanban-column";
import { DealCard } from "@/components/crm/deal-card";
import { DealDetailPanel, type DealDetail } from "@/components/crm/deal-detail-panel";
import { Chip } from "@/components/crm/chip";

import {
  toKanbanColumns,
  type KanbanColumnView,
} from "@/features/pipeline-v2/adapters";
import { avatarInitials } from "@/features/inbox-v2/adapters";
import { useContactSidebar } from "@/features/inbox-v2/hooks";
import {
  useBoard,
  useDealDetail,
  useMoveDeal,
  usePipelines,
  useTeamUsers,
} from "@/features/pipeline-v2/hooks";
import { BulkActionsBar } from "@/components/pipeline/bulk-actions-bar";
import type { BoardDealDto, BoardStageDto, StatusFilter } from "@/features/pipeline-v2/api";
import {
  AddDealDialog,
  AssigneePopover,
  DealActionsMenu,
  DealActivitiesTab,
  DealNotesTab,
  DealTimelineTab,
  EMPTY_FILTERS,
  FiltersPopover,
  InlineEditText,
  PipelineSwitcher,
  StagePicker,
  TagsPopover,
  WinButton,
  countActiveFilters,
  useDealChatBinding,
  type KanbanFilters,
} from "@/features/pipeline-v2/extras";

type TabId = "abertos" | "ganhos" | "perdidos" | "todos";

const TAB_TO_STATUS: Record<TabId, StatusFilter> = {
  abertos: "OPEN",
  ganhos: "WON",
  perdidos: "LOST",
  todos: "ALL",
};

/**
 * Props opcionais — usadas para reaproveitar o Kanban dentro do
 * segmento `/v2/*` (injeta o NavRailV2 com hrefs novos). Sem nada
 * passado, mantém o `<NavRail />` legado.
 */
interface KanbanV2ClientPageProps {
  navRail?: React.ReactNode;
  /**
   * Quando informado, o toggle de visão (Pipeline/Lista) do header
   * navega para esta rota ao selecionar "Lista". Usado pelo segmento
   * `/v2/pipeline` (-> `/v2/pipeline/list`). Sem isso, o toggle de
   * lista fica inerte (legado `(v2)/pipeline/kanban-v2`).
   */
  listHref?: string;
}

export default function KanbanV2ClientPage({
  navRail,
  listHref,
}: KanbanV2ClientPageProps = {}) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [activeTab, setActiveTab] = useState<TabId>("abertos");
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [addStage, setAddStage] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [filters, setFilters] = useState<KanbanFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtersBtnRef = useRef<HTMLButtonElement>(null);

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

  // ── Seleção em massa (resgatada da versão antiga) ────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: teamUsers = [] } = useTeamUsers(isAuthenticated);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Limpa a seleção ao trocar de pipeline ou aba — os IDs não fazem
  // sentido entre boards diferentes.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pipelineId, activeTab]);

  // Aplica filtros client-side ANTES de virar colunas. Mantemos o
  // total real (totalCount) para o badge de "todos no estagio" — mas
  // contamos visualmente apenas os filtrados em `count`.
  const filteredBoard = useMemo(() => {
    const hasOwner = filters.ownerIds.length > 0;
    const hasTag = filters.tagIds.length > 0;
    const q = search.trim().toLowerCase();
    const hasSearch = q.length > 0;
    if (!hasOwner && !hasTag && !hasSearch) return board;
    return board.map((stage) => ({
      ...stage,
      deals: stage.deals.filter((d) => {
        if (hasOwner && (!d.owner?.id || !filters.ownerIds.includes(d.owner.id))) {
          return false;
        }
        if (hasTag) {
          const ids = (d.tags ?? []).map((t) => t.id);
          if (!filters.tagIds.some((id) => ids.includes(id))) return false;
        }
        if (hasSearch) {
          const hay = [d.title, d.contact?.name, d.contact?.email, d.contact?.phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    }));
  }, [board, filters, search]);

  const columns: KanbanColumnView[] = useMemo(
    () => toKanbanColumns(filteredBoard),
    [filteredBoard],
  );

  // Lookup ownerId / tags reais por dealId. O `Deal` (v0) que chega no
  // renderDeal só tem `owner.name`, não o `ownerId` nem `tagIds`. Esse
  // map evita ter que estender o tipo Deal só para isso. Usa o board
  // ORIGINAL pra nao perder lookup de cards filtrados (caso slot
  // precise consultar mesmo escondido).
  const dealById = useMemo(() => {
    const map = new Map<string, BoardDealDto>();
    for (const stage of board) {
      for (const d of stage.deals) map.set(d.id, d);
    }
    return map;
  }, [board]);

  const { data: dealDetail } = useDealDetail(activeDealId);

  // Campos personalizados: mesma fonte do contact-aside (inboxLeadPanelFields + dealInboxPanelFields).
  // O contactId vem do dealDetail para garantir que está sempre associado ao deal aberto.
  const dealContactId = dealDetail?.contact?.id ?? null;
  const { data: dealContact } = useContactSidebar(dealContactId);
  console.log("[v0] dealContactId:", dealContactId, "dealContact:", dealContact);
  console.log("[v0] inboxLeadPanelFields:", dealContact?.inboxLeadPanelFields);
  console.log("[v0] dealInboxPanelFields:", dealContact?.dealInboxPanelFields);

  // Encontra o stage corrente do deal aberto pra alimentar o header de pills.
  const activeDealStage = useMemo(() => {
    if (!activeDealId) return undefined;
    return board.find((s) => s.deals.some((d) => d.id === activeDealId));
  }, [activeDealId, board]);
  const activeDealStageName = activeDealStage?.name;
  const activeDealStageId = activeDealStage?.id ?? null;

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
      email: dealDetail.contact?.email ?? null,
      value: dealDetail.value ?? null,
      online: undefined,
      stage: activeDealStageName,
      owner: {
        initials: avatarInitials(ownerName),
        name: ownerName,
        avatarColor: avatarColorSlugFromName(ownerName),
      },
    };
  }, [dealDetail, activeDealStageName]);

  // ── Conversa real ligada ao deal ────────────────────────────────
  // Pega a conversa mais recente do contato (o backend ja ordena por
  // updatedAt desc em getDealById). Quando o deal nao tem contato
  // vinculado ou nao ha conversa, o binding retorna nodes de "vazio".
  const dealConversationId =
    (dealDetail?.contact as { conversations?: { id: string }[] } | null | undefined)
      ?.conversations?.[0]?.id ?? null;
  const dealContactName =
    dealDetail?.contact?.name?.trim() || dealDetail?.title || "Contato";
  const { messagesNode, composerNode, sessionAlertNode, templateModal } =
    useDealChatBinding({
      conversationId: dealConversationId,
      contactName: dealContactName,
      // Por ora nao temos sinal de "sessionExpired" no get-deal; mantemos false.
      sessionExpired: false,
    });

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
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 p-4">
      {navRail ?? <NavRail />}
      <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
        <PipelineHeader
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t)}
          activeView="kanban"
          onViewChange={(view) => {
            if (view === "list" && listHref) router.push(listHref);
          }}
          pipelineNameSlot={
            <PipelineSwitcher
              selectedId={pipelineId}
              onChange={(id) => setPipelineId(id)}
            />
          }
          filtersButtonRef={filtersBtnRef}
          onFiltersClick={() => setFiltersOpen((v) => !v)}
          activeFiltersCount={countActiveFilters(filters)}
          search={search}
          onSearchChange={setSearch}
        />
        <FiltersPopover
          open={filtersOpen}
          anchorRef={filtersBtnRef}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          onChange={setFilters}
        />

        <DragDropContext onDragEnd={handleDragEnd}>
          {/* min-h-0 + min-w-0 são CRÍTICOS: sem isso o flex-1 nao
              limita altura, as <section> filhas estouram e os cards
              do final somem (cortados embaixo) em telas menores. */}
          <div className="flex min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-auto overflow-y-hidden pb-2">
            {columns.map((col) => (
              <DroppableColumn
                key={col.stageId}
                column={col}
                onDealClick={setActiveDealId}
                dealById={dealById}
                pipelineId={pipelineId}
                statusFilter={status}
                stages={board}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onAddDeal={() =>
                  setAddStage({ id: col.stageId, name: col.title })
                }
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
        stageRibbonSlot={
          activeDealId && activeDealStageId ? (
            <div className="flex items-center gap-1">
              {board.map((s, idx) => {
                const currentIdx = board.findIndex(
                  (b) => b.id === activeDealStageId,
                );
                const done = idx < currentIdx;
                const active = s.id === activeDealStageId;
                return (
                  <span
                    key={s.id}
                    className="flex-1 truncate rounded-full border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.06em]"
                    style={
                      active
                        ? {
                            background: "var(--brand-primary)",
                            color: "#fff",
                            borderColor: "var(--brand-primary-dark)",
                            boxShadow: "0 4px 12px rgba(91,111,245,0.35)",
                          }
                        : done
                          ? {
                              background: "var(--color-success-bg)",
                              color: "var(--color-success-text)",
                              borderColor: "rgba(16,185,129,0.25)",
                            }
                          : {
                              background: "var(--glass-bg)",
                              color: "var(--text-muted)",
                              borderColor: "var(--glass-border)",
                            }
                    }
                  >
                    {s.name}
                  </span>
                );
              })}
            </div>
          ) : undefined
        }
        stageDropdownSlot={
          activeDealId && activeDealStageId ? (
            <StagePicker
              dealId={activeDealId}
              currentStageId={activeDealStageId}
              pipelineId={pipelineId}
              statusFilter={status}
            >
              {({ onSelectStage, isPending }) => (
                <StageDropdown
                  stages={board}
                  currentStageId={activeDealStageId}
                  isPending={isPending}
                  onSelect={onSelectStage}
                />
              )}
            </StagePicker>
          ) : undefined
        }
        funnelSegments={board.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color ?? "var(--brand-primary)",
          position: s.position,
        }))}
        winButtonSlot={
          activeDealId ? (
            <WinButton
              dealId={activeDealId}
              currentStatus={dealDetail?.status ?? "OPEN"}
              pipelineId={pipelineId}
              statusFilter={status}
              trigger={
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
                  style={{
                    background:
                      dealDetail?.status === "WON"
                        ? "var(--text-muted)"
                        : "var(--color-success)",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.30)",
                  }}
                >
                  <IconTrophy size={14} />
                  {dealDetail?.status === "WON" ? "Reabrir" : "Ganhar"}
                </span>
              }
            />
          ) : undefined
        }
        moreActionsSlot={
          activeDealId ? (
            <DealActionsMenu
              dealId={activeDealId}
              currentStatus={dealDetail?.status ?? "OPEN"}
              pipelineId={pipelineId}
              statusFilter={status}
              onDeleted={() => setActiveDealId(null)}
              trigger={
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border text-[var(--text-primary)] transition-colors"
                  style={{
                    background: "var(--glass-bg-strong)",
                    borderColor: "var(--glass-border)",
                    boxShadow: "var(--glass-shadow-sm)",
                  }}
                  title="Mais"
                >
                  <IconDotsVertical size={16} />
                </span>
              }
            />
          ) : undefined
        }
        ownerSlot={
          activeDealId ? (
            <AssigneePopover
              dealId={activeDealId}
              currentOwnerId={dealDetail?.owner?.id ?? null}
              currentOwnerName={dealDetail?.owner?.name ?? null}
              pipelineId={pipelineId}
              statusFilter={status}
              trigger={
                <Chip
                  variant="brand"
                  className="cursor-pointer transition-colors hover:bg-[rgba(91,111,245,0.22)]"
                >
                  {dealDetail?.owner?.name ?? "Sem responsável"}
                  <IconChevronDown size={10} />
                </Chip>
              }
            />
          ) : undefined
        }
        sourceSlot={
          activeDealId ? (
            <InlineEditText
              dealId={activeDealId}
              field="source"
              value={dealDetail?.source ?? null}
              placeholder="Adicionar origem"
              pipelineId={pipelineId}
              statusFilter={status}
              display={(v) => (
                <span className="inline-flex items-center gap-1.5 font-display text-[13px] font-semibold text-[var(--text-primary)]">
                  {v && v.trim() ? v : <span className="italic text-[var(--text-muted)]">Adicionar</span>}
                  <IconPencil size={12} className="opacity-50" />
                </span>
              )}
            />
          ) : undefined
        }
        forecastSlot={
          activeDealId ? (
            <InlineEditText
              dealId={activeDealId}
              field="expectedCloseAt"
              type="date"
              value={
                dealDetail?.expectedClose
                  ? dealDetail.expectedClose.slice(0, 10)
                  : null
              }
              placeholder="Indefinida"
              pipelineId={pipelineId}
              statusFilter={status}
              display={(v) =>
                v && v.trim() ? (
                  <span className="cursor-pointer font-display text-[13px] font-semibold text-[var(--text-primary)]">
                    {formatDate(v)}
                  </span>
                ) : (
                  <span className="cursor-pointer font-display text-[13px] italic text-[var(--text-muted)]">
                    Indefinida
                  </span>
                )
              }
            />
          ) : undefined
        }
        customFieldsSlot={(() => {
          // Mesma lógica do toContactAside: mescla inboxLeadPanelFields (contato) +
          // dealInboxPanelFields[activeDealId] (campos do negócio ativo),
          // deduplicando por fieldId e filtrando vazios.
          const contactFields = dealContact?.inboxLeadPanelFields ?? [];
          const dealFields = activeDealId
            ? (dealContact?.dealInboxPanelFields?.[activeDealId] ?? [])
            : [];
          const seen = new Set<string>();
          return [...contactFields, ...dealFields]
            .filter((f) => {
              if (!f.value?.trim() || seen.has(f.fieldId)) return false;
              seen.add(f.fieldId);
              return true;
            })
            .map((f) => ({ fieldId: f.fieldId, label: f.label || f.name, value: f.value }));
        })()}
        messagesSlot={messagesNode}
        composerSlot={composerNode}
        sessionAlertSlot={sessionAlertNode ?? null}
        tabContentOverride={
          activeDealId
            ? {
                notas: (
                  <DealNotesTab
                    dealId={activeDealId}
                    notes={dealDetail?.notes ?? null}
                    pipelineId={pipelineId}
                    statusFilter={status}
                  />
                ),
                timeline: <DealTimelineTab dealId={activeDealId} />,
                atividades: <DealActivitiesTab />,
              }
            : undefined
        }
        tagsSlot={
          activeDealId ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(dealDetail?.tags ?? []).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold"
                  style={{
                    background: `${t.color ?? "#5b6ff5"}22`,
                    color: t.color ?? "var(--brand-primary)",
                    border: `1px solid ${t.color ?? "#5b6ff5"}44`,
                  }}
                >
                  {t.name}
                </span>
              ))}
              <TagsPopover
                dealId={activeDealId}
                currentTags={dealDetail?.tags ?? []}
                pipelineId={pipelineId}
                statusFilter={status}
                trigger={
                  <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-[rgba(163,163,163,0.40)] px-2.5 py-0.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                    <IconPlus size={10} />
                    Adicionar
                  </span>
                }
              />
            </div>
          ) : undefined
        }
      />

      <AddDealDialog
        open={!!addStage}
        onOpenChange={(o) => {
          if (!o) setAddStage(null);
        }}
        stageId={addStage?.id ?? ""}
        stageName={addStage?.name}
        pipelineId={pipelineId}
        statusFilter={status}
      />

      {pipelineId ? (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          selectedIds={selectedIds}
          onClear={clearSelection}
          pipelineId={pipelineId}
          stages={board.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color ?? undefined,
          }))}
          users={teamUsers.map((u) => ({ id: u.id, name: u.name }))}
        />
      ) : null}

      {templateModal}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// StageDropdown — dropdown glass para troca de fase na sidebar.
// Reusa o estilo de PipelineSwitcher / AssigneePopover.
// ─────────────────────────────────────────────────────────────────

function StageDropdown({
  stages,
  currentStageId,
  isPending,
  onSelect,
}: {
  stages: BoardStageDto[];
  currentStageId: string | null;
  isPending: boolean;
  onSelect: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = stages.find((s) => s.id === currentStageId);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-display text-[15px] font-bold text-[var(--text-primary)] transition-opacity hover:opacity-70 disabled:cursor-wait disabled:opacity-50"
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: current?.color ?? "var(--brand-primary)" }}
        />
        {current?.name ?? "Selecionar fase"}
        <IconChevronDown
          size={14}
          className={cn(
            "text-[var(--text-muted)] transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-1 shadow-[0_8px_24px_rgba(15,20,40,0.14)] backdrop-blur-md"
        >
          {[...stages]
            .sort((a, b) => a.position - b.position)
            .map((s) => {
              const isActive = s.id === currentStageId;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2 font-display text-[13px] font-semibold transition-colors",
                    isActive
                      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-overlay)]",
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: s.color ?? "var(--brand-primary)" }}
                  />
                  {s.name}
                  {isActive && (
                    <span className="ml-auto font-display text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                      Atual
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────
// Coluna drop-friendly: re-renderiza a KanbanColumn original com
// uma área Droppable em cima dos cards.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// CardMoveMenu — botão "Mover" no rodapé do card que abre um menu de
// fases (alternativa ao drag-and-drop, útil no mobile/touch). Reusa o
// StagePicker (useMoveDeal) para a mutação com update otimista.
// ─────────────────────────────────────────────────────────────────
function CardMoveMenu({
  dealId,
  currentStageId,
  pipelineId,
  statusFilter,
  stages,
}: {
  dealId: string;
  currentStageId: string;
  pipelineId: string | null;
  statusFilter: StatusFilter;
  stages: BoardStageDto[];
}) {
  return (
    <StagePicker
      dealId={dealId}
      currentStageId={currentStageId}
      pipelineId={pipelineId}
      statusFilter={statusFilter}
    >
      {({ onSelectStage, isPending }) => (
        <CardMoveDropdown
          stages={stages}
          currentStageId={currentStageId}
          isPending={isPending}
          onSelect={onSelectStage}
        />
      )}
    </StagePicker>
  );
}

function CardMoveDropdown({
  stages,
  currentStageId,
  isPending,
  onSelect,
}: {
  stages: BoardStageDto[];
  currentStageId: string;
  isPending: boolean;
  onSelect: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={isPending}
        title="Mover de fase"
        aria-label="Mover de fase"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] disabled:cursor-wait disabled:opacity-50"
      >
        <IconArrowsExchange size={15} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-1.5 max-h-[260px] min-w-[200px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-1 shadow-[0_8px_24px_rgba(15,20,40,0.18)] backdrop-blur-md">
          <div className="px-3 py-1.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Mover para
          </div>
          {[...stages]
            .sort((a, b) => a.position - b.position)
            .map((s) => {
              const isActive = s.id === currentStageId;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isPending || isActive}
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left font-display text-[12px] font-semibold transition-colors",
                    isActive
                      ? "cursor-default bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-overlay)]",
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: s.color ?? "var(--brand-primary)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {isActive && (
                    <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                      Atual
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

function DroppableColumn({
  column,
  onDealClick,
  dealById,
  pipelineId,
  statusFilter,
  onAddDeal,
  stages,
  selectedIds,
  onToggleSelect,
}: {
  column: KanbanColumnView;
  onDealClick: (id: string) => void;
  dealById: Map<string, BoardDealDto>;
  pipelineId: string | null;
  statusFilter: StatusFilter;
  onAddDeal?: () => void;
  stages: BoardStageDto[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
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
          onAddDeal={onAddDeal}
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
          renderDeal={(deal, index) => {
            const raw = dealById.get(deal.id);
            return (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(dragProvided, dragSnapshot) => {
                  const node = (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={{
                      ...dragProvided.draggableProps.style,
                      opacity: dragSnapshot.isDragging ? 0.9 : 1,
                    }}
                  >
                    <DealCard
                      deal={deal}
                      onClick={() => onDealClick(deal.id)}
                      isSelected={selectedIds.has(deal.id)}
                      onToggleSelect={() => onToggleSelect(deal.id)}
                      tagsSlot={
                        <>
                          {(raw?.tags ?? ([] as NonNullable<BoardDealDto["tags"]>)).map((t) => (
                            <span
                              key={t.id}
                              className="font-display text-[9.5px] font-bold px-2 py-px rounded-full inline-flex items-center tracking-wide"
                              style={{
                                background: `${t.color || "#5b6ff5"}22`,
                                color: t.color || "var(--brand-primary)",
                                border: `1px solid ${t.color || "#5b6ff5"}44`,
                              }}
                            >
                              {t.name}
                            </span>
                          ))}
                          <TagsPopover
                            dealId={deal.id}
                            currentTags={raw?.tags ?? []}
                            pipelineId={pipelineId}
                            statusFilter={statusFilter}
                            trigger={
                              // Botão "+" circular igual ao do inbox (triggerVariant="icon").
                              <span className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[12px] font-bold leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]">
                                +
                              </span>
                            }
                          />
                        </>
                      }
                      ownerSlot={
                        <AssigneePopover
                          dealId={deal.id}
                          currentOwnerId={raw?.owner?.id ?? null}
                          currentOwnerName={raw?.owner?.name ?? null}
                          pipelineId={pipelineId}
                          statusFilter={statusFilter}
                          trigger={
                            // Mesmo padrão visual do inbox: Chip brand quando
                            // há responsável, Chip ghost "+Responsável" quando
                            // não há (em vez de pintar "Sem responsavel" de azul).
                            raw?.owner?.name ? (
                              <Chip
                                variant="brand"
                                className="max-w-full cursor-pointer truncate whitespace-nowrap transition-colors hover:bg-[rgba(91,111,245,0.22)]"
                              >
                                {raw.owner.name}
                              </Chip>
                            ) : (
                              <Chip
                                variant="ghost"
                                className="cursor-pointer whitespace-nowrap transition-colors hover:text-[var(--brand-primary)]"
                              >
                                +Responsável
                              </Chip>
                            )
                          }
                        />
                      }
                      moveMenuSlot={
                        <CardMoveMenu
                          dealId={deal.id}
                          currentStageId={column.stageId}
                          pipelineId={pipelineId}
                          statusFilter={statusFilter}
                          stages={stages}
                        />
                      }
                    />
                  </div>
                  );
                  // Enquanto arrasta, renderizamos o card num portal pro
                  // <body>. Os ancestrais do Kanban usam backdrop-blur/
                  // transform (glass), que criam um containing block novo e
                  // quebram o `position: fixed` que a lib aplica ao item
                  // arrastado — sem o portal, o card "some"/salta pra fora da
                  // tela. Portar pro body (sem ancestral transformado) faz o
                  // ghost seguir o cursor normalmente.
                  return dragSnapshot.isDragging && typeof document !== "undefined"
                    ? createPortal(node, document.body)
                    : node;
                }}
              </Draggable>
            );
          }}
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

// ─────────────────────────────────────────────────────��───────────
// Helper: nome → slug de cor do v0 (av-blue, av-orange, ...).
// O novo DealDetailPanel usa `av-${avatarColor}` direto no className,
// então precisamos retornar um dos slugs definidos em globals-v2.css.
// ────────────────────────────────────���────────────────────────────

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
