"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SEARCH_DEBOUNCE_MS, normalizeSearchQuery } from "@/lib/search-query";
import { fetchContacts, type ContactListItemDto } from "@/features/directory-v2/api";
import { fetchCompanies, type CompanyListItemDto } from "@/features/directory-v2/api";

const RESULT_LIMIT = 8;

function useDebouncedQuery(search: string) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);
  const query = normalizeSearchQuery(debounced);
  return {
    query,
    waitingDebounce: search.trim().length >= 3 && debounced !== search.trim(),
  };
}

export function useContactsOmnisearch(search: string, enabled: boolean) {
  const { query, waitingDebounce } = useDebouncedQuery(search);
  const ready = enabled && query.length > 0;

  const q = useQuery({
    queryKey: ["contacts-omnisearch", query],
    queryFn: () => fetchContacts({ search: query, page: 1, perPage: RESULT_LIMIT }),
    enabled: ready,
    staleTime: 15_000,
  });

  const items: ContactListItemDto[] = q.data?.items ?? [];
  return {
    query,
    waitingDebounce,
    isLoading: ready && q.isFetching && items.length === 0,
    items,
  };
}

export function useCompaniesOmnisearch(search: string, enabled: boolean) {
  const { query, waitingDebounce } = useDebouncedQuery(search);
  const ready = enabled && query.length > 0;

  const q = useQuery({
    queryKey: ["companies-omnisearch", query],
    queryFn: () => fetchCompanies({ search: query, page: 1, perPage: RESULT_LIMIT }),
    enabled: ready,
    staleTime: 15_000,
  });

  const items: CompanyListItemDto[] = q.data?.items ?? [];
  return {
    query,
    waitingDebounce,
    isLoading: ready && q.isFetching && items.length === 0,
    items,
  };
}
