"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

import { NavRail } from "@/components/crm/nav-rail";
import { ConversationColumn } from "@/components/crm/conversation-column";
import { ChatArea } from "@/components/crm/chat-area";
import { ContactAside } from "@/components/crm/contact-aside";
import { PageHeader } from "@/components/crm/page-header";
import { SearchInput } from "@/components/crm/search-input";
import {
  ColumnResizer,
  usePersistentWidth,
} from "@/components/crm/column-resizer";

import {
  isSessionExpired,
  toChatContact,
  toContactAside,
  toConversationCard,
  toMessageBubble,
} from "@/features/inbox-v2/adapters";
import {
  useConversations,
  useContactSidebar,
  useInboxRealtime,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useTabCounts,
} from "@/features/inbox-v2/hooks";
import {
  AssigneePopover,
  Composer,
  ConversationActionsMenu,
  InboxFilterButton,
  TagsPopover,
  TemplatePickerList,
} from "@/features/inbox-v2/extras";
import type { ConversationListRow, InboxFilters, InboxTab } from "@/features/inbox-v2/api";
import {
  useBoard,
  useDealDetail,
} from "@/features/pipeline-v2/hooks";
import { StagePicker } from "@/features/pipeline-v2/extras/stage-picker";
import type { BoardStageDto } from "@/features/pipeline-v2/api";

const DEFAULT_FILTERS: InboxFilters = {};

// Ordem das tabs alinhada ao legado (`conversation-list.tsx`
// TAB_ORDER). MVP expõe 5 — automacao/erro voltam depois se houver
// demanda real.
const TABS: ReadonlyArray<{ id: InboxTab; label: string }> = [
  { id: "todos", label: "Todas" },
  { id: "esperando", label: "Aguardando" },
  { id: "entrada", label: "Entrada" },
  { id: "respondidas", label: "Respondidas" },
  { id: "finalizados", label: "Resolvidas" },
];

/**
 * Props opcionais — usadas para reaproveitar o chat dentro de um shell
 * diferente (ex.: segmento real `/v2/inbox` que injeta o `<NavRailV2 />`
 * com hrefs novos). Sem nada passado, o componente mantém o comportamento
 * legado: renderiza o `<NavRail />` antigo internamente.
 */
interface InboxV2ClientPageProps {
  /** Override do trilho de navegação (1ª coluna). */
  navRail?: React.ReactNode;
  /**
   * Metadados do cabeçalho de página opcional, renderizado ACIMA das
   * colunas (estilo "Caixa de entrada" do DS de referência). Quando
   * presente, a busca e o filtro sobem para este header (busca à
   * direita, filtro ao centro) e somem da coluna de conversas. Quando
   * ausente, mantém o layout legado de linha única (busca/filtro na
   * própria coluna) — usado por `(v2)/inbox-v2`.
   */
  pageHeader?: {
    icon: React.ReactNode;
    title: string;
    description?: string;
  };
}

export default function InboxV2ClientPage({
  navRail,
  pageHeader,
}: InboxV2ClientPageProps = {}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  // ── Largura da coluna de conversas (persistida) ────────────────
  const [convWidth, setConvWidth] = usePersistentWidth(
    "inbox-v2:conv-width",
    320,
  );

  // ── Estado de UI local ─────────────────────────────────────────
  // Default "todos": ao abrir/atualizar a página, todas as conversas
  // ficam selecionadas (pedido do usuário).
  const [tab, setTab] = useState<InboxTab>("todos");
  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [asideCollapsed, setAsideCollapsed] = useState(false);

  // Debounce do search (300ms). Evita refetch a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Dados ───────────────────────────────────────────────────────
  // Ordem e janela são CLIENT-SIDE — não vão ao servidor (evita refetch
  // ao mudar ordenação e a limitação do `sortBy` do backend).
  const { sortBy, sortOrder, windowState, ...serverFilters } = filters;

  const {
    data: listData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations({
    tab,
    filters: serverFilters,
    search: debouncedSearch,
    enabled: isAuthenticated,
  });
  const rawRows = listData?.items ?? [];

  // Ordena (default: última atividade primeiro) e filtra a janela de 24h.
  // Usa `lastMessageAt` (com fallback p/ `lastInboundAt`) para casar a ordem
  // com o `time` exibido no card — que também usa `lastMessageAt ?? lastInboundAt`
  // (ver `toConversationCard` em adapters.ts). Sem isso, mensagens outbound
  // recentes "puxam" o tempo no card mas não a posição na lista, parecendo
  // desordenado pro operador.
  // `lastMessageAt` só é tocado por NOVAS mensagens (in ou out), nunca por
  // leitura — então a posição continua estável ao marcar como lida (motivo
  // original pra evitar `updatedAt`).
  const rows = useMemo(() => {
    let list = rawRows;
    if (windowState === "open") {
      list = list.filter((r) => !isSessionExpired(r.lastInboundAt));
    } else if (windowState === "closed") {
      list = list.filter((r) => isSessionExpired(r.lastInboundAt));
    }
    const by = sortBy ?? "lastInboundAt";
    const sign = (sortOrder ?? "desc") === "asc" ? 1 : -1;
    const ts = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
    const lastActivityTs = (r: typeof rawRows[number]) =>
      ts(r.lastMessageAt ?? r.lastInboundAt);
    return [...list].sort((a, b) => {
      if (by === "unreadCount") {
        const d = (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
        return d !== 0 ? d : lastActivityTs(b) - lastActivityTs(a);
      }
      return sign * (lastActivityTs(a) - lastActivityTs(b));
    });
  }, [rawRows, windowState, sortBy, sortOrder]);

  const { data: tabCounts } = useTabCounts(isAuthenticated);

  // ── Sticky activeRow ────────────────────────────────────────────
  // A `rows` reflete o filtro da aba atual (ex.: "entrada"). Se o
  // agente envia uma mensagem outbound, a conversa pode deixar de
  // pertencer ao filtro (move pra "respondidas") e sumir de `rows`.
  // Sem snapshot, `rows.find` devolve undefined e a janela do chat
  // fecha sozinha. Mantemos a ultima row vista enquanto o user nao
  // trocar de conversa explicitamente.
  const [stickyRow, setStickyRow] = useState<ConversationListRow | null>(null);

  useEffect(() => {
    if (!activeId) {
      setStickyRow(null);
      return;
    }
    const found = rows.find((r) => r.id === activeId);
    if (found) setStickyRow(found);
    // Se nao encontrou (saiu do filtro da aba), preserva o snapshot
    // anterior — NAO sobrescreve com null.
  }, [activeId, rows]);

  const activeRow = stickyRow;
  const activeContactId = activeRow?.contact?.id ?? null;

  const { data: messagesData } = useMessages(activeId);
  const messages = messagesData?.messages ?? [];
  const sessionInfo = messagesData?.session;

  const { data: contactDetail } = useContactSidebar(activeContactId);

  // ── Realtime ────────────────────────────────────────────────────
  useInboxRealtime({ activeConversationId: activeId, enabled: isAuthenticated });

  // ── Mutations ───────────────────────────────────────────────────
  const sendMessage = useSendMessage(activeId);
  const markRead = useMarkConversationRead();

  function handleSelect(id: string) {
    setActiveId(id);
    markRead.mutate(id);
  }

  function handleSend(value: string) {
    if (!activeId) return;
    sendMessage.mutate(
      { content: value },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(err.message || "Falha ao enviar"),
      },
    );
  }

  function handleSendNote(value: string) {
    if (!activeId) return;
    sendMessage.mutate(
      { content: value, asNote: true },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(err.message || "Falha ao salvar nota"),
      },
    );
  }

  // ── Adapters → tipos do v0 ─────────────────────────────────────
  const conversationCards = useMemo(() => rows.map((r) => toConversationCard(r, { active: r.id === activeId })), [rows, activeId]);
  const contactName = activeRow?.contact?.name ?? "";
  const messageBubbles = useMemo(
    () => messages.map((m) => toMessageBubble(m, contactName)),
    [messages, contactName],
  );
  const chatContact = activeRow ? toChatContact(activeRow) : null;
  // Backend é source of truth quando disponível (`session.active`).
  // Fallback heurístico: se o backend não enviou `session`, calculamos a
  // janela de 24h via `isSessionExpired(lastInboundAt)`. Garante que o
  // alerta volte a aparecer mesmo em cenários onde o payload do messages
  // não inclui o objeto `session` (ex.: cache stale, payload reduzido,
  // backends mais antigos). Só decide depois que `messagesData` chegou
  // para evitar falso-positivo durante o loading inicial.
  const sessionActiveFromBackend = sessionInfo?.active;
  const sessionExpired = activeRow && messagesData
    ? sessionActiveFromBackend !== undefined
      ? !sessionActiveFromBackend
      : isSessionExpired(sessionInfo?.lastInboundAt ?? activeRow.lastInboundAt)
    : false;
  const contactAsideView = activeRow ? toContactAside(contactDetail, activeRow) : null;

  // ── Stage pills no header do chat — placeholder até integrar com pipeline real
  // (Fase 9 conecta no /api/pipelines/:id/board e usa deriveStagePills).
  const stagePillsView = useMemo<
    { label: string; status: "done" | "active" | "pending" }[]
  >(() => [], []);

  const navRailNode = navRail ?? <NavRail />;

  // Quando há header de página, busca + filtro vivem nele (direita/centro),
  // então a coluna de conversas esconde sua linha de busca/filtro.
  const searchInHeader = !!pageHeader;

  const conversationColumnNode = (
    <ConversationColumn
      conversations={conversationCards}
      activeConversationId={activeId ?? undefined}
      onSelectConversation={handleSelect}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      hideSearch={searchInHeader}
      filterSlot={<InboxFilterButton value={filters} onChange={setFilters} />}
      tabsOverride={TABS.map((t) => ({
        label: t.label,
        count: tabCounts?.[t.id] ?? null,
      }))}
      activeTabIndex={TABS.findIndex((t) => t.id === tab)}
      onTabChange={(idx) => {
        const next = TABS[idx]?.id;
        if (next) setTab(next);
      }}
      resizerSlot={<ColumnResizer value={convWidth} onChange={setConvWidth} />}
      onLoadMore={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      renderCardSlots={(c) => ({
        tagsSlot: (
          <TagsPopover
            conversationId={c.id}
            currentTags={(c.tags ?? []).map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color ?? null,
            }))}
            triggerVariant="icon"
          />
        ),
        assigneeSlot: (
          <AssigneePopover
            conversationId={c.id}
            currentAssigneeName={c.assignee}
            currentAssigneeId={c.assigneeId ?? null}
          />
        ),
      })}
    />
  );

  const chatNode =
    chatContact && activeRow ? (
      <ChatArea
        contact={chatContact}
        messages={messageBubbles}
        stages={stagePillsView}
        showSessionAlert={sessionExpired}
        onUseTemplate={() => setTemplateOpen(true)}
        headerActionsSlot={
          <ConversationActionsMenu
            conversationId={activeId}
            isResolved={activeRow.status === "RESOLVED"}
          />
        }
        composerSlot={
          <Composer
            conversationId={activeId}
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            onSendNote={handleSendNote}
            sending={sendMessage.isPending}
            disabled={sessionExpired}
            isResolved={activeRow.status === "RESOLVED"}
            contactId={activeContactId}
          />
        }
      />
    ) : (
      <EmptyChatArea />
    );

  // Tags da conversa ativa — até 2 chips + "+N" para o restante.
  const activeTags = activeRow?.tags ?? [];
  const MAX_ASIDE_TAGS = 2;

  // Node de tags: chips visuais + popover de gerenciamento
  const tagsNode = (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeTags.slice(0, MAX_ASIDE_TAGS).map((t) => {
        const hex = t.color ?? null;
        const clean = (hex ?? "").replace("#", "");
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const valid = hex && ![r, g, b].some(Number.isNaN);
        const bg = valid ? `rgba(${r},${g},${b},0.14)` : "var(--color-enterprise-bg)";
        const fg = valid
          ? `rgb(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 30)})`
          : "var(--brand-primary)";
        const border = valid ? `rgba(${r},${g},${b},0.30)` : "rgba(91,111,245,0.25)";
        return (
          <TooltipGlass key={t.id} label={t.name} side="top">
            <span
              className="inline-flex max-w-[100px] shrink-0 items-center truncate rounded-full border px-2 py-px font-display text-[10.5px] font-semibold"
              style={{ background: bg, color: fg, borderColor: border }}
            >
              <span className="truncate">{t.name}</span>
            </span>
          </TooltipGlass>
        );
      })}
      {activeTags.length > MAX_ASIDE_TAGS && (
        <TooltipGlass label={activeTags.slice(MAX_ASIDE_TAGS).map((t) => t.name).join(", ")} side="top">
          <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-px font-display text-[10.5px] font-bold text-[var(--text-secondary)]">
            +{activeTags.length - MAX_ASIDE_TAGS}
          </span>
        </TooltipGlass>
      )}
      <TagsPopover
        conversationId={activeId}
        currentTags={activeTags}
      />
    </div>
  );

  // ── Funil real do primeiro deal do contato ──────────────────────
  const firstDeal = contactAsideView?.deals?.[0] ?? null;
  const firstDealId = firstDeal?.id ?? null;
  const { data: firstDealDetail } = useDealDetail(firstDealId);
  // O detail do deal (/api/deals/:id) devolve pipeline e stage ANINHADOS
  // em `deal.stage.pipeline.id` / `deal.stage.id` — não no topo. Ler o
  // caminho errado deixava pipelineId nulo, o board nunca carregava e a
  // aside mostrava "Sem estágio" sem dropdown de troca de fase.
  const dealStage = (
    firstDealDetail as
      | { stage?: { id?: string; pipeline?: { id?: string } } }
      | undefined
  )?.stage;
  const firstDealPipelineId = dealStage?.pipeline?.id ?? firstDeal?.pipelineId ?? null;
  const { data: boardStages } = useBoard({
    pipelineId: firstDealPipelineId,
    enabled: !!firstDealPipelineId,
  });

  // Monta funnelSegments e stageDropdownSlot para o primeiro deal.
  // Os demais deals ficam com fallback (sem barra + stageName estático).
  const firstDealFunnelSegments = boardStages?.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? "var(--brand-primary)",
    position: s.position,
  }));
  const firstDealStageId = dealStage?.id ?? firstDeal?.stageId ?? null;
  const firstDealStageName =
    boardStages?.find((s) => s.id === firstDealStageId)?.name ??
    firstDeal?.stageName ??
    null;

  // Injeta funnelSegments + stageDropdownSlot apenas no primeiro deal.
  const dealsWithSlots = (contactAsideView?.deals ?? []).map((d, idx) => {
    if (idx !== 0 || !boardStages?.length) return d;
    return {
      ...d,
      stageId: firstDealStageId ?? d.stageId,
      stageName: firstDealStageName ?? d.stageName,
      funnelSegments: firstDealFunnelSegments,
      stageDropdownSlot: firstDealId && firstDealStageId ? (
        <StagePicker
          dealId={firstDealId}
          currentStageId={firstDealStageId}
          pipelineId={firstDealPipelineId}
        >
          {({ onSelectStage, isPending }) => (
            <InboxStageDropdown
              stages={boardStages}
              currentStageId={firstDealStageId}
              isPending={isPending}
              onSelect={onSelectStage}
            />
          )}
        </StagePicker>
      ) : undefined,
    };
  });

  const contactAsideViewWithSlots = contactAsideView
    ? { ...contactAsideView, deals: dealsWithSlots }
    : null;

  const asideNode =
    contactAsideViewWithSlots && activeRow ? (
      <ContactAside
        contact={contactAsideViewWithSlots}
        headerActionsNode={
          <AssigneePopover
            conversationId={activeId}
            currentAssigneeName={activeRow.assignedTo?.name}
            currentAssigneeId={activeRow.assignedTo?.id ?? null}
          />
        }
        tagsNode={tagsNode}
        collapsed={asideCollapsed}
        onToggleCollapse={() => setAsideCollapsed((v) => !v)}
      />
    ) : (
      <EmptyAside />
    );

  const templateModalNode =
    templateOpen && activeId ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setTemplateOpen(false)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <TemplatePickerList
            conversationId={activeId}
            onClose={() => setTemplateOpen(false)}
          />
        </div>
      </div>
    ) : null;

  // Layout COM cabeçalho de página (estilo "Caixa de entrada" da
  // referência): NavRail fixo à esquerda; à direita o header no topo e
  // as 3 colunas (lista/chat/contato) numa grade abaixo.
  if (pageHeader) {
    return (
      <div
        className="v2-screen grid gap-4 p-4"
        style={{ gridTemplateColumns: "72px minmax(0, 1fr)" }}
      >
        {navRailNode}
        <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
          <PageHeader
            icon={pageHeader.icon}
            title={pageHeader.title}
            description={pageHeader.description}
            center={
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Buscar conversa, contato, telefone..."
              />
            }
          />
          <div
            className="grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-200"
            style={{ gridTemplateColumns: `${convWidth}px 1fr ${asideCollapsed ? "44px" : "340px"}` }}
          >
            {conversationColumnNode}
            {chatNode}
            {asideNode}
          </div>
        </div>
        {templateModalNode}
      </div>
    );
  }

  // Layout legado (linha única, sem topo) — usado por `(v2)/inbox-v2`.
  return (
    <div
      className="v2-screen grid gap-4 p-4"
      style={{
        // Coluna 1 fixa (NavRail), 2 controlada pelo resizer, 3 flexível, 4 fixa.
        gridTemplateColumns: `72px ${convWidth}px 1fr ${asideCollapsed ? "44px" : "340px"}`,
      }}
    >
      {navRailNode}
      {conversationColumnNode}
      {chatNode}
      {asideNode}
      {templateModalNode}
    </div>
  );
}

function EmptyChatArea() {
  return (
    <main className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-10 text-center backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="grid size-16 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <h2 className="mt-3 font-display text-base font-bold text-[var(--text-primary)]">
        Selecione uma conversa
      </h2>
      <p className="mt-1 max-w-sm text-[13px] text-[var(--text-muted)]">
        Escolha uma conversa na lista para visualizar mensagens e detalhes do contato.
      </p>
    </main>
  );
}

function EmptyAside() {
  return (
    <aside
      aria-label="Detalhes do contato"
      className="flex items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 text-center text-[12px] text-[var(--text-muted)] backdrop-blur-md shadow-[var(--glass-shadow)]"
    >
      Sem contato selecionado.
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────
// InboxStageDropdown — dropdown glass de troca de fase para o DealCard
// do ContactAside (inbox). Mesmo padrão visual do StageDropdown do pipeline.
// ─────────────────────────────────────────────────────────────────
function InboxStageDropdown({
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
        className="flex items-center gap-1 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-opacity hover:text-[var(--text-primary)] hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
      >
        {current?.color && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: current.color }}
          />
        )}
        {current?.name ?? "Sem estagio"}
        <IconChevronDown
          size={11}
          className={cn("transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-1 shadow-[0_8px_24px_rgba(15,20,40,0.14)] backdrop-blur-md">
          {[...stages]
            .sort((a, b) => a.position - b.position)
            .map((s) => {
              const isActive = s.id === currentStageId;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => { onSelect(s.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 font-display text-[12px] font-semibold transition-colors",
                    isActive
                      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-overlay)]",
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: s.color ?? "var(--brand-primary)" }}
                  />
                  {s.name}
                  {isActive && (
                    <span className="ml-auto font-display text-[9px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
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
