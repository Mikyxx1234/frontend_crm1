"use client";

import { apiUrl } from "@/lib/api";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageSquareOff, Search, X } from "lucide-react";

import type { BoardStage } from "@/components/pipeline/kanban-board";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import { StageRibbon } from "@/components/sales-hub/stage-ribbon";
import {
  DealQueue,
  DealQueueSortMenu,
  filterDealsForQueueSearch,
  type DealQueueSortMode,
} from "@/components/sales-hub/deal-queue";
import { ChatWindow } from "@/components/inbox/chat-window";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import type { TransferControlUser } from "@/components/inbox/transfer-control";
import { DealOutcomeButtons } from "@/components/sales-hub/deal-actions";
import { DealWorkspaceToolbarMenuItems } from "@/components/pipeline/deal-workspace/header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, pipelineDealMatchesSearch } from "@/lib/utils";

/**
 * ConversationItem mínimo que o SalesHub precisa pra resolver a conversa
 * ativa a partir do `contactId` do deal selecionado.
 *
 * Inclui `assignedToId` e `tags` porque o `ConversationHeader` unificado
 * (compartilhado com o Inbox) precisa renderizar o botão de transferir
 * com o responsável atual destacado e o `TagPopover` com as tags atuais
 * da conversa. Antes esse DTO era ainda mais enxuto (id + channel +
 * status + updatedAt) — quando o header era específico do SalesHub
 * (`SalesHubChatHeader`, deletado) ele não precisava dessa info.
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
  // DNA Chat: fundo branco, ícone neutro sem cartão, tipografia
  // hierarquia 16/13. Sem borders/cards dentro do empty.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-white p-8">
      <MessageSquareOff
        className="size-7 text-slate-300"
        strokeWidth={1.5}
      />
      <p className="text-[16px] font-semibold tracking-tight text-slate-800">
        {title}
      </p>
      <p className="max-w-xs text-center text-[13px] text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

type StatusFilter = "OPEN" | "WON" | "LOST" | "ALL";

type SalesHubViewProps = {
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
  searchQuery?: string;
  filterAgent?: string;
  filterStage?: string;
  filterMsg?: "all" | "unread" | "no-reply";
  filterOverdue?: boolean;
  /** Abre o `DealWorkspace` (ex.: link “deal completo” na fila). */
  onOpenFullDeal?: (dealId: string) => void;
  /** Busca da fila (campo acima dos cards). */
  queueSearch: string;
  onQueueSearchChange: (value: string) => void;
  sortMode: DealQueueSortMode;
  onSortModeChange: (mode: DealQueueSortMode) => void;
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
  queueSearch,
  onQueueSearchChange,
  sortMode,
  onSortModeChange,
}: SalesHubViewProps) {
  // IMPORTANTE: NAO usar o searchParam "?deal=" aqui.
  //
  // O `client-page.tsx` (pai) monitora `?deal=` e abre o <DealDetail>
  // sheet em cima da tela sempre que esse param muda. Se o Sales Hub
  // tambem gravasse `?deal=` na URL, clicar em qualquer card dispararia
  // o modal de DealDetail, causando o bug relatado pelo operador
  // ("outra pagina e chamada quando clico no card"). Por isso toda a
  // selecao aqui vive APENAS em estado local — sem tocar no router
  // e sem `window.history.replaceState` ou `pushState`.
  //
  // Trade-off conhecido: o deal ativo no Sales Hub nao e compartilhavel
  // via URL (diferente do Kanban). Se for necessario no futuro, a forma
  // correta e adotar um param proprio (ex: `?shdeal=`) e filtrar no
  // `client-page.tsx` pra nao abrir o DealDetail nesse caso.
  const searchParams = useSearchParams();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [recentlyMovedDealId, setRecentlyMovedDealId] = useState<string | null>(
    null,
  );
  // Seleção inicial: apenas no primeiro mount, se houver `?deal=` na URL
  // (ex: deep link vindo de uma mensagem de notificação), usamos pra
  // pre-selecionar o deal. Depois disso, nunca mais olhamos a URL.
  const [activeDealId, setActiveDealId] = useState<string | null>(() => {
    const dealParam = searchParams.get("deal");
    if (!dealParam) return null;
    const allDeals = stages.flatMap((s) => s.deals);
    const match = allDeals.find(
      (d) => d.id === dealParam || String(d.number) === dealParam,
    );
    return match?.id ?? null;
  });

  const [pickedConversationId, setPickedConversationId] = useState<
    string | null
  >(null);
  const [convListOpen, setConvListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("conversations");
  const hubChatSearchRef = useRef<{ open: () => void } | null>(null);

  useEffect(() => {
    setPickedConversationId(null);
  }, [activeDealId]);

  useEffect(() => {
    setActiveTab("conversations");
  }, [activeDealId, pickedConversationId]);

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

  const visibleDeals = useMemo(
    () => filterDealsForQueueSearch(sortedDeals, queueSearch),
    [sortedDeals, queueSearch],
  );

  const totalDeals = filteredStages.reduce(
    (sum, s) => sum + s.deals.length,
    0,
  );

  const activeDeal = sortedDeals.find((d) => d.id === activeDealId) ?? null;

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

  const hubHeaderTags = useMemo(() => {
    const fromConv = activeConversation?.tags?.map((t) => ({
      name: t.name,
      color: t.color,
    }));
    if (fromConv && fromConv.length > 0) return fromConv;
    return activeDeal?.tags?.map((t) => ({ name: t.name, color: t.color })) ?? [];
  }, [activeConversation, activeDeal]);

  // ────────────────────────────────────────────────────────────────────
  //  Atribuição / transferência de responsável
  // ────────────────────────────────────────────────────────────────────
  // `DealWorkspaceToolbarMenuItems` + `TransferControl` precisam das mesmas
  // props que o Inbox passava ao `ConversationHeader`.
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const myUserId = (sessionData?.user as { id?: string } | undefined)?.id;
  const myRole = (sessionData?.user as { role?: "ADMIN" | "MANAGER" | "MEMBER" } | undefined)?.role;
  const canManageAssignee = myRole === "ADMIN" || myRole === "MANAGER";

  const { data: teamUsers = [] } = useQuery<TransferControlUser[]>({
    queryKey: ["users", "assign-picker"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar equipe");
      }
      return Array.isArray(data) ? data : [];
    },
    enabled: canManageAssignee && !!activeConversation,
    staleTime: 60_000,
  });

  const [assignLoading, setAssignLoading] = useState(false);
  const assignConversation = useCallback(
    async (assignedToId: string | null) => {
      if (!activeConversation) return;
      const convId = activeConversation.id;
      setAssignLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/conversations/${convId}/actions`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assign", assignedToId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(
            typeof data?.message === "string"
              ? data.message
              : "Não foi possível atualizar a atribuição.",
          );
          return;
        }
        // Otimistic update no cache da query de conversas do contato.
        queryClient.setQueryData<ConversationRow[]>(
          ["saleshub-contact-conversations", activeContactId],
          (prev) =>
            prev?.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    assignedToId: data.conversation?.assignedToId ?? null,
                    assignedTo: data.conversation?.assignedTo ?? null,
                  }
                : c,
            ) ?? prev,
        );
        // Invalida o board pra refletir a herança Conversation→Deal.
        queryClient.invalidateQueries({ queryKey: ["board", pipelineId] });
        queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      } finally {
        setAssignLoading(false);
      }
    },
    [activeConversation, activeContactId, pipelineId, queryClient],
  );

  const handleSelectDeal = useCallback((dealId: string) => {
    // Estado puramente local — vide comentario no top do componente
    // sobre o motivo de NAO mexer na URL aqui.
    setActiveDealId(dealId);
  }, []);

  const handleSelectStage = useCallback((stageId: string | null) => {
    setSelectedStageId(stageId);
  }, []);

  const handleDeselectDeal = useCallback(() => {
    setActiveDealId(null);
  }, []);

  const handleDealMoved = useCallback((dealId: string) => {
    // Highlight visual por 1.5s pra sinalizar o "salto" entre etapas.
    setRecentlyMovedDealId(dealId);
    const t = setTimeout(() => setRecentlyMovedDealId(null), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleDeleteDealFromHub = useCallback(async () => {
    if (!activeDeal) return;
    if (
      !window.confirm(
        "Excluir este negócio? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }
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
  }, [activeDeal, handleDeselectDeal, pipelineId, queryClient]);

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

  // ────────────────────────────────────────────────────────────────────
  // Navegacao por teclado — faz o Sales Hub ser 100% navegavel sem sair
  // da tela:
  //   ↑ / ↓  →  navega entre cards da Fila (seleciona o deal anterior/proximo)
  //   ← / →  →  navega entre etapas do funil (filtra a Fila)
  //   Esc    →  deseleciona o deal ativo (volta ao estado inicial)
  //
  // Ignora a key se o foco estiver em input/textarea/contenteditable pra
  // nao conflitar com a busca da fila ou com a digitacao no ChatWindow.
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
        if (activeDealId) {
          e.preventDefault();
          handleDeselectDeal();
        }
        return;
      }

      // ↑ / ↓ — navega entre cards da fila
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (visibleDeals.length === 0) return;
        e.preventDefault();
        const curIdx = visibleDeals.findIndex((d) => d.id === activeDealId);
        const step = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx =
          curIdx < 0
            ? e.key === "ArrowDown"
              ? 0
              : visibleDeals.length - 1
            : Math.max(0, Math.min(visibleDeals.length - 1, curIdx + step));
        const nextDeal = visibleDeals[nextIdx];
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
        setSelectedStageId(ids[nextIdx] ?? null);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeDealId,
    handleDeselectDeal,
    handleSelectDeal,
    visibleDeals,
    filteredStages,
    selectedStageId,
  ]);

  const hubChromeCompact = false;

  return (
    // DNA Chat: root branco, sem fundo cinza nem cartões flutuando.
    // Estrutura "split view" — sidebar | divisor 1px | chat — exatamente
    // como o Inbox (lista de conversas | ChatWindow). Sem padding ao
    // redor, sem gaps, sem shadows. Hierarquia vem de tipografia +
    // divisores hairline (slate-100), não de cartões empilhados.
    <div ref={rootRef} className="flex h-full flex-col bg-white" tabIndex={-1}>
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
            ? "grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] md:grid-rows-1"
            : "flex",
        )}
      >
        {/* Coluna 1 — Fila: grid com coluna fixa estreita quando há deal
            ativo (mesma ideia do DealWorkspace: sidebar | chat flexível).
            Mobile: fila 100% até selecionar deal. */}
        <div
          className={cn(
            "flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-white",
            activeDeal
              ? "hidden min-w-0 md:flex"
              : "w-full md:w-[300px] md:shrink-0 xl:w-[340px]",
          )}
        >
          <div className="shrink-0 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-[var(--color-bg-subtle)] px-2.5">
                <Search
                  className="size-3 shrink-0 text-[var(--color-ink-muted)]"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => onQueueSearchChange(e.target.value)}
                  placeholder="Buscar deal..."
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground placeholder:text-[var(--color-ink-muted)] outline-none"
                  aria-label="Buscar deal na fila"
                />
                {queueSearch ? (
                  <button
                    type="button"
                    onClick={() => onQueueSearchChange("")}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                    aria-label="Limpar busca"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>
              <DealQueueSortMenu
                sortMode={sortMode}
                onSortModeChange={onSortModeChange}
                iconOnly
              />
            </div>
          </div>

          <DealQueue
            deals={visibleDeals}
            stages={filteredStages}
            activeDealId={activeDealId}
            onSelectDeal={handleSelectDeal}
            onDeselect={handleDeselectDeal}
            recentlyMovedDealId={recentlyMovedDealId}
            pipelineId={pipelineId}
            statusFilter={statusFilter}
            onMoved={handleDealMoved}
            onOpenFullDeal={onOpenFullDeal}
          />
        </div>

        {/* Coluna 2 — Chat compacto (compactChrome) + barra mínima de ações.
            Mobile: hidden quando nenhum deal está ativo — a fila ocupa
            100% até o operador escolher um deal. */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white",
            !activeDeal && "hidden md:flex",
          )}
        >
          {!activeDeal ? (
            <SalesHubChatEmptyState
              title="Selecione um deal"
              subtitle="Escolha um card da fila ao lado para abrir a conversa do cliente."
            />
          ) : !activeContactId ? (
            <SalesHubChatEmptyState
              title="Deal sem contato"
              subtitle="Este deal nao tem contato vinculado — atribua um contato para iniciar a conversa."
            />
          ) : (
            <>
              <ConversationHeader
                contactId={activeContactId}
                contactName={
                  activeDeal.contact?.name ?? activeDeal.title ?? ""
                }
                contactPhone={activeDeal.contact?.phone ?? null}
                contactHref={
                  activeContactId ? `/contacts/${activeContactId}` : null
                }
                contactChannel={
                  activeConversation?.channel ?? activeDeal.channel ?? null
                }
                tags={hubHeaderTags}
                conversationId={activeConversation?.id ?? null}
                conversationChannel={
                  activeConversation?.channel ?? activeDeal.channel ?? null
                }
                canManageAssignee={canManageAssignee}
                myUserId={myUserId}
                currentAssigneeId={activeConversation?.assignedToId ?? null}
                teamUsers={teamUsers}
                assignLoading={assignLoading}
                onAssign={(uid) => void assignConversation(uid)}
                onTagsUpdated={() => {
                  queryClient.invalidateQueries({
                    queryKey: [
                      "saleshub-contact-conversations",
                      activeContactId,
                    ],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["inbox-conversations"],
                  });
                }}
                actionsSlot={
                  <DealOutcomeButtons
                    deal={activeDeal}
                    pipelineId={pipelineId}
                  />
                }
                overflowMenu={
                  <DealWorkspaceToolbarMenuItems
                    conversationId={activeConversation?.id ?? null}
                    conversationChannel={activeConversation?.channel ?? null}
                    contactId={activeDeal.contact?.id ?? null}
                    contactName={
                      activeDeal.contact?.name ?? activeDeal.title
                    }
                    canManageAssignee={canManageAssignee}
                    myUserId={myUserId}
                    currentAssigneeId={
                      activeConversation?.assignedToId ?? null
                    }
                    teamUsers={teamUsers}
                    assignLoading={assignLoading}
                    onAssign={(uid) => void assignConversation(uid)}
                    tags={
                      (activeConversation?.tags?.map((t) => ({
                        name: t.name,
                        color: t.color,
                      })) ??
                        activeDeal.tags?.map((t) => ({
                          name: t.name,
                          color: t.color,
                        }))) ??
                      []
                    }
                    onTagsUpdated={() => {
                      queryClient.invalidateQueries({
                        queryKey: [
                          "saleshub-contact-conversations",
                          activeContactId,
                        ],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["inbox-conversations"],
                      });
                    }}
                    onEdit={() => onOpenFullDeal?.(activeDeal.id)}
                    onDelete={handleDeleteDealFromHub}
                  />
                }
                onOpenConversationList={
                  contactConversations.length > 1
                    ? () => setConvListOpen(true)
                    : undefined
                }
                onSearch={() => hubChatSearchRef.current?.open()}
                onClose={handleDeselectDeal}
                tabs={[
                  { key: "conversations", label: "Conversa" },
                  { key: "activities", label: "Atividades" },
                  { key: "notes", label: "Notas" },
                  { key: "timeline", label: "Timeline" },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
              {conversationsLoading ? (
                <div className="flex flex-1 items-center justify-center bg-[var(--color-chat-bg)]">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !activeConversation ? (
                <SalesHubChatEmptyState
                  title="Sem conversa aberta"
                  subtitle={`${activeDeal.contact?.name ?? "Este contato"} ainda nao tem nenhuma conversa. Abra uma nova a partir do Inbox.`}
                />
              ) : activeTab !== "conversations" ? (
                <div className="flex flex-1 items-center justify-center bg-[var(--color-chat-bg)] px-6 text-center text-[13px] text-[var(--color-ink-muted)]">
                  Em breve
                </div>
              ) : (
                <ChatWindow
                  key={activeConversation.id}
                  conversationId={activeConversation.id}
                  conversationStatus={activeConversation.status}
                  contactId={activeContactId}
                  compactChrome
                  inConversationSearchRef={hubChatSearchRef}
                />
              )}
            </>
          )}
        </div>

        {/* Coluna 3 (REMOVIDA)
            O antigo DealCrmPanel foi migrado pra dentro do card ativo
            na Fila (esquerda) via <DealActions>. Contato = pessoa com
            telefone + e-mail + tags. Ganho/Perdido e mudar etapa moram
            no próprio card agora. */}
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
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-subtle)]",
                    c.id === activeConversation?.id &&
                      "bg-primary/10 font-medium text-primary",
                  )}
                  onClick={() => {
                    setPickedConversationId(c.id);
                    setConvListOpen(false);
                  }}
                >
                  <span className="font-medium capitalize">{c.channel}</span>
                  <span className="text-[var(--color-ink-muted)]">
                    {" "}
                    · {c.status}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                    {new Date(c.updatedAt).toLocaleString("pt-BR")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
