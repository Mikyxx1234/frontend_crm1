"use client";

import { apiUrl } from "@/lib/api";
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconBriefcase as Briefcase,
  IconMessageOff as MessageSquareOff,
  IconMessages as MessagesIcon,
  IconTrash as Trash,
  IconX as X,
} from "@tabler/icons-react";

import type { BoardStage } from "@/components/pipeline/kanban-board";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import { StageRibbon } from "@/components/sales-hub/stage-ribbon";
import {
  DealQueue,
  DealQueueSortMenu,
  type DealQueueSortMode,
} from "@/components/sales-hub/deal-queue";
import { SalesHubChat } from "@/components/sales-hub/sales-hub-chat";
import { ConversationActionsMenu } from "@/features/inbox-v2/extras";
import { DealOutcomeButtons } from "@/components/sales-hub/deal-actions";
import {
  DealDetailPanel,
  type DealDetail,
} from "@/components/crm/deal-detail-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipHost } from "@/components/ui/tooltip";
import {
  cn,
  dealNumericValue,
  formatCurrency,
  pipelineDealMatchesSearch,
} from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

/**
 * ConversationItem mínimo que o SalesHub precisa pra resolver a conversa
 * ativa a partir do `contactId` do deal selecionado.
 *
 * Inclui `assignedToId` porque o `TransferPopover` do Composer (mesmo do
 * Inbox) destaca o responsável atual, e `lastInboundAt` porque é o
 * fallback da janela de 24h da Meta quando o backend não devolve o
 * objeto `session` junto das mensagens.
 */
type ConversationRow = {
  id: string;
  channel: string;
  status: string;
  updatedAt: string;
  lastInboundAt?: string | null;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string; email?: string | null } | null;
  tags?: { id?: string; name: string; color: string }[] | null;
};

async function fetchContactConversations(
  contactId: string,
): Promise<ConversationRow[]> {
  const res = await fetch(apiUrl(`/api/conversations?contactId=${contactId}&perPage=10`));
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : [];
}

function SalesHubChatEmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  // Surface neutra usando tokens do tema — `bg-white` virava placa
  // branca destoante em dark mode. Agora segue o background do app.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--color-chat-bg)] p-8">
      <MessageSquareOff
        className="size-7 text-[var(--text-muted)]"
        strokeWidth={1.5}
      />
      <p className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
        {title}
      </p>
      <p className="max-w-xs text-center text-[13px] text-[var(--text-muted)]">
        {subtitle}
      </p>
    </div>
  );
}

type StatusFilter = "OPEN" | "WON" | "LOST" | "ALL";

/**
 * Props do Sales Hub.
 *
 * Modo controlado (obrigatório no host `/saleshub`): `activeDealId` +
 * `onActiveDealChange` espelham `useDealDeepLink` (`?deal=`). O host
 * também passa `detailDeal` (VM do `DealDetailPanel` na coluna CRM).
 * Busca/filtros vêm do header (`PipelineSearchFilterBar` no host);
 * a fila só expõe ordenação local (`sortMode`).
 */
export type SalesHubViewProps = {
  pipelineId: string;
  stages: BoardStage[];
  /**
   * Status ativo no topo da página (Abertos/Ganhos/Perdidos/Todos).
   * Usado para montar a queryKey correta do board e permitir que o
   * DealCrmPanel faça update otimista no cache quando o quick-move
   * é disparado.
   */
  statusFilter?: StatusFilter;
  filter?: "mine" | "urgent" | "vip" | null;
  currentUserId?: string;
  /** Busca curta client-side (host usa server search quando ≥2 chars). */
  searchQuery?: string;
  filterAgent?: string;
  filterStage?: string;
  filterMsg?: "all" | "unread" | "no-reply";
  filterOverdue?: boolean;
  /** Abre o `DealWorkspace` (ex.: link “deal completo” na fila). */
  onOpenFullDeal?: (dealId: string) => void;
  sortMode: DealQueueSortMode;
  onSortModeChange: (mode: DealQueueSortMode) => void;
  /** Seleção controlada pelo host (`useDealDeepLink` em `/saleshub`). */
  activeDealId: string | null;
  onActiveDealChange: (dealId: string | null, dealNumber?: number | null) => void;
  /** VM do DealDetailPanel (coluna CRM inline). */
  detailDeal?: DealDetail | null;
  /**
   * Campos personalizados (contato + negócio) — mesma carga do kanban
   * (`customFieldsSlot` no DealDetailPanel). Sem isso, crmOnly só mostra
   * nativos de contato e omite "Informações do Negócio".
   */
  customFieldsSlot?: ComponentProps<typeof DealDetailPanel>["customFieldsSlot"];
  contactFieldConfigSlot?: ReactNode;
  dealFieldConfigSlot?: ReactNode;
};

export function SalesHubView({
  pipelineId,
  stages,
  statusFilter = "OPEN",
  filter,
  currentUserId,
  searchQuery = "",
  filterAgent = "all",
  filterStage = "all",
  filterMsg = "all",
  filterOverdue = false,
  onOpenFullDeal,
  sortMode,
  onSortModeChange,
  activeDealId,
  onActiveDealChange,
  detailDeal = null,
  customFieldsSlot,
  contactFieldConfigSlot,
  dealFieldConfigSlot,
}: SalesHubViewProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [recentlyMovedDealId, setRecentlyMovedDealId] = useState<string | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [pickedConversationId, setPickedConversationId] = useState<
    string | null
  >(null);
  const [convListOpen, setConvListOpen] = useState(false);

  /**
   * Experimento UX: ao sair do painel de chat pela borda direita, abre a
   * coluna CRM inline (DealDetailPanel — negócios + contatos), comprimindo
   * o chat. Saída à esquerda (fila) ou vertical não abre. `mouseleave` já
   * ignora filhos; o threshold evita flicker ao cruzar bordas / portais.
   */
  const CHAT_RIGHT_LEAVE_PX = 28;
  const handleChatPaneMouseLeave = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!activeDealId || detailsOpen) return;
      const related = e.relatedTarget;
      if (related instanceof Node && e.currentTarget.contains(related)) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const leavingRight = e.clientX >= rect.right - CHAT_RIGHT_LEAVE_PX;
      if (!leavingRight) return;

      setDetailsOpen(true);
    },
    [activeDealId, detailsOpen],
  );

  useEffect(() => {
    setPickedConversationId(null);
  }, [activeDealId]);

  // Deep-link / seleção externa: se o deal ativo está em outra etapa, foca a aba.
  useEffect(() => {
    if (!activeDealId) return;
    const stage = stages.find((s) =>
      s.deals.some(
        (d) => d.id === activeDealId || String(d.number) === activeDealId,
      ),
    );
    if (stage && selectedStageId !== stage.id) {
      setSelectedStageId(stage.id);
    }
    // Só reage a mudança de deal (não a selectedStageId) pra não loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDealId, stages]);

  const filteredStages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasAny =
      filter ||
      q ||
      filterAgent !== "all" ||
      filterStage !== "all" ||
      filterMsg !== "all" ||
      filterOverdue;
    if (!hasAny) return stages;

    const stagesSource =
      filterStage !== "all"
        ? stages.filter((s) => s.id === filterStage)
        : stages;

    return stagesSource.map((s) => ({
      ...s,
      deals: s.deals.filter((d) => {
        if (filter === "mine" && d.owner?.id !== currentUserId) return false;
        if (filter === "urgent" && !(d.priority === "HIGH" || d.isRotting))
          return false;
        if (
          filter === "vip" &&
          !d.tags?.some((t) => t.name.toLowerCase() === "vip")
        )
          return false;

        if (filterAgent === "none" && d.owner) return false;
        if (
          filterAgent !== "all" &&
          filterAgent !== "none" &&
          d.owner?.id !== filterAgent
        )
          return false;

        if (filterMsg === "unread" && !(d.unreadCount && d.unreadCount > 0))
          return false;
        if (filterMsg === "no-reply" && d.lastMessage?.direction !== "in")
          return false;

        if (filterOverdue && !d.hasOverdueActivity) return false;

        if (q) {
          return pipelineDealMatchesSearch(searchQuery, {
            title: d.title,
            contactName: d.contact?.name,
            contactEmail: d.contact?.email,
            contactPhone: d.contact?.phone,
            ownerName: d.owner?.name,
            productName: d.productName,
            tagNames: d.tags?.map((t) => t.name),
            dealNumber: d.number,
          });
        }

        return true;
      }),
    }));
  }, [
    stages,
    filter,
    currentUserId,
    searchQuery,
    filterAgent,
    filterStage,
    filterMsg,
    filterOverdue,
  ]);

  const sortedDeals = useMemo(() => {
    const source = selectedStageId
      ? filteredStages.filter((s) => s.id === selectedStageId)
      : filteredStages;

    const flat: (BoardDeal & { stageId: string })[] = source.flatMap((s) =>
      s.deals.map((d) => ({ ...d, stageId: s.id })),
    );

    const getMessageTime = (d: BoardDeal): number =>
      d.lastMessage?.createdAt ? new Date(d.lastMessage.createdAt).getTime() : 0;
    const getCreatedTime = (d: BoardDeal): number =>
      d.createdAt ? new Date(d.createdAt).getTime() : 0;

    return flat.sort((a, b) => {
      switch (sortMode) {
        case "message_new":
          return getMessageTime(b) - getMessageTime(a);
        case "message_old":
          return getMessageTime(a) - getMessageTime(b);
        case "created_new":
          return getCreatedTime(b) - getCreatedTime(a);
        case "created_old":
          return getCreatedTime(a) - getCreatedTime(b);
        default:
          return 0;
      }
    });
  }, [filteredStages, selectedStageId, sortMode]);

  const totalDeals = filteredStages.reduce(
    (sum, s) => sum + s.deals.length,
    0,
  );

  const activeDeal =
    sortedDeals.find(
      (d) =>
        d.id === activeDealId ||
        (activeDealId != null && String(d.number) === activeDealId),
    ) ?? null;

  // Resolve a conversa do contato do deal ativo. Usa o mesmo endpoint
  // que o inbox/deal-detail consome — garante que a conversa carregada
  // é exatamente a mesma independente do ponto de entrada (inbox, kanban
  // card, list view ou sales hub).
  const activeContactId = activeDeal?.contact?.id ?? null;
  const { data: contactConversations = [], isLoading: conversationsLoading } =
    useQuery({
      queryKey: ["saleshub-contact-conversations", activeContactId],
      queryFn: () => fetchContactConversations(activeContactId!),
      enabled: !!activeContactId,
      staleTime: 30_000,
    });
  const activeConversation = useMemo(() => {
    if (contactConversations.length === 0) return null;
    if (pickedConversationId) {
      return (
        contactConversations.find((c) => c.id === pickedConversationId) ??
        contactConversations[0] ??
        null
      );
    }
    return contactConversations[0] ?? null;
  }, [contactConversations, pickedConversationId]);

  const queryClient = useQueryClient();

  // Reabrir (envio em conversa encerrada / menu "+") gera um ticket novo:
  // aponta o hub pro id novo e recarrega a lista de conversas do contato.
  const handleConversationReopened = useCallback(
    (newConversationId: string) => {
      setPickedConversationId(newConversationId);
      queryClient.invalidateQueries({
        queryKey: ["saleshub-contact-conversations", activeContactId],
      });
    },
    [activeContactId, queryClient],
  );

  const resolveDealNumber = useCallback(
    (dealId: string) => {
      const d = stages
        .flatMap((s) => s.deals)
        .find((x) => x.id === dealId);
      return d?.number ?? null;
    },
    [stages],
  );

  const handleSelectDeal = useCallback(
    (dealId: string) => {
      onActiveDealChange(dealId, resolveDealNumber(dealId));
    },
    [onActiveDealChange, resolveDealNumber],
  );

  const handleSelectStage = useCallback(
    (stageId: string | null) => {
      setSelectedStageId(stageId);
      const source = stageId
        ? filteredStages.filter((s) => s.id === stageId)
        : filteredStages;
      const first = source.flatMap((s) => s.deals)[0];
      if (first) {
        onActiveDealChange(first.id, first.number ?? null);
      } else {
        onActiveDealChange(null);
      }
    },
    [filteredStages, onActiveDealChange],
  );

  const handleDeselectDeal = useCallback(() => {
    onActiveDealChange(null);
  }, [onActiveDealChange]);

  const handleDealMoved = useCallback((dealId: string) => {
    // Highlight visual por 1.5s pra sinalizar o "salto" entre etapas.
    setRecentlyMovedDealId(dealId);
    const t = setTimeout(() => setRecentlyMovedDealId(null), 1500);
    return () => clearTimeout(t);
  }, []);

  const { confirm: confirmDelete, dialog: confirmDeleteDialog } = useConfirm();

  const handleDeleteDealFromHub = useCallback(async () => {
    if (!activeDeal) return;
    const ok = await confirmDelete({
      title: "Excluir negócio?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(apiUrl(`/api/deals/${activeDeal.id}`), {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        typeof data?.message === "string"
          ? data.message
          : "Não foi possível excluir o negócio.",
      );
      return;
    }
    toast.success("Negócio excluído");
    handleDeselectDeal();
    queryClient.invalidateQueries({ queryKey: ["pipeline-board", pipelineId] });
    queryClient.invalidateQueries({ queryKey: ["pipelines"] });
  }, [activeDeal, confirmDelete, handleDeselectDeal, pipelineId, queryClient]);

  const funnelStages = useMemo(
    () =>
      filteredStages.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        count: s.deals.length,
        hasUrgent: s.deals.some(
          (d) => d.isRotting || d.priority === "HIGH",
        ),
      })),
    [filteredStages],
  );

  /** Header da fila — espelha o header de coluna do kanban CRM. */
  const queueStageHeader = useMemo(() => {
    if (selectedStageId) {
      const stage = filteredStages.find((s) => s.id === selectedStageId);
      if (stage) {
        return {
          name: stage.name,
          color: stage.color || "var(--brand-primary)",
          count: stage.deals.length,
          totalValue: stage.deals.reduce(
            (sum, d) => sum + dealNumericValue(d.value),
            0,
          ),
        };
      }
    }
    return {
      name: "Todos",
      color: "var(--brand-primary)",
      count: totalDeals,
      totalValue: filteredStages.reduce(
        (sum, s) =>
          sum +
          s.deals.reduce((a, d) => a + dealNumericValue(d.value), 0),
        0,
      ),
    };
  }, [filteredStages, selectedStageId, totalDeals]);

  // ────────────────────────────────────────────────────────────────────
  // Navegacao por teclado — faz o Sales Hub ser 100% navegavel sem sair
  // da tela:
  //   ↑ / ↓  →  navega entre cards da Fila (seleciona o deal anterior/proximo)
  //   ← / →  →  navega entre etapas do funil (filtra a Fila)
  //   Esc    →  deseleciona o deal ativo (volta ao estado inicial)
  //
  // Ignora a key se o foco estiver em input/textarea/contenteditable pra
  // nao conflitar com a busca da fila ou com a digitacao no Composer.
  // Root do container marcado com ref + tabIndex=-1 pra garantir foco
  // programatico quando o usuario clica em qualquer area do hub.
  // ────────────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      if (!t || !(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (t.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      // Protege contra navegacao quando o hub nao esta no viewport.
      if (!rootRef.current) return;

      if (e.key === "Escape") {
        if (detailsOpen) {
          e.preventDefault();
          setDetailsOpen(false);
          return;
        }
        if (activeDealId) {
          e.preventDefault();
          handleDeselectDeal();
        }
        return;
      }

      // ↑ / ↓ — navega entre cards da fila
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (sortedDeals.length === 0) return;
        e.preventDefault();
        const curIdx = sortedDeals.findIndex((d) => d.id === activeDealId);
        const step = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx =
          curIdx < 0
            ? e.key === "ArrowDown"
              ? 0
              : sortedDeals.length - 1
            : Math.max(0, Math.min(sortedDeals.length - 1, curIdx + step));
        const nextDeal = sortedDeals[nextIdx];
        if (nextDeal) handleSelectDeal(nextDeal.id);
        return;
      }

      // ← / → — navega entre etapas do funil.
      // Inclui a opcao "Todas" (id=null) como posicao 0; as etapas em
      // `filteredStages` ocupam posicoes 1..N. Mantem a selecao ciclica
      // dentro desse intervalo.
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const ids: (string | null)[] = [null, ...filteredStages.map((s) => s.id)];
        const curIdx = ids.findIndex((id) => id === selectedStageId);
        const step = e.key === "ArrowRight" ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(ids.length - 1, curIdx + step));
        if (nextIdx === curIdx) return;
        e.preventDefault();
        handleSelectStage(ids[nextIdx] ?? null);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeDealId,
    detailsOpen,
    handleDeselectDeal,
    handleSelectDeal,
    handleSelectStage,
    sortedDeals,
    filteredStages,
    selectedStageId,
  ]);

  const hubChromeCompact = false;

  return (
    // Root transparente: deixa o mesh lavanda do v2-screen aparecer
    // (mesmo contraste coluna/card do kanban). Estrutura split preservada.
    <div
      ref={rootRef}
      className="flex h-full flex-col bg-transparent"
      tabIndex={-1}
    >
      <StageRibbon
        stages={funnelStages}
        selectedStageId={selectedStageId}
        onSelectStage={handleSelectStage}
        totalDeals={totalDeals}
        compact={hubChromeCompact}
      />

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          activeDeal
            ? cn(
                "grid grid-cols-1 gap-3 md:grid-rows-1",
                detailsOpen
                  ? "md:grid-cols-[300px_minmax(0,1fr)_minmax(280px,360px)]"
                  : "md:grid-cols-[300px_minmax(0,1fr)]",
              )
            : "flex",
        )}
      >
        {/* Coluna 1 — Fila: superfície igual `KanbanColumn`
            (`glass-bg` semitransparente sobre lavanda + cards `glass-bg-strong`). */}
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
            activeDeal
              ? "hidden w-[300px] min-w-[300px] max-w-[300px] shrink-0 md:flex"
              : "w-full",
          )}
        >
          <header className="relative shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-3 py-2.5 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <h3 className="min-w-0 truncate font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
                  {queueStageHeader.name}
                </h3>
                <span
                  className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 font-display text-[11px] font-bold text-white"
                  style={{ background: queueStageHeader.color }}
                >
                  {queueStageHeader.count}
                </span>
              </div>
              <DealQueueSortMenu
                sortMode={sortMode}
                onSortModeChange={onSortModeChange}
                iconOnly
              />
            </div>
            <div
              className="mt-1.5 h-[2px] w-full rounded-full opacity-90"
              style={{ backgroundColor: queueStageHeader.color }}
              aria-hidden
            />
            <p className="mt-1.5 text-[11px] tabular-nums text-[var(--text-muted)]">
              {formatCurrency(queueStageHeader.totalValue)}
            </p>
          </header>

          <DealQueue
            deals={sortedDeals}
            stages={filteredStages}
            activeDealId={activeDealId}
            onSelectDeal={handleSelectDeal}
            onDeselect={handleDeselectDeal}
            recentlyMovedDealId={recentlyMovedDealId}
            sortMode={sortMode}
            selectedStageId={selectedStageId}
            pipelineId={pipelineId}
            statusFilter={statusFilter}
            onMoved={handleDealMoved}
            onOpenFullDeal={onOpenFullDeal}
          />
        </div>

        {/* Coluna 2 — Chat compacto (compactChrome) + barra mínima de ações.
            Sem deal ativo: a coluna inteira fica oculta (a fila ocupa
            100%). Com deal: [fila | chat]; com CRM aberto: [fila | chat | aside]. */}
        <div
          onMouseLeave={handleChatPaneMouseLeave}
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
            !activeDeal && "hidden",
          )}
        >
          {!activeDeal ? null : !activeContactId ? (
            <SalesHubChatEmptyState
              title="Deal sem contato"
              subtitle="Este deal nao tem contato vinculado — atribua um contato para iniciar a conversa."
            />
          ) : conversationsLoading ? (
            <div className="flex flex-1 items-center justify-center bg-[var(--color-chat-bg)]">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !activeConversation ? (
            <SalesHubChatEmptyState
              title="Sem conversa aberta"
              subtitle={`${activeDeal.contact?.name ?? "Este contato"} ainda nao tem nenhuma conversa. Abra uma nova a partir do Inbox.`}
            />
          ) : (
            <SalesHubChat
              key={activeConversation.id}
              conversationId={activeConversation.id}
              conversationStatus={activeConversation.status}
              lastInboundAt={activeConversation.lastInboundAt ?? null}
              contactId={activeContactId}
              contactName={activeDeal.contact?.name ?? activeDeal.title ?? ""}
              contactPhone={activeDeal.contact?.phone ?? null}
              contactChannel={
                activeConversation.channel ?? activeDeal.channel ?? null
              }
              dealId={activeDeal.id}
              pipelineId={pipelineId}
              currentAssigneeId={activeConversation.assignedToId ?? null}
              onConversationReopened={handleConversationReopened}
              headerActionsSlot={
                <>
                  <DealOutcomeButtons
                    deal={activeDeal}
                    pipelineId={pipelineId}
                    className="shrink-0"
                  />
                  {contactConversations.length > 1 ? (
                    <TooltipHost label="Conversas do contato" side="bottom">
                      <button
                        type="button"
                        aria-label="Conversas do contato"
                        onClick={() => setConvListOpen(true)}
                        className="flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
                      >
                        <MessagesIcon className="size-4" strokeWidth={1.7} />
                      </button>
                    </TooltipHost>
                  ) : null}
                  <TooltipHost label="Detalhes do negócio" side="bottom">
                    <button
                      type="button"
                      aria-label="Detalhes do negócio"
                      aria-pressed={detailsOpen}
                      onClick={() => setDetailsOpen((v) => !v)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full transition-colors",
                        detailsOpen
                          ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]",
                      )}
                    >
                      <Briefcase className="size-4" strokeWidth={1.7} />
                    </button>
                  </TooltipHost>
                  <ConversationActionsMenu
                    conversationId={activeConversation.id}
                    contactId={activeContactId}
                    isResolved={activeConversation.status === "RESOLVED"}
                    assigneeId={activeConversation.assignedToId ?? null}
                    onResolved={() => {
                      queryClient.invalidateQueries({
                        queryKey: [
                          "saleshub-contact-conversations",
                          activeContactId,
                        ],
                      });
                    }}
                    onReopenNewConversation={handleConversationReopened}
                  />
                  <TooltipHost label="Fechar conversa" side="bottom">
                    <button
                      type="button"
                      aria-label="Fechar conversa"
                      onClick={handleDeselectDeal}
                      className="flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
                    >
                      <X className="size-4" strokeWidth={1.7} />
                    </button>
                  </TooltipHost>
                </>
              }
            />
          )}
        </div>

        {/* Coluna 3 — CRM inline (DealDetailPanel crmOnly): comprime o chat,
            sem Sheet/scrim. Abre via briefcase ou mouse leave na borda direita. */}
        {activeDeal && detailsOpen ? (
          <aside
            className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md md:min-w-[280px]"
            aria-label="Detalhes do negócio"
          >
            <header className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-left">
              <h2 className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                Detalhes do negócio
              </h2>
              <TooltipHost label="Excluir negócio" side="bottom">
                <button
                  type="button"
                  aria-label="Excluir negócio"
                  onClick={() => void handleDeleteDealFromHub()}
                  className="ml-auto flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]"
                >
                  <Trash className="size-4" />
                </button>
              </TooltipHost>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setDetailsOpen(false)}
                className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden bg-[var(--glass-bg)]">
              <DealDetailPanel
                crmOnly
                isOpen={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                deal={detailDeal}
                customFieldsSlot={customFieldsSlot}
                contactFieldConfigSlot={contactFieldConfigSlot}
                dealFieldConfigSlot={dealFieldConfigSlot}
              />
            </div>
          </aside>
        ) : null}
      </div>

      <Dialog open={convListOpen} onOpenChange={setConvListOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conversas do contato</DialogTitle>
          </DialogHeader>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {contactConversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--glass-bg-strong)]",
                    c.id === activeConversation?.id &&
                      "bg-[var(--color-enterprise-bg)] font-medium text-[var(--brand-primary)]",
                  )}
                  onClick={() => {
                    setPickedConversationId(c.id);
                    setConvListOpen(false);
                  }}
                >
                  <span className="font-medium capitalize">{c.channel}</span>
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    · {c.status}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {new Date(c.updatedAt).toLocaleString("pt-BR")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {confirmDeleteDialog}
    </div>
  );
}
