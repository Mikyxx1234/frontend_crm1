"use client";

import { useMemo } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  cancelContactAutomation,
  fetchTabCounts,
  getActiveAutomations,
  getContactActiveAutomations,
  listConversations,
  type ActiveAutomationDto,
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
    const flat = pages
      .flatMap((p) => p?.items ?? [])
      .filter(Boolean) as ConversationListRow[];
    // Dedupe por `id`: o backend pagina por `updatedAt desc`, mas a UI
    // reordena no cliente por `lastMessageAt`. Quando uma conversa recebe
    // mensagem nova, ela "pula" de página no servidor e, no refetch do
    // infinite query, o mesmo `id` aparece em duas/três páginas — gerando
    // cards duplicados/triplicados. Mantemos a ocorrência mais recente
    // (maior `lastMessageAt`/`lastInboundAt`).
    const activityTs = (r: ConversationListRow) =>
      new Date(r.lastMessageAt ?? r.lastInboundAt ?? 0).getTime();
    const byId = new Map<string, ConversationListRow>();
    for (const row of flat) {
      if (!row?.id) continue;
      const prev = byId.get(row.id);
      if (!prev || activityTs(row) >= activityTs(prev)) byId.set(row.id, row);
    }
    const items: ConversationListRow[] = [...byId.values()];
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

export const activeAutomationsKey = (conversationId: string | null) =>
  ["active-automations", conversationId] as const;

/**
 * Automações vivas (RUNNING/PAUSED) do contato da conversa ativa — chip
 * "robô em execução" no header do chat. Invalidado em tempo real pelo
 * evento SSE `automation_state` (ver use-realtime.ts).
 */
export function useActiveAutomations(conversationId: string | null) {
  return useQuery<{ items: ActiveAutomationDto[] }, Error, ActiveAutomationDto[]>({
    queryKey: activeAutomationsKey(conversationId),
    queryFn: () => getActiveAutomations(conversationId as string),
    enabled: Boolean(conversationId) && !isPreviewMode(),
    staleTime: 15_000,
    select: (d) => d.items,
  });
}

/** QueryKey do botão "Robôs ativos" (por contato) — inbox e deal. */
export const contactActiveAutomationsKey = (contactId: string | null) =>
  ["active-automations-contact", contactId] as const;

/**
 * Automações vivas (RUNNING/PAUSED) do CONTATO — alimenta o botão
 * "Robôs ativos" ao lado da composer (inbox e deal). Invalidado em
 * tempo real pelo evento SSE `automation_state` (ver use-realtime.ts).
 */
export function useContactActiveAutomations(contactId: string | null) {
  return useQuery<{ items: ActiveAutomationDto[] }, Error, ActiveAutomationDto[]>({
    queryKey: contactActiveAutomationsKey(contactId),
    queryFn: () => getContactActiveAutomations(contactId as string),
    enabled: Boolean(contactId) && !isPreviewMode(),
    staleTime: 15_000,
    select: (d) => d.items,
  });
}

/** Interrompe manualmente um robô e revalida a lista do contato. */
export function useCancelAutomation(contactId: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (contextId: string) =>
      cancelContactAutomation(contactId as string, contextId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactActiveAutomationsKey(contactId) });
    },
  });
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
