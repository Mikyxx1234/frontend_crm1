"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMessages,
  sendAttachment,
  sendMessage,
  type InboxMessageDto,
  type MessagesResponse,
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
    { content: string; asNote?: boolean; replyToId?: string | null }
  >({
    mutationFn: (vars) =>
      sendMessage(conversationId as string, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
  });
}

/** Mutation: enviar anexo (arquivo, áudio, imagem). */
export function useSendAttachment(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    { message: InboxMessageDto },
    Error,
    { file: File | Blob; caption?: string; fileName?: string }
  >({
    mutationFn: (vars) =>
      sendAttachment(conversationId as string, vars.file, {
        caption: vars.caption,
        fileName: vars.fileName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
  });
}
