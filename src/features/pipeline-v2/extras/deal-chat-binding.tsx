"use client";

/*
 * Conecta o painel direito do DealDetailPanel (tab "Conversa") a
 * uma conversa real do contato. Reusa hooks/components do
 * `inbox-v2` para nao reimplementar mensagens/envio.
 *
 * Retorna varios "slots" (messagesNode, composerNode, sessionAlertNode)
 * pra serem plugados nas props correspondentes do DealDetailPanel.
 */

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { IconMessageCirclePlus } from "@tabler/icons-react";

import { DaySeparator, MessageBubble } from "@/components/crm/message-bubble";
import { SessionAlert } from "@/components/crm/session-alert";
import { Composer, TemplatePickerList } from "@/features/inbox-v2/extras";
import {
  useInboxRealtime,
  useMessages,
  useSendMessage,
} from "@/features/inbox-v2/hooks";
import {
  formatDayLabel,
  isSessionExpired,
  toMessageBubble,
} from "@/features/inbox-v2/adapters";

interface DealChatBindingResult {
  messagesNode: React.ReactNode;
  composerNode: React.ReactNode;
  sessionAlertNode: React.ReactNode | undefined;
  /** Modal que precisa ficar montado em algum ancestral comum. */
  templateModal: React.ReactNode;
}

export function useDealChatBinding(params: {
  conversationId: string | null;
  contactName: string;
  contactId?: string | null;
  /**
   * Override opcional. Quando ausente, o hook deriva `sessionExpired` do
   * `session` retornado pela própria query `useMessages` (mesma fonte que o
   * /inbox usa). Mantemos o backend como source of truth quando disponível,
   * com fallback heurístico em `lastInboundAt` se o backend ficar silente.
   */
  sessionExpired?: boolean;
}): DealChatBindingResult {
  const { conversationId, contactName, contactId, sessionExpired: sessionExpiredOverride } = params;

  const [draft, setDraft] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  const { data: messagesResp } = useMessages(conversationId);
  const sendMutation = useSendMessage(conversationId);

  // Deriva sessionExpired da mesma fonte do /inbox: prioriza `session.active`
  // do backend; se o objeto `session` não vier, cai no heurístico de 24h
  // baseado em `lastInboundAt`. O override por prop continua válido (ex.:
  // testes ou casos onde o caller já tem o sinal).
  const sessionInfo = messagesResp?.session;
  const sessionActiveFromBackend = sessionInfo?.active;
  // Última mensagem inbound carregada na lista (rede de segurança caso o
  // backend não envie `session.lastInboundAt`). `direction === "in"` é o
  // valor canônico do backend (vide MessageDirection em api/types.ts).
  const lastInboundFromMessages =
    (messagesResp?.messages ?? [])
      .filter((m) => m.direction === "in")
      .map((m) => m.createdAt)
      .sort()
      .pop() ?? null;
  // Só decide depois que o fetch responder, senão `isSessionExpired(null)`
  // dispara um falso positivo durante o loading inicial.
  const sessionExpiredDerived =
    sessionExpiredOverride !== undefined
      ? sessionExpiredOverride
      : !messagesResp
        ? false
        : sessionActiveFromBackend !== undefined
          ? !sessionActiveFromBackend
          : isSessionExpired(sessionInfo?.lastInboundAt ?? lastInboundFromMessages);
  const sessionExpired = !!conversationId && sessionExpiredDerived;

  // SSE: assina /api/sse/messages e invalida as mensagens da conversa
  // ativa quando chega new_message. Sem isto o chat do deal só atualizava
  // após F5 (useMessages não tem polling) — o inbox já fazia isso.
  useInboxRealtime({
    activeConversationId: conversationId,
    enabled: !!conversationId,
  });

  const bubbles = useMemo(
    () =>
      (messagesResp?.messages ?? []).map((m) =>
        toMessageBubble(m, contactName),
      ),
    [messagesResp, contactName],
  );

  function handleSend() {
    const t = draft.trim();
    if (!t || !conversationId) return;
    sendMutation.mutate(
      { content: t },
      {
        onSuccess: () => setDraft(""),
        onError: (e: Error) => toast.error(e.message || "Falha ao enviar"),
      },
    );
  }

  function handleSendNote() {
    const t = draft.trim();
    if (!t || !conversationId) return;
    sendMutation.mutate(
      { content: t, asNote: true },
      {
        onSuccess: () => setDraft(""),
        onError: (e: Error) => toast.error(e.message || "Falha ao salvar nota"),
      },
    );
  }

  // ── messages ────────────────────────────────────────────────
  let messagesNode: React.ReactNode;
  if (!conversationId) {
    messagesNode = (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]">
          <IconMessageCirclePlus size={28} />
        </div>
        <h3 className="mt-4 font-display text-[15px] font-bold text-[var(--text-primary)]">
          Sem conversa vinculada
        </h3>
        <p className="mt-1.5 max-w-[340px] font-display text-[13px] leading-relaxed text-[var(--text-muted)]">
          Este negócio ainda não tem conversa associada. Abra a Caixa de
          Entrada e vincule um contato para conversar por aqui.
        </p>
        <Link
          href="/inbox"
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-2.5 font-display text-[13px] font-bold text-white shadow-[var(--glass-shadow-sm)] transition-opacity hover:opacity-90"
        >
          <IconMessageCirclePlus size={16} />
          Abrir Caixa de Entrada
        </Link>
      </div>
    );
  } else if (bubbles.length === 0) {
    messagesNode = (
      <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-muted,#718096)]">
        Nenhuma mensagem ainda.
      </div>
    );
  } else {
    let lastDayLabel: string | null = null;
    messagesNode = bubbles.map((b) => {
      const dayLabel = formatDayLabel(b.createdAt);
      const showSeparator = dayLabel && dayLabel !== lastDayLabel;
      if (showSeparator) lastDayLabel = dayLabel;
      return (
        <Fragment key={b.id}>
          {showSeparator && <DaySeparator date={dayLabel} />}
          <MessageBubble message={b} />
        </Fragment>
      );
    });
  }

  // ── composer ────────────────────────────────────────────────
  const composerNode = conversationId ? (
    <Composer
      conversationId={conversationId}
      value={draft}
      onChange={setDraft}
      onSend={handleSend}
      onSendNote={handleSendNote}
      sending={sendMutation.isPending}
      disabled={!!sessionExpired}
      contactId={contactId}
    />
  ) : null;

  // ── session alert (opcional) ────────────────────────────────
  const sessionAlertNode = sessionExpired
    ? (
        <div className="mx-[22px] mb-3">
          <SessionAlert onUseTemplate={() => setTemplateOpen(true)} />
        </div>
      )
    : null;

  // ── template picker modal ───────────────────────────────────
  const templateModal =
    templateOpen && conversationId ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setTemplateOpen(false)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <TemplatePickerList
            conversationId={conversationId}
            onClose={() => setTemplateOpen(false)}
          />
        </div>
      </div>
    ) : null;

  return { messagesNode, composerNode, sessionAlertNode, templateModal };
}
