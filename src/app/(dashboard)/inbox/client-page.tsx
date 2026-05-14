"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsLeft, SquareCheck as CheckSquare, MessageSquare, X } from "lucide-react";
import { AnimatePresence, MotionDiv } from "@/components/ui/motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { ChannelBadge } from "@/components/inbox/channel-badge";
import { ChatWindow } from "@/components/inbox/chat-window";
import {
  ConversationList,
  InboxListHeader,
  type ConversationListRow,
  type InboxTab,
} from "@/components/inbox/conversation-list";
import { useSSE } from "@/hooks/use-sse";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import { InboxFilterBar, type InboxFilters } from "@/components/inbox/inbox-filters";
import { ContactDealSidebar } from "@/components/inbox/contact-deal-sidebar";
import { RemindButton } from "@/components/inbox/remind-button";
import { TransferControl } from "@/components/inbox/transfer-control";
import { WhatsappCallChip } from "@/components/inbox/whatsapp-call-chip";
import { DealForm } from "@/components/pipeline/deal-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipHost } from "@/components/ui/tooltip";
import {
  listAllowedInboxTabsForUser,
  type ScopeGrants,
} from "@/lib/authz/scope-grants-shared";
import { cn } from "@/lib/utils";

type PipelineListItem = { id: string; name: string; isDefault?: boolean };
type BoardStage = { id: string; name: string };

async function fetchPipelines(): Promise<PipelineListItem[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro");
  return Array.isArray(data) ? data : data.pipelines ?? data.items ?? [];
}
async function fetchBoard(pipelineId: string): Promise<BoardStage[]> {
  // Mant\u00e9m o mesmo formato de URL e query key usados em
  // `pipeline/client-page.tsx` (`?status=OPEN`) pra invalida\u00e7\u00e3o
  // cruzada com o Kanban / Sales Hub funcionar via prefix-match
  // do React Query.
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/board?status=OPEN`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro");
  return Array.isArray(data) ? data : data.stages ?? [];
}
async function fetchTabCounts(): Promise<Record<InboxTab, number>> {
  const res = await fetch(apiUrl("/api/conversations?counts=1"));
  if (!res.ok) {
    return {
      todos: 0,
      entrada: 0,
      esperando: 0,
      respondidas: 0,
      automacao: 0,
      finalizados: 0,
      erro: 0,
    };
  }
  return res.json();
}

const statusLabels: Record<string, string> = { OPEN: "Aberto", RESOLVED: "Resolvido", PENDING: "Pendente", SNOOZED: "Adiado" };

type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

type TeamUser = { id: string; name: string; email: string };

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data: sessionData, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const myUserId = (sessionData?.user as { id?: string })?.id;
  const myRole = (sessionData?.user as { role?: "ADMIN" | "MANAGER" | "MEMBER" })?.role;
  const canManageAssignee = myRole === "ADMIN" || myRole === "MANAGER";
  const { data: permPanel } = useQuery({
    queryKey: ["settings-permissions-panel"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/settings/permissions"));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro");
      return data as { scopeGrants?: ScopeGrants };
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const allowedTabKeys = React.useMemo<InboxTab[]>(() => {
    const grants = permPanel?.scopeGrants ?? {};
    return listAllowedInboxTabsForUser({ grants, role: myRole ?? null });
  }, [permPanel?.scopeGrants, myRole]);

  const [tab, setTab] = React.useState<InboxTab>("entrada");
  const [selected, setSelected] = React.useState<ConversationListRow | null>(null);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    if (allowedTabKeys.length > 0 && !allowedTabKeys.includes(tab)) {
      setTab(allowedTabKeys[0] ?? "esperando");
    }
  }, [allowedTabKeys, tab]);
  const [dealOpen, setDealOpen] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<InboxFilters>({});
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [assignLoading, setAssignLoading] = React.useState(false);
  /** Tabs do header petróleo (Conversa / Atividades / …). */
  const [conversationDetailTab, setConversationDetailTab] = React.useState("chat");

  // Painel direito (CRM/Lead): colapsavel, com estado persistido em
  // localStorage. Dá prioridade pra area de chat quando o operador precisa
  // de mais espaco. Default = aberto (preserva o comportamento atual).
  //
  // Usa lazy init pra evitar read de localStorage em SSR/hydration,
  // e sync back no primeiro mount pra refletir o valor persistido.
  const [rightPanelOpen, setRightPanelOpen] = React.useState(true);
  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem("inbox-right-panel-open");
      if (v === "0") setRightPanelOpen(false);
    } catch {
      // localStorage bloqueado (private mode) — mantem default.
    }
  }, []);
  const toggleRightPanel = React.useCallback(() => {
    setRightPanelOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("inbox-right-panel-open", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const inboxConversationSearchRef = React.useRef<{ open: () => void } | null>(null);

  React.useEffect(() => {
    setConversationDetailTab("chat");
  }, [selected?.id]);

  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const exitSelectionMode = React.useCallback(() => { setSelectionMode(false); setSelectedIds(new Set()); }, []);
  const selectAll = React.useCallback((allIds: string[]) => { setSelectedIds(new Set(allIds)); }, []);

  const { data: myStatus } = useQuery<{ status: AgentOnlineStatus }>({
    queryKey: ["my-agent-status", myUserId],
    queryFn: async () => { const r = await fetch(apiUrl(`/api/agents/${myUserId}/status`)); return r.json(); },
    enabled: !!myUserId, refetchInterval: 60_000,
  });
  const myAgentStatus: AgentOnlineStatus = myStatus?.status ?? "OFFLINE";

  // Capacidade real do agente — N de M conversas OPEN atribuídas. Refetch a
  // cada 30s para acompanhar atribuições/resoluções em tempo quase real sem
  // sobrecarregar o backend (é um COUNT indexado).
  type AgentCapacity = {
    activeConversations: number;
    maxConcurrent: number;
    loadPct: number;
    tone: "healthy" | "busy" | "overloaded";
  };
  const { data: agentCapacity, isLoading: agentCapacityLoading } = useQuery<AgentCapacity>({
    queryKey: ["agent-capacity", myUserId],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/inbox/agent-capacity"));
      if (!res.ok) throw new Error("capacity");
      return res.json();
    },
    enabled: !!myUserId && isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const bulkAction = React.useCallback(async (action: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch(apiUrl("/api/conversations/bulk"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], action }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        exitSelectionMode();
      }
    } finally { setBulkLoading(false); }
  }, [selectedIds, queryClient, exitSelectionMode]);

  const {
    data: counts = {
      todos: 0,
      entrada: 0,
      esperando: 0,
      respondidas: 0,
      automacao: 0,
      finalizados: 0,
      erro: 0,
    },
  } =
    useQuery({ queryKey: ["conversations", "tab-counts"], queryFn: fetchTabCounts, refetchInterval: 15_000, enabled: isAuthenticated });

  // ── Tempo real: SSE invalida lista + contadores imediatamente ──
  // Antes desta integracao, lista (`inbox-conversations`) so rodava a cada
  // 20s e contadores (`tab-counts`) a cada 15s, dando ao operador a sensacao
  // de "delay" pra mover conversa entre tabs apos resposta. Agora qualquer
  // evento que altera estado de conversa invalida ambas as queries — a UI
  // reflete em <1s. Mantemos o polling como fallback caso o SSE caia.
  //
  // Throttle: invalidacoes em rajada (e.g. webhook spammando new_message
  // por 5 mensagens seguidas) causariam refetch redundante. Coalescemos
  // todas as invalidacoes em um unico flush de ate 250ms.
  const invalidateRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleInboxRefresh = React.useCallback(() => {
    if (invalidateRef.current) return;
    invalidateRef.current = setTimeout(() => {
      invalidateRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", "tab-counts"] });
    }, 250);
  }, [queryClient]);

  React.useEffect(() => {
    return () => {
      if (invalidateRef.current) {
        clearTimeout(invalidateRef.current);
        invalidateRef.current = null;
      }
    };
  }, []);

  useSSE(
    "/api/sse/messages",
    React.useCallback(
      (event) => {
        // Eventos que afetam tab/lista: nova msg (in/out), status (sent/read/failed),
        // updates de conversa (assign, finalizar, hasError flip).
        if (
          event === "new_message" ||
          event === "message_status" ||
          event === "conversation_updated"
        ) {
          scheduleInboxRefresh();
        }
      },
      [scheduleInboxRefresh],
    ),
    isAuthenticated,
  );

  const { data: teamUsers = [] } = useQuery<TeamUser[]>({
    queryKey: ["users", "assign-picker"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar equipe");
      }
      return Array.isArray(data) ? data : [];
    },
    enabled: canManageAssignee && !!selected,
    staleTime: 60_000,
  });

  const assignConversation = React.useCallback(
    async (assignedToId: string | null) => {
      if (!selected) return;
      const convId = selected.id;
      setAssignLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/conversations/${convId}/actions`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assign", assignedToId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof data?.message === "string" ? data.message : "Não foi possível atualizar a atribuição.");
          return;
        }
        const c = data.conversation as {
          assignedToId: string | null;
          assignedTo: { id: string; name: string; email: string } | null;
        };
        setSelected((s) =>
          s && s.id === convId
            ? { ...s, assignedToId: c.assignedToId, assignedTo: c.assignedTo }
            : s,
        );
        queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      } finally {
        setAssignLoading(false);
      }
    },
    [selected, queryClient],
  );

  const [pipelineId, setPipelineId] = React.useState("");
  const { data: pipelines = [] } = useQuery({ queryKey: ["pipelines"], queryFn: fetchPipelines, enabled: isAuthenticated });
  React.useEffect(() => {
    if (!pipelineId && pipelines.length > 0) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      if (def) setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);
  const { data: board = [] } = useQuery({
    // Key 3-segmentos id\u00eantica \u00e0 do Pipeline (`["pipeline-board", id, status]`)
    // \u2014 garante cache compartilhado quando ambas as p\u00e1ginas est\u00e3o
    // abertas (criar deal aqui invalida o board do pipeline e vice-versa).
    queryKey: ["pipeline-board", pipelineId, "OPEN"],
    queryFn: () => fetchBoard(pipelineId),
    enabled: dealOpen && !!pipelineId,
  });
  const stageOptionsForForm = board.map((s) => ({ id: s.id, name: s.name }));

  React.useEffect(() => { setSelected(null); exitSelectionMode(); }, [tab, exitSelectionMode]);

  return (
    // Wrapper full-bleed: anula EXATAMENTE o `p-3 sm:p-4 md:p-8` do <main> da
    // DashboardShell em todos os breakpoints. Antes usavamos `md:-mt-2`,
    // que sobrava 24px no topo e empurrava o titulo "Conversas" pra ~24px
    // abaixo das paginas standard. Quem controla o spacing agora e o
    // pt interno do header (md:pt-8 logo abaixo).
    <div className="-mx-3 -mt-3 flex min-h-0 flex-1 flex-col overflow-hidden sm:-mx-4 sm:-mt-4 md:-mx-8 md:-mt-8 md:flex-row">
      {/* ═══════ SIDEBAR: CONVERSATION LIST ═══════
          Largura FIXA em md+: nunca muda em função da tab ativa nem da
          presença/ausência de uma conversa selecionada.
          A curva superior esquerda é renderizada pelo dashboard-shell
          (rounded-tl-[32px]), então este painel mantém cantos retos.
          Sombra DIRECIONAL para a direita (10px 0 30px -15px navy 5%) cria
          a sensação de painel "sobre" a área de chat — Premium Core spec. */}
      <div
        className={cn(
          // Sidebar esquerda (lista de conversas) — largura fixa 300px em md+
          // (libera área central; painel CRM direito permanece conforme layout).
          "flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-[var(--color-bg-subtle)]/60 shadow-[12px_0_36px_-14px_rgba(13,27,62,0.10)] md:h-full md:w-[300px] md:shrink-0 md:grow-0 md:basis-[300px] xl:w-[300px] xl:basis-[300px] 2xl:w-[300px] 2xl:basis-[300px]",
          selected ? "hidden md:flex" : "w-full flex-1",
        )}
      >
        {/* Header compacto — paddings reduzidos vs versao anterior pra
            liberar verticais pra lista de conversas. Title em text-lg
            (era text-2xl/3xl) + badge size-8 + botao + size-9. A sidebar
            agora ocupa ~22% menos altura no header, deixando ate ~3
            cards extra de conversa visiveis acima do fold em monitores
            13"/14". */}
        <InboxListHeader
          search={search}
          onSearchChange={setSearch}
          appliedSearch={debouncedSearch}
          activeTab={tab}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          selectionMode={selectionMode}
          onExitSelectionMode={exitSelectionMode}
          onEnterSelectionMode={() => setSelectionMode(true)}
          counts={counts}
          onTabChange={setTab}
          myUserId={myUserId ?? null}
          sessionUserName={sessionData?.user?.name ?? null}
          sessionUserImage={sessionData?.user?.image ?? null}
          myAgentStatus={myAgentStatus}
          agentCapacity={agentCapacity ?? null}
          agentCapacityLoading={agentCapacityLoading}
        />

        {showFilters && (
          <InboxFilterBar value={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />
        )}

        {/* Bulk actions */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 border-y border-border bg-surface px-4 py-2">
            <span className="text-[12px] font-semibold text-accent">{selectedIds.size} selecionados</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => bulkAction("resolve")} disabled={bulkLoading}
                className="rounded-md bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-surface disabled:opacity-50">
                Finalizar
              </button>
              <button onClick={() => bulkAction("reopen")} disabled={bulkLoading}
                className="rounded-md bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-surface disabled:opacity-50">
                Reabrir
              </button>
              <button type="button" onClick={exitSelectionMode} className="text-muted-foreground hover:text-muted-foreground transition-colors">
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ConversationList
            tab={tab}
            onTabChange={setTab}
            tabCounts={counts}
            allowedTabKeys={allowedTabKeys}
            searchQuery={debouncedSearch}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            filters={filters}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            currentUserId={myUserId ?? null}
          />
        </div>
      </div>

      {/* ═══════ DETAIL AREA ═══════ */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--color-chat-bg)]",
          !selected && "hidden md:flex",
        )}
      >
        {selected ? (
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Chat (centro): só esta coluna rola as mensagens; cabeçalhos fixos */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-chat-bg)]">
              {/*
                Topo unificado (`conversation-header.tsx`): Inbox usa
                `toolbarActions` + chip de voz no lugar do `tel:` e
                `hideOverflowMenu` com fechar na barra; Sales Hub mantém
                overflow com tags e ações de negócio.
              */}
              <ConversationHeader
                contactId={selected.contact.id}
                contactName={selected.contact.name}
                contactPhone={selected.contact.phone}
                contactHref={`/contacts/${selected.contact.id}`}
                contactChannel={selected.channel}
                conversationId={selected.id}
                conversationChannel={selected.channel}
                canManageAssignee={canManageAssignee}
                myUserId={myUserId}
                currentAssigneeId={selected.assignedToId}
                teamUsers={teamUsers}
                assignLoading={assignLoading}
                onAssign={(uid) => void assignConversation(uid)}
                toolbarActions={
                  <>
                    {canManageAssignee || (!selected.assignedToId && myUserId) ? (
                      <TransferControl
                        teamUsers={teamUsers}
                        currentAssigneeId={selected.assignedToId}
                        myUserId={myUserId}
                        canManageAssignee={canManageAssignee}
                        loading={assignLoading}
                        onAssign={(uid) => void assignConversation(uid)}
                      />
                    ) : null}
                    <RemindButton
                      contactId={selected.contact.id}
                      contactName={selected.contact.name}
                      conversationId={selected.id}
                    />
                  </>
                }
                {...(selected.channel === "whatsapp" || selected.channel === "meta"
                  ? {
                      phoneReplacement: (
                        <WhatsappCallChip conversationId={selected.id} channel={selected.channel} />
                      ),
                    }
                  : {})}
                hideOverflowMenu
                onBack={() => setSelected(null)}
                onClose={() => setSelected(null)}
                onSearch={() => inboxConversationSearchRef.current?.open()}
                tabs={[
                  { key: "chat", label: "Conversa" },
                  { key: "activities", label: "Atividades" },
                  { key: "notes", label: "Notas" },
                  { key: "timeline", label: "Timeline" },
                ]}
                activeTab={conversationDetailTab}
                onTabChange={setConversationDetailTab}
              />

              {conversationDetailTab === "chat" ? (
                <ChatWindow
                  conversationId={selected.id}
                  conversationStatus={selected.status}
                  contactId={selected.contact.id}
                  compactChrome
                  inConversationSearchRef={inboxConversationSearchRef}
                  onResolve={(next) => {
                    setSelected((s) => (s ? { ...s, status: next } : s));
                    queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  }}
                  onReopen={(next) => {
                    setSelected((s) => (s ? { ...s, status: next } : s));
                    queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  }}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center bg-[var(--color-chat-bg)] px-6 text-center text-[13px] text-[var(--color-ink-muted)]">
                  Em breve
                </div>
              )}
            </div>

            {/* Lead + negócios (direita): colapsavel em telas ≥ lg.
                Estado persistido em localStorage (`inbox-right-panel-open`).
                Container externo limita largura; rail colapsado 36px.
                Em telas menores que lg continua sem render (sem DOM movel). */}
            {rightPanelOpen ? (
              <div className="hidden lg:flex lg:w-[280px] xl:w-[300px] lg:shrink-0">
                <ContactDealSidebar
                  side="right"
                  contactId={selected.contact.id}
                  contactName={selected.contact.name}
                  contactPhone={selected.contact.phone}
                  lastInboundAt={selected.lastInboundAt}
                  conversationId={selected.id}
                  channel={selected.channel}
                  onBack={() => setSelected(null)}
                  onCreateDeal={() => setDealOpen(true)}
                  onCollapse={toggleRightPanel}
                />
              </div>
            ) : (
              <div className="hidden w-9 shrink-0 flex-col items-center gap-2 border-l border-border bg-white py-3 lg:flex">
                <TooltipHost label="Expandir painel CRM" side="left">
                  <button
                    type="button"
                    onClick={toggleRightPanel}
                    aria-label="Expandir painel CRM"
                    className="flex size-8 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-slate-900"
                  >
                    <ChevronsLeft className="size-4" />
                  </button>
                </TooltipHost>
                <span
                  aria-hidden
                  className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-muted)] [writing-mode:vertical-rl]"
                  style={{ transform: "rotate(180deg)" }}
                >
                  Painel CRM
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10">
              <MessageSquare className="size-8 text-accent/60" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">Nenhuma conversa selecionada</p>
              <p className="mt-1 text-sm text-muted-foreground">Escolha uma conversa na lista para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Deal dialog */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Novo negócio</DialogTitle>
            <DialogDescription>Criar negócio vinculado a {selected?.contact.name ?? "contato"}.</DialogDescription>
          </DialogHeader>
          {stageOptionsForForm.length > 0 && selected ? (
            <DealForm
              mode="create"
              stages={stageOptionsForForm}
              defaultValues={{ contactId: selected.contact.id, title: `Negócio — ${selected.contact.name}` }}
              onSuccess={() => {
                setDealOpen(false);
                queryClient.invalidateQueries({ queryKey: ["pipeline-board", pipelineId] });
                queryClient.invalidateQueries({ queryKey: ["pipelines"] });
                queryClient.invalidateQueries({ queryKey: ["contact-sidebar", selected.contact.id] });
              }}
              onCancel={() => setDealOpen(false)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {dealOpen && !pipelineId ? "Carregando pipeline…" : "Nenhum estágio disponível."}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
