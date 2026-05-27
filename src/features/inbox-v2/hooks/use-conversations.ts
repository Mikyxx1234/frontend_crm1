"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchTabCounts,
  listConversations,
  type ConversationListResponse,
  type InboxFilters,
  type InboxTab,
  type TabCounts,
} from "../api";

/**
 * Lista paginada de conversas da aba ativa.
 * QueryKey mantém o prefixo `inbox-conversations` da Fase 1 para
 * preservar a invalidação cruzada feita pelos componentes do CRM.
 */
export function useConversations(params: {
  tab: InboxTab;
  filters: InboxFilters;
  search: string;
  enabled?: boolean;
}) {
  return useQuery<ConversationListResponse>({
    queryKey: ["inbox-conversations", params.tab, params.filters, params.search],
    queryFn: () =>
      listConversations({
        tab: params.tab,
        ...params.filters,
        search: params.search,
      }),
    enabled: params.enabled ?? true,
    refetchInterval: 20_000,
    staleTime: 5_000,
  });
}

/** Counts das abas (badges no header). */
export function useTabCounts(enabled = true) {
  return useQuery<TabCounts>({
    queryKey: ["conversations", "tab-counts"],
    queryFn: fetchTabCounts,
    refetchInterval: 15_000,
    enabled,
  });
}
