"use client";

import { apiUrl } from "@/lib/api";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageSquareOff } from "lucide-react";

import type { BoardStage } from "@/components/pipeline/kanban-board";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import { StageRibbon } from "@/components/sales-hub/stage-ribbon";
import { DealQueue } from "@/components/sales-hub/deal-queue";
import { ChatWindow } from "@/components/inbox/chat-window";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import type { TransferControlUser } from "@/components/inbox/transfer-control";
import { DealOutcomeButtons } from "@/components/sales-hub/deal-actions";
import { DealHistoryButton } from "@/components/pipeline/deal-history-button";
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
  // Modo de ordenação da fila. Persiste na sessão via localStorage pra o
  // operador não precisar reescolher toda vez que troca de página.
  //   - message_new:  última mensagem (qualquer direção) mais recente primeiro
  //   - message_old:  última mensagem mais antiga primeiro (quem está na fila há mais tempo)
  //   - created_new:  deal criado mais recentemente primeiro (leads novos)
  //   - created_old:  deal mais antigo primeiro (fila tradicional)
  const [sortMode, setSortMode] = useState<
    "message_new" | "message_old" | "created_new" | "created_old"
  >(() => {
    if (typeof window === "undefined") return "message_new";
    const saved = window.localStorage.getItem("sales-hub:sort-mode");
    if (
      saved === "message_new" ||
      saved === "message_old" ||
      saved === "created_new" ||
      saved === "created_old"
    ) {
      return saved;
    }
    return "message_new";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sales-hub:sort-mode", sortMode);
  }, [sortMode]);
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
  const activeConversation = contactConversations[0] ?? null;

  // ────────────────────────────────────────────────────────────────────
  //  Atribuição / transferência de responsável
  // ────────────────────────────────────────────────────────────────────
  // O ConversationHeader unificado precisa das mesmas props que o Inbox
  // passa pra renderizar o botão "Transferir conversa". Replicamos aqui
  // a query de equipe + a função `assignConversation` (forma mais simples
  // que extrair pra hook compartilhado, dado que são poucas linhas e não
  // queremos acoplar tudo num hook de "inbox" reusado pelo SalesHub).
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
        setSelectedStageId(ids[nextIdx] ?? null);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeDealId,
    handleDeselectDeal,
    handleSelectDeal,
    sortedDeals,
    filteredStages,
    selectedStageId,
  ]);

  const activeStage = activeDeal
    ? stages.find((s) => s.id === activeDeal.stageId)
    : undefined;

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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Coluna 1 — Fila de deals (420px). Divisor 1px à direita
            substitui o gap+cartão anterior. Mesmo padrão da
            ConversationList no Inbox.
            Mobile: ocupa 100% e desaparece quando um deal é selecionado
            (`activeDeal`). O chat then fills full width with back button. */}
        <div
          className={cn(
            "shrink-0 overflow-hidden border-r border-slate-100 bg-white md:w-[380px] xl:w-[420px]",
            activeDeal ? "hidden md:block" : "w-full md:shrink-0",
          )}
        >
          <DealQueue
            deals={sortedDeals}
            stages={filteredStages}
            activeDealId={activeDealId}
            onSelectDeal={handleSelectDeal}
            onDeselect={handleDeselectDeal}
            recentlyMovedDealId={recentlyMovedDealId}
            pipelineId={pipelineId}
            statusFilter={statusFilter}
            onMoved={handleDealMoved}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
          />
        </div>

        {/* Coluna 2 — Chat. Ocupa toda a largura restante, sem cartão
            envolvendo: o ChatWindow já tem o próprio layout. Plano,
            sem shadows, sem rounding externo.
            Mobile: hidden quando nenhum deal está ativo — a fila ocupa
            100% até o operador escolher um deal. */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col overflow-hidden bg-white",
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
          ) : conversationsLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
          ) : !activeConversation ? (
            <>
              {/* Sem conversa: header sem chip de voz/transferir/tags
                  (esses controles dependem de `conversationId`). Mantém
                  só identidade + chip de etapa + Ganho/Perdido + X. */}
              <ConversationHeader
                contactId={activeDeal.contact?.id}
                contactName={activeDeal.contact?.name ?? activeDeal.title}
                contactEmail={activeDeal.contact?.email}
                contactPhone={activeDeal.contact?.phone}
                contactAvatarUrl={activeDeal.contact?.avatarUrl}
                contactChannel={activeDeal.channel}
                contactHref={
                  activeDeal.contact?.id
                    ? `/contacts/${activeDeal.contact.id}`
                    : null
                }
                tags={activeDeal.tags}
                stageName={activeStage?.name ?? "—"}
                stageColor={activeStage?.color}
                actions={
                  <div className="flex items-center gap-1.5">
                    <DealHistoryButton
                      dealId={activeDeal.id}
                      dealTitle={activeDeal.title}
                    />
                    <DealOutcomeButtons
                      deal={activeDeal}
                      pipelineId={pipelineId}
                    />
                  </div>
                }
                onBack={handleDeselectDeal}
                onClose={handleDeselectDeal}
              />
              <SalesHubChatEmptyState
                title="Sem conversa aberta"
                subtitle={`${activeDeal.contact?.name ?? "Este contato"} ainda nao tem nenhuma conversa. Abra uma nova a partir do Inbox.`}
              />
            </>
          ) : (
            <>
              {/* Header completo: idêntico ao do Inbox + slot de
                  Ganho/Perdido (DealOutcomeButtons) entre o TagPopover
                  e o X. Voz, transferir e tags ficam ativos porque
                  `conversationId` está presente. */}
              <ConversationHeader
                contactId={activeDeal.contact?.id}
                contactName={activeDeal.contact?.name ?? activeDeal.title}
                contactEmail={activeDeal.contact?.email}
                contactPhone={activeDeal.contact?.phone}
                contactAvatarUrl={activeDeal.contact?.avatarUrl}
                contactChannel={activeDeal.channel}
                contactHref={
                  activeDeal.contact?.id
                    ? `/contacts/${activeDeal.contact.id}`
                    : null
                }
                tags={activeConversation.tags ?? activeDeal.tags}
                stageName={activeStage?.name ?? "—"}
                stageColor={activeStage?.color}
                conversationId={activeConversation.id}
                conversationChannel={activeConversation.channel}
                canManageAssignee={canManageAssignee}
                myUserId={myUserId}
                currentAssigneeId={activeConversation.assignedToId}
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
                actions={
                  <div className="flex items-center gap-1.5">
                    <DealHistoryButton
                      dealId={activeDeal.id}
                      dealTitle={activeDeal.title}
                    />
                    <DealOutcomeButtons
                      deal={activeDeal}
                      pipelineId={pipelineId}
                    />
                  </div>
                }
                onBack={handleDeselectDeal}
                onClose={handleDeselectDeal}
              />
              <ChatWindow
                key={activeConversation.id}
                conversationId={activeConversation.id}
                conversationStatus={activeConversation.status}
                contactId={activeContactId}
              />
            </>
          )}
        </div>

        {/* Coluna 3 (REMOVIDA)
            O antigo DealCrmPanel foi migrado pra dentro do card ativo
            na Fila (esquerda) via <DealActions>. Contato = pessoa com
            telefone + e-mail + tags. Ganho/Perdido e mudar etapa moram
            no próprio card agora. */}
      </div>
    </div>
  );
}
