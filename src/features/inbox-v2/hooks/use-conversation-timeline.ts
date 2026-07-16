"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  fetchConversationTimeline,
  type ConversationTimelinePage,
} from "../api";

/**
 * Infinite query da timeline de eventos de UMA conversa.
 *
 * Bate em GET /api/conversations/:id/timeline (autorizado por
 * requireConversationAccess — agente com acesso a conversa ve).
 * Cursor composto `${occurredAtMs}_${id}` vem do backend e e opaco.
 */
export function useConversationTimeline(
  conversationId: string | null,
  opts?: { limit?: number; types?: string[]; enabled?: boolean },
) {
  return useInfiniteQuery<ConversationTimelinePage>({
    queryKey: [
      "conversation-timeline",
      conversationId,
      opts?.limit ?? null,
      opts?.types ?? null,
    ],
    queryFn: ({ pageParam }) =>
      fetchConversationTimeline(
        conversationId as string,
        (pageParam as string | null) ?? null,
        { limit: opts?.limit, types: opts?.types },
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!conversationId && (opts?.enabled ?? true),
    staleTime: 15_000,
  });
}
