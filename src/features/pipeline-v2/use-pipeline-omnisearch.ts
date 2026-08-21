"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SEARCH_DEBOUNCE_MS, normalizeSearchQuery } from "@/lib/search-query";
import { fetchDealsList, type DealListItemDto } from "@/features/pipeline-v2/api/list";

const RESULT_LIMIT = 8;

export function usePipelineOmnisearch(
  search: string,
  enabled: boolean,
  pipelineId?: string | null,
) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const query = normalizeSearchQuery(debounced);
  const ready = enabled && query.length > 0;

  const deals = useQuery({
    queryKey: ["pipeline-omnisearch", pipelineId ?? "", query],
    queryFn: () =>
      fetchDealsList({
        search: query,
        page: 1,
        perPage: RESULT_LIMIT,
        pipelineId: pipelineId || undefined,
      }),
    enabled: ready,
    staleTime: 15_000,
  });

  const items: DealListItemDto[] = deals.data?.items ?? [];
  return {
    query,
    waitingDebounce: search.trim().length >= 3 && debounced !== search.trim(),
    isLoading: ready && deals.isFetching && items.length === 0,
    items,
  };
}
