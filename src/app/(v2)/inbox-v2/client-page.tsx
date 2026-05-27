"use client";

import { useMemo, useState } from "react";
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
  isSessionExpired,
} from "@/features/inbox-v2/adapters";
import {
  useConversations,
  useContactSidebar,
  useInboxRealtime,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from "@/features/inbox-v2/hooks";
import { Composer } from "@/features/inbox-v2/extras";
import type { InboxFilters, InboxTab } from "@/features/inbox-v2/api";

const DEFAULT_TAB: InboxTab = "entrada";
const DEFAULT_FILTERS: InboxFilters = {};

export default function InboxV2ClientPage() {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  // ── Estado de UI local ─────────────────────────────────────────
  const [tab] = useState<InboxTab>(DEFAULT_TAB);
  const [filters] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [search] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // ── Dados ───────────────────────────────────────────────────────
  const { data: listData } = useConversations({
    tab,
    filters,
    search,
    enabled: isAuthenticated,
  });
  const rows = listData?.items ?? [];

  const activeRow = useMemo(
    () => (activeId ? rows.find((r) => r.id === activeId) ?? null : null),
    [activeId, rows],
  );
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
  const sessionExpired = activeRow
    ? sessionInfo?.active === false || isSessionExpired(activeRow.lastInboundAt)
    : false;
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
      />

      {chatContact ? (
        <ChatArea
          contact={chatContact}
          messages={messageBubbles}
          stages={stagePillsView}
          showSessionAlert={sessionExpired}
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

      {contactAsideView ? (
        <ContactAside contact={contactAsideView} />
      ) : (
        <EmptyAside />
      )}
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
