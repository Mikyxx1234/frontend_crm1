"use client";

import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { isPreviewMode } from "@/lib/preview-mode";

export interface DealCustomField {
  fieldId: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  value: string | null;
}

async function fetchDealCustomFields(dealId: string): Promise<DealCustomField[]> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/custom-fields`));
  if (!res.ok) throw new Error("Erro ao carregar campos do negócio");
  return res.json();
}

/** Carrega os campos personalizados de um negócio via GET /api/deals/:dealId/custom-fields. */
export function useDealCustomFields(dealId: string | null) {
  return useQuery({
    queryKey: ["deal-custom-fields", dealId ?? "__none__"],
    queryFn: () => {
      if (isPreviewMode()) return Promise.resolve<DealCustomField[]>([]);
      return fetchDealCustomFields(dealId as string);
    },
    enabled: !!dealId,
    staleTime: 30_000,
  });
}
