"use client";

import { useQuery } from "@tanstack/react-query";

import { getDeal } from "../api";

/** Chave do cache do detail panel — exportada para uso em mutations. */
export const dealDetailKey = (dealId: string | null) =>
  ["deal-detail-v2", dealId ?? "__none__"] as const;

/** Carrega detalhes completos do deal (DealDetailPanel). */
export function useDealDetail(dealId: string | null) {
  return useQuery({
    queryKey: dealDetailKey(dealId),
    queryFn: () => getDeal(dealId as string),
    enabled: !!dealId,
    staleTime: 30_000,
    // Reabrir o mesmo deal (ou voltar via histórico) usa cache sem skeleton.
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
