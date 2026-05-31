"use client";

/*
 * Conecta o painel direito do DealDetailPanel (tab "Conversa") a
 * uma conversa real do contato. Reusa hooks/components do
 * `inbox-v2` para nao reimplementar mensagens/envio.
 *
 * Retorna varios "slots" (messagesNode, composerNode, sessionAlertNode)
 * pra serem plugados nas props correspondentes do DealDetailPanel.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconMessageCirclePlus } from "@tabler/icons-react";

import { MessageBubble } from "@/components/crm/message-bubble";
import { SessionAlert } from "@/components/crm/session-alert";
import { Composer, TemplatePickerList } from "@/features/inbox-v2/extras";
import {
  useMessages,
  useSendMessage,
} from "@/features/inbox-v2/hooks";
import { toMessageBubble } from "@/features/inbox-v2/adapters";

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
  sessionExpired?: boolean;
}): DealChatBindingResult {
  const { conversationId, contactName, contactId, sessionExpired } = params;

  const [draft, setDraft] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  const { data: messagesResp } = useMessages(conversationId);
  const sendMutation = useSendMessage(conversationId);

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
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--text-muted,#718096)]">
        <IconMessageCirclePlus size={36} className="opacity-40" />
        <div className="font-display text-[13px] font-semibold">
          Sem conversa vinculada
        </div>
        <p className="max-w-xs text-[12px]">
          Este negocio ainda nao tem conversa associada. Abra a Caixa de
          Entrada e vincule um contato para conversar por aqui.
        </p>
      </div>
    );
  } else if (bubbles.length === 0) {
    messagesNode = (
      <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-muted,#718096)]">
        Nenhuma mensagem ainda.
      </div>
    );
  } else {
    messagesNode = bubbles.map((b) => <MessageBubble key={b.id} message={b} />);
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
