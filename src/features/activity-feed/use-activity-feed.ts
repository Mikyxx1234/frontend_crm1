"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  fetchActivityFeed,
  type ActivityFeedFilters,
  type ActivityFeedPage,
} from "./api";

/// Infinite query do feed global de atividade. Cursor composto
/// `${occurredAtMs}_${id}` vem do backend e e opaco para o consumidor.
export function useActivityFeed(filters: ActivityFeedFilters) {
  return useInfiniteQuery<ActivityFeedPage>({
    queryKey: ["activity-feed", filters],
    queryFn: ({ pageParam }) => fetchActivityFeed(filters, (pageParam as string | null) ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });
}
