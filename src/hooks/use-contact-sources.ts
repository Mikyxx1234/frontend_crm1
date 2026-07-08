"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFilterOptions } from "@/components/pipeline/kanban-filters/api";

/** Origens distintas já usadas nos contatos da org (via filter-options). */
export function useContactSources(enabled = true) {
  return useQuery<string[]>({
    queryKey: ["contact-sources"],
    queryFn: async () => {
      const opts = await fetchFilterOptions();
      return opts.sources ?? [];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
