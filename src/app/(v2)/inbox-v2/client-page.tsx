"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { NavRail } from "@/components/crm/nav-rail";
import { ConversationColumn } from "@/components/crm/conversation-column";
import { ChatArea } from "@/components/crm/chat-area";
import { ContactAside } from "@/components/crm/contact-aside";

import {
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
  TagsPopover,
  TemplatePickerList,
} from "@/features/inbox-v2/extras";
import type { ConversationListRow, InboxFilters, InboxTab } from "@/features/inbox-v2/api";

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

export default function InboxV2ClientPage() {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  // ── Estado de UI local ─────────────────────────────────────────
  const [tab, setTab] = useState<InboxTab>("esperando");
  const [filters] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  // Debounce do search (300ms). Evita refetch a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Dados ───────────────────────────────────────────────────────
  const { data: listData } = useConversations({
    tab,
    filters,
    search: debouncedSearch,
    enabled: isAuthenticated,
  });
  const rows = listData?.items ?? [];
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

  // ── Adapters → tipos do v0 ─────────────────────────────────────
  const conversationCards = useMemo(() => rows.map((r) => toConversationCard(r, { active: r.id === activeId })), [rows, activeId]);
  const contactName = activeRow?.contact?.name ?? "";
  const messageBubbles = useMemo(
    () => messages.map((m) => toMessageBubble(m, contactName)),
    [messages, contactName],
  );
  const chatContact = activeRow ? toChatContact(activeRow) : null;
  // Espelha exatamente o legado (chat-window.tsx): se o backend não
  // enviou o objeto session, assume janela ATIVA (?? true). Nunca usar
  // heurística client-side de lastInboundAt — backend é o source of truth.
  const sessionActive = sessionInfo?.active ?? true;
  const sessionExpired = activeRow ? !sessionActive : false;
  const contactAsideView = activeRow ? toContactAside(contactDetail, activeRow) : null;

  // ── Stage pills no header do chat — placeholder até integrar com pipeline real
  // (Fase 9 conecta no /api/pipelines/:id/board e usa deriveStagePills).
  const stagePillsView = useMemo<
    { label: string; status: "done" | "active" | "pending" }[]
  >(() => [], []);

  return (
    <div className="grid h-dvh grid-cols-[72px_320px_1fr_340px] gap-4 p-4">
      <NavRail />
      <ConversationColumn
        conversations={conversationCards}
        activeConversationId={activeId ?? undefined}
        onSelectConversation={handleSelect}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        tabsOverride={TABS.map((t) => ({
          label: t.label,
          count: tabCounts?.[t.id] ?? null,
        }))}
        activeTabIndex={TABS.findIndex((t) => t.id === tab)}
        onTabChange={(idx) => {
          const next = TABS[idx]?.id;
          if (next) setTab(next);
        }}
        // Tabs ocultadas — dropdown do banner abaixo concentra a
        // selecao de status (UX pedida pelo time: uma unica entrada).
        hideTabs
        awaitingCount={tabCounts?.[tab] ?? null}
      />

      {chatContact && activeRow ? (
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
              sending={sendMessage.isPending}
              disabled={sessionExpired}
            />
          }
        />
      ) : (
        <EmptyChatArea />
      )}

      {contactAsideView && activeRow ? (
        <ContactAside
          contact={contactAsideView}
          headerActionsNode={
            <>
              <AssigneePopover
                conversationId={activeId}
                currentAssigneeName={activeRow.assignedTo?.name}
                currentAssigneeId={activeRow.assignedTo?.id ?? null}
              />
              <TagsPopover
                conversationId={activeId}
                currentTags={activeRow.tags ?? []}
              />
            </>
          }
        />
      ) : (
        <EmptyAside />
      )}

      {templateOpen && activeId ? (
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
      ) : null}
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
