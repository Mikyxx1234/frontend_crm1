"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { isPageMockMode } from "@/lib/page-mock-mode";
import { isPreviewMode } from "@/lib/preview-mode";

import {
  createCampaign,
  fetchAudienceOptions,
  fetchCampaign,
  fetchCampaignStats,
  fetchCampaigns,
  fetchChannels,
  fetchRecipients,
  fetchSegments,
  fetchTemplates,
  previewAudience,
  runCampaignAction,
  type FetchCampaignsParams,
  type FetchRecipientsParams,
} from "./api";
import type {
  CampaignAction,
  CampaignFilters,
  CampaignStatus,
  CreateCampaignBody,
} from "./types";

export const CAMPAIGNS_KEY = ["campaigns"] as const;

function resolveEnabled(enabled: boolean | undefined): boolean {
  return isPreviewMode() || isPageMockMode() ? true : (enabled ?? true);
}

/** Status que ainda mudam sozinhos no backend (precisam de polling). */
const ACTIVE_STATUSES: CampaignStatus[] = [
  "SCHEDULED",
  "PROCESSING",
  "SENDING",
];

function hasActiveCampaign(statuses: CampaignStatus[]): boolean {
  return statuses.some((s) => ACTIVE_STATUSES.includes(s));
}

export function useCampaigns(params: FetchCampaignsParams = {}, enabled = true) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, "list", params],
    queryFn: () => fetchCampaigns(params),
    enabled: resolveEnabled(enabled),
    staleTime: 5_000,
    refetchInterval: (query) =>
      query.state.data &&
      hasActiveCampaign(query.state.data.items.map((c) => c.status))
        ? 10_000
        : false,
  });
}

export function useCampaign(id: string, enabled = true) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, "detail", id],
    queryFn: () => fetchCampaign(id),
    enabled: resolveEnabled(enabled) && !!id,
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.includes(query.state.data.status)
        ? 5_000
        : false,
  });
}

export function useCampaignStats(
  id: string,
  isActive: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, "stats", id],
    queryFn: () => fetchCampaignStats(id),
    enabled: resolveEnabled(enabled) && !!id,
    refetchInterval: isActive ? 10_000 : false,
  });
}

export function useCampaignRecipients(
  id: string,
  params: FetchRecipientsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, "recipients", id, params],
    queryFn: () => fetchRecipients(id, params),
    enabled: resolveEnabled(enabled) && !!id,
  });
}

export function useCampaignAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: CampaignAction) => runCampaignAction(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, "detail", id] });
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, "stats", id] });
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, "list"] });
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCampaignBody) => createCampaign(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, "list"] });
    },
  });
}

export function usePreviewAudience() {
  return useMutation({
    mutationFn: (filters: CampaignFilters) => previewAudience(filters),
  });
}

// ── Recursos auxiliares (cacheados por mais tempo) ──

export function useChannels(enabled = true) {
  return useQuery({
    queryKey: ["campaigns", "channels"],
    queryFn: fetchChannels,
    enabled: resolveEnabled(enabled),
    staleTime: 60_000,
  });
}

export function useSegments(enabled = true) {
  return useQuery({
    queryKey: ["campaigns", "segments"],
    queryFn: fetchSegments,
    enabled: resolveEnabled(enabled),
    staleTime: 60_000,
  });
}

export function useTemplates(enabled = true) {
  return useQuery({
    queryKey: ["campaigns", "templates"],
    queryFn: fetchTemplates,
    enabled: resolveEnabled(enabled),
    staleTime: 60_000,
  });
}

export function useAudienceOptions(enabled = true) {
  return useQuery({
    queryKey: ["campaigns", "audience-options"],
    queryFn: fetchAudienceOptions,
    enabled: resolveEnabled(enabled),
    staleTime: 60_000,
  });
}
