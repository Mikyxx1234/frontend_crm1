"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ChevronDown, CircleAlert as AlertCircle, Bot, CircleCheck as CheckCircle2, SquareCheck as CheckSquare, Clock, Eye, Inbox, LayoutGrid, ListFilter as Filter, MessageSquare, Plus, Search, Send, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, MotionDiv } from "@/components/ui/motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { ChannelBadge } from "@/components/inbox/channel-badge";
import { ChatWindow } from "@/components/inbox/chat-window";
import { ConversationList, type ConversationListRow } from "@/components/inbox/conversation-list";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import { InboxFilterBar, type InboxFilters } from "@/components/inbox/inbox-filters";
import { ContactDealSidebar } from "@/components/inbox/contact-deal-sidebar";
import { DailyStatsChips } from "@/components/inbox/daily-stats-chips";
import { PresenceDashboard } from "@/components/inbox/presence-dashboard";
import { DealForm } from "@/components/pipeline/deal-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type InboxTab = "entrada" | "esperando" | "respondidas" | "automacao" | "finalizados" | "erro";
type TabDef = {
  key: InboxTab; label: string; icon: React.ElementType;
  iconOnly?: boolean;
};

const TABS: TabDef[] = [
  { key: "entrada", label: "Entrada", icon: ArrowDownToLine },
  { key: "esperando", label: "Esperando", icon: Clock },
  { key: "respondidas", label: "Respondidas", icon: Send },
  { key: "finalizados", label: "Finalizados", icon: CheckCircle2 },
  { key: "automacao", label: "Bot", icon: Bot },
  { key: "erro", label: "Erro", icon: AlertCircle },
];

const TAB_ACCENT: Record<InboxTab, string> = {
  entrada: "text-amber-600 dark:text-amber-400 border-amber-500",
  esperando: "text-rose-600 dark:text-rose-400 border-rose-500",
  respondidas: "text-emerald-600 dark:text-emerald-400 border-emerald-500",
  automacao: "text-accent border-accent",
  finalizados: "text-success border-success",
  erro: "text-destructive border-destructive",
};

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
  if (!res.ok) return { entrada: 0, esperando: 0, respondidas: 0, automacao: 0, finalizados: 0, erro: 0 };
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
  const isAgent = myRole === "MEMBER";

  const allowedTabs = React.useMemo<TabDef[]>(
    () => (isAgent ? TABS.filter((t) => t.key === "esperando" || t.key === "respondidas") : TABS),
    [isAgent],
  );

  const [tab, setTab] = React.useState<InboxTab>(isAgent ? "esperando" : "entrada");
  const [selected, setSelected] = React.useState<ConversationListRow | null>(null);
  const [search, setSearch] = React.useState("");
  const [dealOpen, setDealOpen] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<InboxFilters>({});
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [assignLoading, setAssignLoading] = React.useState(false);
  // O painel direito (CRM/Lead) é sempre visível em telas grandes (≥ xl).
  // O antigo botão `PanelRightOpen/Close` foi removido a pedido do operador
  // — quem opera o Inbox quase sempre quer ver o contexto do contato/deal
  // ao lado da conversa, e o toggle só roubava espaço/atenção do header.
  // Em telas menores que xl, a sidebar é simplesmente ocultada via CSS
  // (`hidden xl:flex`) — o operador rola pra ver o contexto se precisar.

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

  const { data: counts = { entrada: 0, esperando: 0, respondidas: 0, automacao: 0, finalizados: 0, erro: 0 } } =
    useQuery({ queryKey: ["conversations", "tab-counts"], queryFn: fetchTabCounts, refetchInterval: 15_000, enabled: isAuthenticated });

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
    <div className="-mx-3 -mt-3 flex min-h-0 flex-1 flex-col overflow-hidden sm:-mx-4 md:-mx-8 md:-mt-2 md:flex-row">
      {/* ═══════ SIDEBAR: CONVERSATION LIST ═══════
          Largura FIXA em md+: nunca muda em função da tab ativa nem da
          presença/ausência de uma conversa selecionada.
          A curva superior esquerda é renderizada pelo dashboard-shell
          (rounded-tl-[32px]), então este painel mantém cantos retos.
          Sombra DIRECIONAL para a direita (10px 0 30px -15px navy 5%) cria
          a sensação de painel "sobre" a área de chat — Premium Core spec. */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[10px_0_30px_-15px_rgba(13,27,62,0.08)] md:h-full md:w-[440px] md:shrink-0 md:grow-0 md:basis-[440px]",
          selected ? "hidden md:flex" : "w-full flex-1",
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          {/* Linha 1: "Conversas" + ícones + "+"
              Em mobile compactamos: titulo 2xl, escondemos ícones secundários
              (Layout/Config/Chevron) — eles ficam só em md+. O "+" e a busca
              continuam acessíveis em mobile pois são as ações primárias. */}
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
                <MessageSquare className="size-5" />
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Conversas
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <TooltipHost label="Layout" side="bottom" className="hidden md:inline-flex">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-600" aria-label="Layout"><LayoutGrid size={22} /></button>
              </TooltipHost>
              <TooltipHost label="Configurações" side="bottom" className="hidden md:inline-flex">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-600" aria-label="Configurações"><SlidersHorizontal size={22} /></button>
              </TooltipHost>
              <div className="mx-2 hidden h-6 w-px bg-slate-200 md:block" />
              <TooltipHost label="Mais opções" side="bottom" className="hidden md:inline-flex">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-600" aria-label="Mais opções"><ChevronDown size={22} /></button>
              </TooltipHost>
              <TooltipHost label={selectionMode ? "Sair seleção" : "Nova conversa"} side="bottom">
                <button
                  type="button"
                  onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-cyan-100 transition-colors duration-150 hover:bg-accent/90"
                  aria-label={selectionMode ? "Sair seleção" : "Nova conversa"}
                >
                  <Plus size={26} strokeWidth={3} />
                </button>
              </TooltipHost>
            </div>
          </div>

          {/* Linha 2: Filtro + Busca */}
          <div className="flex items-center gap-3 border-t border-slate-100 py-3 sm:gap-6 sm:py-4">
            <TooltipHost label="Filtros" side="bottom">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn("text-slate-400 transition-colors", showFilters && "text-accent")}
                aria-label="Filtros"
              >
                <Filter size={22} />
              </button>
            </TooltipHost>
            <div className="flex flex-1 items-center gap-3 sm:gap-4">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone"
                className="w-full border-none bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400 sm:text-lg"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="shrink-0 text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Painel do dia — chips compactos com pulse pessoal do consultor.
              Ficam logo abaixo da busca pra serem o "primeiro olhar" ao abrir
              o Inbox. Em mobile usam scroll horizontal silencioso (poucos itens
              cabem em 360px se houver número de 3 dígitos). */}
          <div className="mt-3 sm:mt-4">
            <DailyStatsChips
              onPendingClick={() => setTab("entrada")}
              onCriticalClick={() => setTab("entrada")}
            />
          </div>

          {/* PresenceDashboard ocupa muito espaço vertical em mobile. Mantemos
              só em sm+ — operador mobile foca em conversas, status fica no
              MoreSheet do shell. */}
          {myUserId && sessionData?.user && (
            <div className="hidden sm:block">
              <PresenceDashboard
                agent={{
                  id: myUserId,
                  name: sessionData.user.name ?? "Agente",
                  imageUrl: sessionData.user.image ?? null,
                }}
                status={myAgentStatus}
                capacity={agentCapacity?.loadPct}
                activeConversations={agentCapacity?.activeConversations}
                maxConcurrent={agentCapacity?.maxConcurrent}
                tone={agentCapacity?.tone}
                capacityLoading={agentCapacityLoading}
              />
            </div>
          )}
        </div>

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

        {/* Tabs — ativa expande com rótulo; inativas ficam compactas com ícone */}
        <div className="shrink-0 px-6 pb-4">
          <div
            className="font-outfit mb-6 flex items-center gap-1 rounded-full bg-[#f1f5f9] p-1 shadow-inner ring-1 ring-slate-200/50"
            role="tablist"
            aria-label="Filtro de conversas"
          >
            {allowedTabs.map((t) => {
              const active = tab === t.key;
              const count = counts[t.key] ?? 0;
              const Icon = t.icon;
              const tabButton = (
                <button
                  type="button"
                  role="tab"
                  onClick={() => setTab(t.key)}
                  aria-pressed={active}
                  aria-selected={active}
                  aria-label={count > 0 ? `${t.label} (${count})` : t.label}
                  className={cn(
                    "group relative flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-[14px] transition-colors duration-150 active:scale-[0.97]",
                    active
                      ? "h-10 bg-brand-blue px-4 font-semibold text-white shadow-blue-glow"
                      : "h-10 w-9 font-medium text-slate-500 hover:bg-white hover:text-slate-800",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 2} />
                  {active && <span className="truncate">{t.label}</span>}
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center justify-center tabular-nums",
                        active
                          ? "rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] font-bold text-white"
                          : "absolute -right-1 -top-1 size-[17px] rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#f1f5f9]",
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
              return (
                <div key={t.key} className={cn("relative", active ? "flex-1 min-w-0" : "shrink-0")}>
                  {active ? tabButton : <TooltipHost label={t.label} side="bottom">{tabButton}</TooltipHost>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ConversationList
            tab={tab}
            search={search}
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
      <div className={cn("flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#eef0f4]", !selected && "hidden md:flex")}>
        {selected ? (
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Chat (centro): só esta coluna rola as mensagens; cabeçalhos fixos */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#eef0f4]">
              {/*
                Topo unificado: substitui o `<header>` artesanal e o
                `SalesHubChatHeader` por um único componente que vive
                em `src/components/inbox/conversation-header.tsx`. Inclui
                avatar + nome + tags + telefone/email + chip de voz +
                transferir + tags + fechar. A ordem fixa dos botões
                (voz | transferir | tags | actions | X) foi escolhida
                pelo operador. O slot `actions` é deixado vazio aqui
                porque no Inbox não tem Ganho/Perdido — esse slot é
                quem faz o componente render exatamente igual nas
                duas telas (Inbox + Sales Hub).
              */}
              <ConversationHeader
                contactId={selected.contact.id}
                contactName={selected.contact.name}
                contactPhone={selected.contact.phone}
                contactEmail={selected.contact.email}
                contactAvatarUrl={selected.contact.avatarUrl}
                contactChannel={selected.channel}
                contactHref={`/contacts/${selected.contact.id}`}
                tags={selected.tags ?? []}
                conversationId={selected.id}
                conversationChannel={selected.channel}
                canManageAssignee={canManageAssignee}
                myUserId={myUserId}
                currentAssigneeId={selected.assignedToId}
                teamUsers={teamUsers}
                assignLoading={assignLoading}
                onAssign={(uid) => void assignConversation(uid)}
                onTagsUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
                }}
                onBack={() => setSelected(null)}
                onClose={() => setSelected(null)}
              />

              <ChatWindow
                conversationId={selected.id}
                conversationStatus={selected.status}
                onResolve={(next) => {
                  setSelected((s) => (s ? { ...s, status: next } : s));
                  queryClient.invalidateQueries({ queryKey: ["conversations"] });
                }}
                onReopen={(next) => {
                  setSelected((s) => (s ? { ...s, status: next } : s));
                  queryClient.invalidateQueries({ queryKey: ["conversations"] });
                }}
              />
            </div>

            {/* Lead + negócios (direita): altura da viewport da área útil; rolagem interna.
                Sempre visível em telas ≥ xl — o antigo toggle do header
                foi removido. Em telas menores fica oculta via Tailwind
                (sem render no DOM móvel). */}
            <div className="hidden xl:flex">
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
              />
            </div>
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
