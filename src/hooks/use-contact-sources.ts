"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFilterOptions } from "@/components/pipeline/kanban-filters/api";
import type { FilterOptionsResponse } from "@/components/pipeline/kanban-filters/types";

/**
 * Origens distintas já usadas nos contatos da org (via filter-options).
 *
 * P1-2: mesma query key do painel de filtros do Kanban/Flow — este hook
 * virou um `select` sobre o cache compartilhado. Antes a key própria
 * `["contact-sources"]` furava o cache e baixava os 21KB de novo ao
 * abrir conversa/deal.
 */
export function useContactSources(enabled = true) {
  return useQuery<FilterOptionsResponse, Error, string[]>({
    queryKey: ["kanban-filter-options"],
    queryFn: fetchFilterOptions,
    select: (opts) => opts.sources ?? [],
    enabled,
    staleTime: 5 * 60_000,
  });
}
