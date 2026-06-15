"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  fetchTabCounts,
  listConversations,
  type ConversationListResponse,
  type ConversationListRow,
  type InboxFilters,
  type InboxTab,
  type TabCounts,
} from "../api";

import { isPreviewMode } from "@/lib/preview-mode";

/**
 * Page size pedido por request. O backend tem cap em 200 (ver
 * `_backend/src/services/conversations.ts`). Mantemos 60 pra latência
 * baixa do primeiro paint — o infinite scroll cobre o resto.
 */
const PAGE_SIZE = 60;

/**
 * Lista paginada (infinite) de conversas da aba ativa.
 * QueryKey mantém o prefixo `inbox-conversations` da Fase 1 para
 * preservar a invalidação cruzada feita pelos componentes do CRM.
 *
 * Retorna shape compatível com o consumo anterior (`data?.items`)
 * agregando todas as páginas já carregadas, e expõe controles
 * de paginação (`fetchNextPage`/`hasNextPage`/`isFetchingNextPage`)
 * para o trigger de scroll infinito da coluna.
 */
export function useConversations(params: {
  tab: InboxTab;
  filters: InboxFilters;
  search: string;
  enabled?: boolean;
}) {
  const query = useInfiniteQuery<ConversationListResponse>({
    queryKey: ["inbox-conversations", params.tab, params.filters, params.search],
    queryFn: ({ pageParam = 1 }) =>
      listConversations({
        tab: params.tab,
        ...params.filters,
        search: params.search,
        page: pageParam as number,
        perPage: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const page = last.page ?? 1;
      const perPage = last.perPage ?? PAGE_SIZE;
      const total = last.total ?? 0;
      const loaded = page * perPage;
      return loaded < total ? page + 1 : undefined;
    },
    enabled: isPreviewMode() ? true : (params.enabled ?? true),
    refetchInterval: 20_000,
    staleTime: 5_000,
  });

  // Agrega todas as páginas carregadas em um único `items[]` pra
  // manter o shape esperado pelos consumidores legados.
  const data = useMemo<ConversationListResponse | undefined>(() => {
    if (!query.data) return undefined;
    const pages = query.data.pages;
    // `p?.items ?? []` evita injetar `undefined` no array agregado quando uma
    // página vem sem `items` (resposta malformada ou page patchada pelo
    // realtime). O `.filter(Boolean)` blinda contra buracos em `items[]`.
    // Sem isso, `rows.map((r) => r.id)` quebra com "Cannot read 'id'".
    const items: ConversationListRow[] = pages
      .flatMap((p) => p?.items ?? [])
      .filter(Boolean) as ConversationListRow[];
    const last = pages[pages.length - 1];
    return {
      items,
      total: last.total,
      page: last.page,
      perPage: last.perPage,
    };
  }, [query.data]);

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

/** Counts das abas (badges no header). */
export function useTabCounts(enabled = true) {
  return useQuery<TabCounts>({
    queryKey: ["conversations", "tab-counts"],
    queryFn: fetchTabCounts,
    refetchInterval: 15_000,
    enabled: isPreviewMode() ? true : enabled,
  });
}
