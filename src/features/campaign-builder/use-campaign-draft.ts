"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CampaignBuilderDraft } from "./schema";

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? "Falha na operação.");
  }
  return data as T;
}

export function useCampaignDraft(draftId?: string) {
  const queryClient = useQueryClient();
  const key = ["campaign-builder-draft", draftId ?? "new"] as const;

  const draftQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!draftId) return null;
      const res = await fetch(apiUrl(`/api/campaign-builder/drafts?id=${draftId}`), {
        cache: "no-store",
      });
      const data = await parseResponse<{ data: CampaignBuilderDraft }>(res);
      return data.data;
    },
    enabled: Boolean(draftId),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; patch: Partial<CampaignBuilderDraft> }) => {
      const method = payload.id ? "PATCH" : "POST";
      const res = await fetch(apiUrl("/api/campaign-builder/drafts"), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return parseResponse<{ data: CampaignBuilderDraft }>(res);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["campaign-builder-draft", data.data.id ?? "new"],
        data.data,
      );
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/campaign-builder/drafts/${id}/preview`), {
        method: "POST",
      });
      return parseResponse<{
        data: { count: number; sample: { id: string; name: string; phone?: string }[] };
      }>(res);
    },
  });

  const launchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/campaign-builder/drafts/${id}/launch`), {
        method: "POST",
      });
      return parseResponse<{ data: { campaignId: string; status: string } }>(res);
    },
  });

  return {
    draftQuery,
    saveMutation,
    previewMutation,
    launchMutation,
  };
}
