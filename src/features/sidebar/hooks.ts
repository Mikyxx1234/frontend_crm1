"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSidebarPreferences, saveSidebarPreferences } from "./api";
import type { SidebarItemPreference, SidebarPreferencesResponse } from "./types";

import { isPreviewMode } from "@/lib/preview-mode";

export const SIDEBAR_PREFS_KEY = ["sidebar-preferences"] as const;

function resolveEnabled(enabled: boolean | undefined): boolean {
  return isPreviewMode() ? true : (enabled ?? true);
}

export function useSidebarPreferences(enabled?: boolean) {
  return useQuery<SidebarPreferencesResponse>({
    queryKey: SIDEBAR_PREFS_KEY,
    queryFn: fetchSidebarPreferences,
    enabled: resolveEnabled(enabled),
    staleTime: 60_000,
  });
}

export function useSaveSidebarPreferences() {
  const qc = useQueryClient();
  return useMutation<SidebarPreferencesResponse, Error, SidebarItemPreference[]>({
    mutationFn: saveSidebarPreferences,
    onSuccess: (data) => {
      // Atualiza o cache imediatamente para a nav refletir sem refetch.
      qc.setQueryData(SIDEBAR_PREFS_KEY, data);
    },
  });
}
