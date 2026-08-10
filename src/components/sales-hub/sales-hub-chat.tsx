"use client";

/**
 * SalesHubChat — o chat do Sales Hub é o MESMO stack do `/inbox`.
 *
 * O Sales Hub usava `ConversationHeader` + `ChatWindow` (stack legado do
 * inbox v1): bolhas inline, composer de uma linha e header WhatsApp-like.
 * O `/inbox` renderiza `ChatArea` (header + bolhas `MessageBubble` +
 * separadores de dia) com `composerSlot={<Composer />}` do inbox-v2.
 * Eram dois componentes diferentes — nenhum ajuste de estilo no
 * `ChatWindow` deixaria os dois iguais.
 *
 * Este componente replica a ligação de dados do `/inbox` (`_v2-client`)
 * para um deal: mesmas queries, mesmas mutations, mesmos componentes
 * visuais. As ações específicas de negócio (Ganho/Perdido, gaveta CRM)
 * entram por `headerActionsSlot`.
 */

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { ChatArea } from "@/components/crm/chat-area";
import type { Message as BubbleMessage } from "@/components/crm/message-bubble";
import { usePinDurationDialog } from "@/components/crm/pin-duration-dialog";
import { ActivitiesPanel } from "@/components/pipeline/deal-workspace/panels/activities";
import { isSessionExpired, toMessageBubble } from "@/features/inbox-v2/adapters";
import {
  useConversationFeatures,
  useFavoriteMessage,
  useInboxRealtime,
  useMessages,
  usePinMessage,
  useReactMessage,
  useSelectedOutboundChannel,
  useSendMessage,
  useUnpinMessage,
  useWhatsappChannels,
} from "@/features/inbox-v2/hooks";
import {
  Composer,
  ConversationTimelineTab,
  TemplatePickerList,
  whatsappTemplateToPending,
  type PendingTemplate,
} from "@/features/inbox-v2/extras";
import { DealNotesTab } from "@/features/pipeline-v2/extras";
import { CallHistoryList } from "@/features/softphone/components/call-history-list";

export type SalesHubChatProps = {
  conversationId: string;
  conversationStatus?: string | null;
  conversationNumber?: number | null;
  conversationClosedAt?: string | null;
  /** `lastInboundAt` da conversa — fallback da janela de 24h da Meta. */
  lastInboundAt?: string | null;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  contactChannel?: string | null;
  dealId: string;
  pipelineId?: string | null;
  /** Ações à direita do header (Ganho/Perdido, gaveta CRM, kebab…). */
  headerActionsSlot?: React.ReactNode;
  /**
   * Enviar numa conversa encerrada reabre como NOVO ticket (id novo). O
   * host precisa trocar a conversa ativa, senão a UI fica presa no
   * ticket antigo e parece que o envio não funcionou.
   */
  onConversationReopened?: (newConversationId: string) => void;
};

export function SalesHubChat({
  conversationId,
  conversationStatus,
  conversationNumber,
  conversationClosedAt,
  lastInboundAt,
  contactId,
  contactName,
  contactPhone,
  contactChannel,
  dealId,
  pipelineId,
  headerActionsSlot,
  onConversationReopened,
}: SalesHubChatProps) {
  const { data: session } = useSession();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    preview: string;
    senderName?: string | null;
  } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [externalTemplate, setExternalTemplate] =
    useState<PendingTemplate | null>(null);

  useEffect(() => {
    setDraft("");
    setReplyTo(null);
  }, [conversationId]);

  const { data: messagesData } = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const reactMessage = useReactMessage(conversationId);
  const pinMessage = usePinMessage(conversationId);
  const unpinMessage = useUnpinMessage(conversationId);
  const favoriteMessage = useFavoriteMessage(conversationId);
  const { features: convFeatures } = useConversationFeatures();
  const { requestDuration: requestPinDuration, dialog: pinDurationDialog } =
    usePinDurationDialog();

  useInboxRealtime({
    activeConversationId: conversationId,
    currentUserId: session?.user?.id ?? null,
    enabled: !!conversationId,
  });

  const { data: whatsappChannels } = useWhatsappChannels(!!conversationId);
  const conversationChannelId = messagesData?.channel?.id ?? null;
  const { selectedChannelId, setSelectedChannelId } = useSelectedOutboundChannel(
    { conversationId, conversationChannelId, availableChannels: whatsappChannels },
  );

  const pinnedMessageIds = useMemo(
    () => messagesData?.pinnedMessageIds ?? [],
    [messagesData?.pinnedMessageIds],
  );
  const pinnedIdSet = useMemo(
    () => new Set(pinnedMessageIds),
    [pinnedMessageIds],
  );
  const messageBubbles = useMemo(
    () =>
      (messagesData?.messages ?? []).map((m) => {
        const bubble = toMessageBubble(m, contactName);
        return pinnedIdSet.has(m.id)
          ? { ...bubble, isPinnedMessage: true }
          : bubble;
      }),
    [messagesData?.messages, contactName, pinnedIdSet],
  );
  const pinnedMessagesPreview = useMemo(
    () =>
      pinnedMessageIds
        .map((pid) => messageBubbles.find((m) => m.id === pid))
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m) => ({
          id: m.id,
          content: m.content,
          senderName: m.senderName ?? null,
        })),
    [pinnedMessageIds, messageBubbles],
  );

  // Janela de 24h da Meta — backend é source of truth (`session.active`),
  // com fallback heurístico em `lastInboundAt`. Mesma regra do /inbox.
  const sessionInfo = messagesData?.session;
  const sessionExpired = messagesData
    ? sessionInfo?.active !== undefined
      ? !sessionInfo.active
      : isSessionExpired(sessionInfo?.lastInboundAt ?? lastInboundAt ?? null)
    : false;
  const canReply = messagesData?.canReply ?? true;
  const isResolved = conversationStatus === "RESOLVED";

  async function handleSend(value: string) {
    try {
      const data = await sendMessage.mutateAsync({
        content: value,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
        ...(selectedChannelId && selectedChannelId !== conversationChannelId
          ? { channelId: selectedChannelId }
          : {}),
      });
      setDraft("");
      setReplyTo(null);
      if (data.reopenedConversationId) {
        onConversationReopened?.(data.reopenedConversationId);
      }
    } catch (err) {
      toast.error((err as Error)?.message || "Falha ao enviar");
      throw err;
    }
  }

  function handleSendNote(value: string) {
    sendMessage.mutate(
      { content: value, asNote: true },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(err.message || "Falha ao salvar nota"),
      },
    );
  }

  function handleReplyMessage(message: BubbleMessage) {
    setReplyTo({
      id: message.id,
      preview: (message.content ?? "").slice(0, 120),
      senderName:
        message.type === "incoming" ? contactName : (message.senderName ?? "Você"),
    });
  }

  function handleReactMessage(msg: { id: string }, emoji: string | null) {
    // `null` = pedido de abrir o picker (não muta). `""` = remover reação.
    if (emoji == null) return;
    reactMessage.mutate(
      { messageId: msg.id, emoji },
      { onError: (err) => toast.error(err.message || "Falha ao reagir") },
    );
  }

  async function handlePinMessage(msg: {
    id: string;
    isPinnedMessage?: boolean;
  }) {
    if (msg.isPinnedMessage) {
      unpinMessage.mutate(
        { messageId: msg.id },
        {
          onSuccess: () => toast.success("Mensagem desafixada"),
          onError: (err) => toast.error(err.message || "Falha ao desafixar"),
        },
      );
      return;
    }
    const durationHours = await requestPinDuration();
    if (durationHours == null) return;
    pinMessage.mutate(
      { messageId: msg.id, durationHours },
      {
        onSuccess: () => toast.success("Mensagem fixada"),
        onError: (err) => toast.error(err.message || "Falha ao fixar"),
      },
    );
  }

  function handleUnpinMessage(messageId: string) {
    unpinMessage.mutate(
      { messageId },
      { onError: (err) => toast.error(err.message || "Falha ao desafixar") },
    );
  }

  function handleFavoriteMessage(msg: { id: string; isFavorited?: boolean }) {
    favoriteMessage.mutate(
      { messageId: msg.id, favorite: !msg.isFavorited },
      {
        onSuccess: (res) =>
          toast.success(
            res.favorited ? "Mensagem favoritada" : "Removida dos favoritos",
          ),
        onError: (err) => toast.error(err.message || "Falha ao favoritar"),
      },
    );
  }

  return (
    <>
      <ChatArea
        contact={{
          name: contactName,
          contactId,
          phone: contactPhone ?? undefined,
          channel: contactChannel ?? null,
        }}
        messages={messageBubbles}
        showSessionAlert={sessionExpired}
        connection={messagesData?.channel ?? null}
        connections={messagesData?.channels}
        conversationNumber={conversationNumber ?? null}
        conversationResolved={isResolved}
        conversationClosedAt={conversationClosedAt ?? null}
        onUseTemplate={() => setTemplateOpen(true)}
        onReplyMessage={handleReplyMessage}
        onReactMessage={handleReactMessage}
        onPinMessage={handlePinMessage}
        onFavoriteMessage={handleFavoriteMessage}
        pinnedMessages={pinnedMessagesPreview}
        onUnpinMessage={handleUnpinMessage}
        headerActionsSlot={headerActionsSlot}
        className="rounded-none border-0 shadow-none backdrop-blur-none"
        notesSlot={<DealNotesTab dealId={dealId} pipelineId={pipelineId} />}
        activitiesSlot={
          <div className="flex-1 overflow-auto">
            <ActivitiesPanel dealId={dealId} />
          </div>
        }
        timelineSlot={<ConversationTimelineTab conversationId={conversationId} />}
        callsSlot={
          <div className="flex-1 overflow-auto p-4">
            <CallHistoryList embedded contactId={contactId} />
          </div>
        }
        composerSlot={
          <Composer
            conversationId={conversationId}
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            onSendNote={handleSendNote}
            sending={sendMessage.isPending}
            disabled={!canReply || sessionExpired}
            placeholder={
              !canReply
                ? "Você não tem permissão para enviar mensagens neste canal."
                : undefined
            }
            isResolved={isResolved}
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
            onReopenNewConversation={onConversationReopened}
            conversationNumber={conversationNumber ?? null}
          />
        }
      />

      {templateOpen ? (
        <div
          className="fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setTemplateOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <TemplatePickerList
              conversationId={conversationId}
              channelId={selectedChannelId}
              onClose={() => setTemplateOpen(false)}
              onPick={(tpl) => {
                setExternalTemplate(whatsappTemplateToPending(tpl));
                setTemplateOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}

      {pinDurationDialog}
    </>
  );
}
