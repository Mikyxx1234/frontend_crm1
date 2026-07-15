"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addNoteToLog,
  favoriteMessage,
  getMessages,
  pinMessage,
  pinNote,
  sendAttachment,
  sendMessage,
  sendReaction,
  type InboxMessageDto,
  type MessagesResponse,
  type ReactionDto,
} from "../api";

export function messagesKey(conversationId: string | null | undefined) {
  return ["messages", conversationId ?? "__none__"] as const;
}

/** Histórico da conversa ativa. */
export function useMessages(conversationId: string | null) {
  return useQuery<MessagesResponse>({
    queryKey: messagesKey(conversationId),
    queryFn: () => getMessages(conversationId as string),
    enabled: !!conversationId,
    staleTime: 5_000,
  });
}

/** Mutation: enviar mensagem de texto ou nota interna. */
export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { message: InboxMessageDto; metaError?: string },
    Error,
    {
      content: string;
      asNote?: boolean;
      replyToId?: string | null;
      channelId?: string | null;
    }
  >({
    mutationFn: (vars) =>
      sendMessage(conversationId as string, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
  });
}

/** Mutation: fixar / desafixar nota interna de uma conversa. */
export function usePinNote(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { id: string; pinnedNoteId: string | null },
    Error,
    { noteId: string | null }
  >({
    mutationFn: ({ noteId }) => pinNote(conversationId as string, noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}

/** Mutation: criar nota de deal (adiciona ao log/timeline do negócio). */
export function useAddNoteToLog(dealId: string | null) {
  const qc = useQueryClient();
  return useMutation<{ id: string; content: string }, Error, { content: string }>({
    mutationFn: ({ content }) => addNoteToLog(dealId as string, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-timeline"] });
      qc.invalidateQueries({ queryKey: ["deal-notes", dealId] });
    },
  });
}

/**
 * Mutation: reagir a uma mensagem (agente → cliente).
 *
 * `emoji` vazio (`""`) = remover a reação anterior deste agente
 * (toggle-off segue o comportamento oficial do WhatsApp Cloud API).
 *
 * O backend atualiza `Message.reactions` no DB e propaga a reação
 * para o cliente via Meta Graph (quando o canal é Cloud API e a
 * mensagem tem `wamid`).
 */
export function useReactMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { reactions?: ReactionDto[]; metaError?: string },
    Error,
    { messageId: string; emoji: string }
  >({
    mutationFn: ({ messageId, emoji }) => sendReaction(messageId, emoji),
    onSuccess: () => {
      // Reação altera `Message.reactions` — refetch da conversa ativa
      // pra refletir o badge no bubble sem esperar o SSE.
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}

/**
 * Mutation: fixar / desafixar mensagem no topo da conversa (banner
 * estilo WhatsApp). Diferente de `usePinNote` — aceita qualquer
 * mensagem, não só notas internas. Slot único: fixar substitui a
 * anterior automaticamente (mesmo comportamento do WhatsApp).
 */
export function usePinMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { id: string; pinnedMessageId: string | null },
    Error,
    { messageId: string | null }
  >({
    mutationFn: ({ messageId }) => pinMessage(conversationId as string, messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}

/**
 * Mutation: favoritar / desfavoritar mensagem — marcador PESSOAL do
 * agente logado (não aparece pra outros agentes). Sem `favorite`
 * explícito, o backend alterna o estado atual.
 */
export function useFavoriteMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { favorited: boolean },
    Error,
    { messageId: string; favorite?: boolean }
  >({
    mutationFn: ({ messageId, favorite }) => favoriteMessage(messageId, favorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}

/** Mutation: enviar anexo (arquivo, áudio, imagem). */
export function useSendAttachment(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { message: InboxMessageDto },
    Error,
    {
      file: File | Blob;
      caption?: string;
      fileName?: string;
      channelId?: string | null;
    }
  >({
    mutationFn: (vars) =>
      sendAttachment(conversationId as string, vars.file, {
        caption: vars.caption,
        fileName: vars.fileName,
        channelId: vars.channelId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
  });
}
