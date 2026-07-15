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
import { IconLoader2, IconMessageCirclePlus, IconPinFilled, IconX } from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { getInitials } from "@/lib/utils";

import { DaySeparator, ConnectionDivider, MessageBubble, type Message as BubbleMessage } from "@/components/crm/message-bubble";
import { SessionAlert } from "@/components/crm/session-alert";
import { usePinDurationDialog } from "@/components/crm/pin-duration-dialog";
import { formatConnectionLabel, type ConnectionRef } from "@/lib/connection-label";
import {
  Composer,
  TemplatePickerList,
  whatsappTemplateToPending,
  type PendingTemplate,
} from "@/features/inbox-v2/extras";
import {
  useAddNoteToLog,
  useConversationFeatures,
  useFavoriteMessage,
  useInboxRealtime,
  useMessages,
  usePinMessage,
  usePinNote,
  useReactMessage,
  useSelectedOutboundChannel,
  useSendMessage,
  useWhatsappChannels,
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
  /** Banner de mensagem fixada (estilo WhatsApp) — plugar em `pinnedMessageSlot`
   *  do DealDetailPanel, entre o header de tabs e a lista de mensagens. */
  pinnedMessageSlot: React.ReactNode;
  /** Conexão atual da conversa (qual WhatsApp/conta) — para exibir no header. */
  connection: ConnectionRef | null;
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
  // Mensagem selecionada para responder (estilo WhatsApp). Reset ao trocar
  // de deal/conversa e após envio bem-sucedido.
  const [replyTo, setReplyTo] = useState<{
    id: string;
    preview: string;
    senderName?: string | null;
  } | null>(null);
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
    setReplyTo(null);
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
  const reactMutation = useReactMessage(effectiveConversationId);
  const pinNoteMutation = usePinNote(effectiveConversationId);
  const pinMessageMutation = usePinMessage(effectiveConversationId);
  const favoriteMutation = useFavoriteMessage(effectiveConversationId);
  const addToLogMutation = useAddNoteToLog(dealId ?? null);
  const { requestDuration: requestPinDuration, dialog: pinDurationDialog } = usePinDurationDialog();

  // Seletor de canal — mesmo widget/hook do /inbox. Aparece só quando a
  // org tem >1 WhatsApp CONNECTED. Default = canal "atual" da conversa.
  const { data: whatsappChannels } = useWhatsappChannels(
    !!effectiveConversationId,
  );
  const conversationChannelId = messagesResp?.channel?.id ?? null;
  const { selectedChannelId, setSelectedChannelId } = useSelectedOutboundChannel(
    {
      conversationId: effectiveConversationId,
      conversationChannelId,
      availableChannels: whatsappChannels,
    },
  );

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
  // Bloco C (25/jun/26): respeita `canReply` exposto pelo backend
  // (mesma fonte que o /inbox). Compat: default true quando ausente.
  const canReply = messagesResp?.canReply ?? true;

  // SSE: assina /api/sse/messages e invalida as mensagens da conversa
  // ativa quando chega new_message. Sem isto o chat do deal só atualizava
  // após F5 (useMessages não tem polling) — o inbox já fazia isso.
  useInboxRealtime({
    activeConversationId: effectiveConversationId,
    enabled: !!effectiveConversationId,
  });

  const pinnedNoteId = messagesResp?.pinnedNoteId ?? null;
  const pinnedMessageId = messagesResp?.pinnedMessageId ?? null;

  const bubbles = useMemo(
    () =>
      (messagesResp?.messages ?? []).map((m) => {
        const bubble = toMessageBubble(m, contactName);
        return pinnedMessageId && m.id === pinnedMessageId
          ? { ...bubble, isPinnedMessage: true }
          : bubble;
      }),
    [messagesResp, contactName, pinnedMessageId],
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

  // Mensagem fixada no topo da conversa — banner estilo WhatsApp exibido
  // via `pinnedMessageSlot` no DealDetailPanel.
  const pinnedMessagePreview = useMemo(() => {
    if (!pinnedMessageId) return null;
    const raw = bubbles.find((m) => m.id === pinnedMessageId);
    if (!raw) return null;
    return { id: raw.id, content: raw.content, senderName: raw.senderName ?? null };
  }, [pinnedMessageId, bubbles]);

  function handleSend() {
    const t = draft.trim();
    if (!t || !effectiveConversationId) return;
    sendMutation.mutate(
      {
        content: t,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
        // Override só quando o canal escolhido difere do atual da conversa.
        ...(selectedChannelId && selectedChannelId !== conversationChannelId
          ? { channelId: selectedChannelId }
          : {}),
      },
      {
        onSuccess: () => {
          setDraft("");
          setReplyTo(null);
        },
        onError: (e: Error) => toast.error(e.message || "Falha ao enviar"),
      },
    );
  }

  // Handler do botão "Responder" — deriva o nome do citado a partir da
  // própria bolha (o backend não retorna esse campo diretamente).
  function handleReply(message: BubbleMessage) {
    const preview = (message.content ?? "").slice(0, 120);
    const senderName =
      message.type === "incoming"
        ? contactName
        : message.senderName ?? "Você";
    setReplyTo({ id: message.id, preview, senderName });
  }

  // Reagir dispara no /inbox e tambem aqui (drawer do pipeline). Mesma
  // rota de backend (`/api/messages/:ref/reactions`), mesma mutation.
  // `emoji` vazio = remocao (toggle-off).
  function handleReact(message: BubbleMessage, emoji: string | null) {
    if (!effectiveConversationId) return;
    reactMutation.mutate(
      { messageId: message.id, emoji: emoji ?? "" },
      {
        onError: (err) => toast.error(err.message || "Falha ao reagir"),
      },
    );
  }

  // Fixar: mesma rota/mutation do /inbox. Clicar na já fixada desafixa.
  async function handlePinMessage(message: BubbleMessage) {
    if (!effectiveConversationId) return;
    if (message.isPinnedMessage) {
      pinMessageMutation.mutate(
        { messageId: null },
        {
          onSuccess: () => toast.success("Mensagem desafixada"),
          onError: (err) => toast.error(err.message || "Falha ao desafixar"),
        },
      );
      return;
    }
    const durationHours = await requestPinDuration();
    if (durationHours == null) return;
    pinMessageMutation.mutate(
      { messageId: message.id, durationHours },
      {
        onSuccess: () => toast.success("Mensagem fixada"),
        onError: (err) => toast.error(err.message || "Falha ao fixar"),
      },
    );
  }

  function handleUnpinMessage() {
    if (!effectiveConversationId) return;
    pinMessageMutation.mutate(
      { messageId: null },
      { onError: (err) => toast.error(err.message || "Falha ao desafixar") },
    );
  }

  function handleFavorite(message: BubbleMessage) {
    favoriteMutation.mutate(
      { messageId: message.id, favorite: !message.isFavorited },
      {
        onSuccess: (res) =>
          toast.success(res.favorited ? "Mensagem favoritada" : "Removida dos favoritos"),
        onError: (err) => toast.error(err.message || "Falha ao favoritar"),
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
    // Marca troca de conexão só quando há 2+ contas distintas na conversa.
    const channelsMap = messagesResp?.channels ?? {};
    const distinctChannels = new Set(
      bubbles.map((b) => b.channelId).filter(Boolean) as string[],
    );
    const showConnSwitches = distinctChannels.size >= 2;
    let lastChannelId: string | null = null;
    messagesNode = bubbles.map((b) => {
      const dayLabel = formatDayLabel(b.createdAt);
      const showSeparator = dayLabel && dayLabel !== lastDayLabel;
      if (showSeparator) lastDayLabel = dayLabel;
      let connLabel: string | null = null;
      if (showConnSwitches && b.channelId && b.channelId !== lastChannelId) {
        const ref = channelsMap[b.channelId];
        if (ref) connLabel = formatConnectionLabel(ref);
        lastChannelId = b.channelId;
      }
      const isNoteBubble = b.isNote === true;
      return (
        <Fragment key={b.id}>
          {showSeparator && <DaySeparator date={dayLabel} />}
          {connLabel && <ConnectionDivider label={connLabel} />}
          <MessageBubble
            message={b}
            agentInitials={agentInitials}
            isPinned={isNoteBubble && b.id === pinnedNoteId}
            onPinNote={
              isNoteBubble && effectiveConversationId
                ? (noteId) => pinNoteMutation.mutate({ noteId })
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
            onReplyMessage={isNoteBubble ? undefined : handleReply}
            onReactMessage={isNoteBubble ? undefined : handleReact}
            onPinMessage={isNoteBubble ? undefined : handlePinMessage}
            onFavoriteMessage={isNoteBubble ? undefined : handleFavorite}
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
      disabled={!canReply || !!sessionExpired}
      placeholder={
        !canReply
          ? "Você não tem permissão para enviar mensagens neste canal."
          : undefined
      }
      contactId={contactId}
      externalTemplate={externalTemplate}
      onExternalTemplateConsumed={() => setExternalTemplate(null)}
      signatureAllowed={convFeatures.agentSignatureEnabled}
      signatureEditable={convFeatures.agentSignatureEditable}
      availableChannels={whatsappChannels}
      selectedChannelId={selectedChannelId}
      conversationChannelId={conversationChannelId}
      onSelectChannel={setSelectedChannelId}
      replyTo={replyTo}
      onCancelReply={() => setReplyTo(null)}
    />
  ) : null;

  // ── session alert (opcional) ────────────────────────────────
  const sessionAlertNode = sessionExpired
    ? <SessionAlert onUseTemplate={() => setTemplateOpen(true)} />
    : null;

  // ── template picker modal ───────────────────────────────────
  const templateModal = (
    <>
      {templateOpen && effectiveConversationId ? (
        <div
          className="fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/40 backdrop-blur-sm"
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
      ) : null}
      {/* Picker de duração do "Fixar" (24h/7d/30d, estilo WhatsApp) —
          o painel "Mensagens favoritas" fica no kebab do DealDetailPanel
          (TabsBar), que já tem `conversationId` disponível. */}
      {pinDurationDialog}
    </>
  );

  // ── banner de mensagem fixada ────────────────────────────────
  const pinnedMessageSlot = pinnedMessagePreview ? (
    <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/[0.06] px-3 py-2">
      <IconPinFilled size={14} className="shrink-0 text-[var(--brand-primary)]" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
          Mensagem fixada
        </p>
        <p className="truncate text-[12.5px] text-[var(--text-secondary)]">
          {pinnedMessagePreview.senderName ? `${pinnedMessagePreview.senderName}: ` : ""}
          {pinnedMessagePreview.content}
        </p>
      </div>
      <button
        type="button"
        onClick={handleUnpinMessage}
        aria-label="Desafixar mensagem"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
      >
        <IconX size={14} />
      </button>
    </div>
  ) : null;

  return {
    messagesNode,
    composerNode,
    sessionAlertNode,
    templateModal,
    pinnedNote,
    pinnedMessageSlot,
    connection: messagesResp?.channel ?? null,
  };
}
