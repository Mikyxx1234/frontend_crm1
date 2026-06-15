"use client";

/*
 * Conecta o painel direito do DealDetailPanel (tab "Conversa") a
 * uma conversa real do contato. Reusa hooks/components do
 * `inbox-v2` para nao reimplementar mensagens/envio.
 *
 * Retorna varios "slots" (messagesNode, composerNode, sessionAlertNode)
 * pra serem plugados nas props correspondentes do DealDetailPanel.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconLoader2, IconMessageCirclePlus } from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { getInitials } from "@/lib/utils";

import { DaySeparator, MessageBubble } from "@/components/crm/message-bubble";
import { SessionAlert } from "@/components/crm/session-alert";
import {
  Composer,
  TemplatePickerList,
  whatsappTemplateToPending,
  type PendingTemplate,
} from "@/features/inbox-v2/extras";
import {
  useAddNoteToLog,
  useConversationFeatures,
  useInboxRealtime,
  useMessages,
  usePinNote,
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
  /** Nota fixada na conversa, caso exista, para exibir na tab Notas. */
  pinnedNote: { id: string; content: string; senderName?: string | null; time?: string | null } | null;
}

export function useDealChatBinding(params: {
  conversationId: string | null;
  contactName: string;
  contactId?: string | null;
  /** ID do deal — usado para "Adicionar ao log". */
  dealId?: string | null;
  /**
   * Override opcional. Quando ausente, o hook deriva `sessionExpired` do
   * `session` retornado pela própria query `useMessages` (mesma fonte que o
   * /inbox usa). Mantemos o backend como source of truth quando disponível,
   * com fallback heurístico em `lastInboundAt` se o backend ficar silente.
   */
  sessionExpired?: boolean;
}): DealChatBindingResult {
  const { conversationId, contactName, contactId, dealId, sessionExpired: sessionExpiredOverride } = params;

  const { data: session } = useSession();
  // Fallback para o avatar das bolhas outgoing quando a mensagem não traz
  // `senderName` (ex.: histórico antigo). Mesma lógica do ChatArea do inbox.
  const agentInitials = getInitials(session?.user?.name?.trim() || "") || "·";

  const { features: convFeatures } = useConversationFeatures();

  const [draft, setDraft] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  // Template escolhido no modal (sessão expirada) → abre o painel no Composer.
  const [externalTemplate, setExternalTemplate] = useState<PendingTemplate | null>(null);

  // ── Auto-ensure da conversa ──────────────────────────────────────
  // Para a aba "Conversa" do deal ficar idêntica ao /inbox (composer com
  // "+"/templates funcionando mesmo em lead sem histórico), garantimos uma
  // conversa do contato quando o deal ainda não tem uma vinculada. Reusa o
  // endpoint `skipSend` (cria OU reutiliza a conversa WhatsApp do contato),
  // mesmo comportamento do deal detail legado (`ConversationsPanel`).
  const qc = useQueryClient();
  const [ensuredId, setEnsuredId] = useState<string | null>(null);
  const autoEnsuredRef = useRef(false);

  const ensureMutation = useMutation({
    mutationFn: async (cid: string) => {
      const res = await fetch(apiUrl("/api/conversations/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: cid, skipSend: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? "Erro ao iniciar conversa");
      return data.conversation as { id: string };
    },
    onSuccess: (conv) => {
      setEnsuredId(conv.id);
      if (contactId) qc.invalidateQueries({ queryKey: ["contact", contactId] });
    },
    onError: (err: Error) => toast.error(err.message || "Falha ao iniciar conversa"),
  });

  // Reseta o controle de auto-ensure ao trocar de deal/contato.
  useEffect(() => {
    autoEnsuredRef.current = false;
    setEnsuredId(null);
  }, [contactId]);

  useEffect(() => {
    if (!conversationId && contactId && !ensuredId && !autoEnsuredRef.current && !ensureMutation.isPending) {
      autoEnsuredRef.current = true;
      ensureMutation.mutate(contactId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, contactId, ensuredId]);

  // Id efetivo: o do deal (quando já vinculado) ou o recém-garantido.
  const effectiveConversationId = conversationId ?? ensuredId;
  const ensuring = !effectiveConversationId && !!contactId && (ensureMutation.isPending || !ensureMutation.isError);

  const { data: messagesResp } = useMessages(effectiveConversationId);
  const sendMutation = useSendMessage(effectiveConversationId);
  const pinMutation = usePinNote(effectiveConversationId);
  const addToLogMutation = useAddNoteToLog(dealId ?? null);

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
  const sessionExpired = !!effectiveConversationId && sessionExpiredDerived;

  // SSE: assina /api/sse/messages e invalida as mensagens da conversa
  // ativa quando chega new_message. Sem isto o chat do deal só atualizava
  // após F5 (useMessages não tem polling) — o inbox já fazia isso.
  useInboxRealtime({
    activeConversationId: effectiveConversationId,
    enabled: !!effectiveConversationId,
  });

  const pinnedNoteId = messagesResp?.pinnedNoteId ?? null;

  const bubbles = useMemo(
    () =>
      (messagesResp?.messages ?? []).map((m) =>
        toMessageBubble(m, contactName),
      ),
    [messagesResp, contactName],
  );

  // Nota fixada — usada pela tab Notas do deal.
  const pinnedNote = useMemo(() => {
    if (!pinnedNoteId) return null;
    const raw = (messagesResp?.messages ?? []).find((m) => m.id === pinnedNoteId);
    if (!raw) return null;
    return {
      id: raw.id,
      content: raw.content,
      senderName: raw.senderName ?? null,
      time: raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null,
    };
  }, [pinnedNoteId, messagesResp]);

  function handleSend() {
    const t = draft.trim();
    if (!t || !effectiveConversationId) return;
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
    if (!t || !effectiveConversationId) return;
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
  if (!effectiveConversationId) {
    messagesNode = ensuring ? (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[var(--text-muted)]">
        <IconLoader2 size={22} className="animate-spin" />
        <p className="font-display text-[13px]">Iniciando conversa…</p>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]">
          <IconMessageCirclePlus size={28} />
        </div>
        <h3 className="mt-4 font-display text-[15px] font-bold text-[var(--text-primary)]">
          Sem conversa vinculada
        </h3>
        <p className="mt-1.5 max-w-[340px] font-display text-[13px] leading-relaxed text-[var(--text-muted)]">
          Este negócio ainda não tem contato com WhatsApp. Vincule um contato
          com telefone para conversar por aqui.
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
      const isNoteBubble = b.isNote === true;
      return (
        <Fragment key={b.id}>
          {showSeparator && <DaySeparator date={dayLabel} />}
          <MessageBubble
            message={b}
            agentInitials={agentInitials}
            isPinned={isNoteBubble && b.id === pinnedNoteId}
            onPinNote={
              isNoteBubble && effectiveConversationId
                ? (noteId) => pinMutation.mutate({ noteId })
                : undefined
            }
            onAddToLog={
              isNoteBubble && dealId
                ? (content) =>
                    addToLogMutation.mutate(
                      { content },
                      { onSuccess: () => toast.success("Nota adicionada ao log do negócio") },
                    )
                : undefined
            }
          />
        </Fragment>
      );
    });
  }

  // ── composer ────────────────────────────────────────────────
  const composerNode = effectiveConversationId ? (
    <Composer
      conversationId={effectiveConversationId}
      value={draft}
      onChange={setDraft}
      onSend={handleSend}
      onSendNote={handleSendNote}
      sending={sendMutation.isPending}
      disabled={!!sessionExpired}
      contactId={contactId}
      externalTemplate={externalTemplate}
      onExternalTemplateConsumed={() => setExternalTemplate(null)}
      signatureAllowed={convFeatures.agentSignatureEnabled}
      signatureEditable={convFeatures.agentSignatureEditable}
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
    templateOpen && effectiveConversationId ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setTemplateOpen(false)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <TemplatePickerList
            conversationId={effectiveConversationId}
            onClose={() => setTemplateOpen(false)}
            onPick={(tpl) => {
              setExternalTemplate(whatsappTemplateToPending(tpl));
              setTemplateOpen(false);
            }}
          />
        </div>
      </div>
    ) : null;

  return { messagesNode, composerNode, sessionAlertNode, templateModal, pinnedNote };
}
