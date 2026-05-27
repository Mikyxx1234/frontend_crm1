"use client";

import { useQuery } from "@tanstack/react-query";

import { getDeal } from "../api";

/** Carrega detalhes completos do deal (DealDetailPanel). */
export function useDealDetail(dealId: string | null) {
  return useQuery({
    queryKey: ["deal-detail-v2", dealId ?? "__none__"],
    queryFn: () => getDeal(dealId as string),
    enabled: !!dealId,
    staleTime: 15_000,
  });
}
