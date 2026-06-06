"use client";

/*
 * Camada de API + hooks da personalizacao do dashboard (layout dos blocos).
 * Espelha o padrao da sidebar (features/sidebar).
 *
 * Endpoints (backend):
 *   GET   /api/profile/preferences            -> { sidebar, dashboard: { blocks } }
 *   PATCH /api/profile/preferences/dashboard  -> { dashboard: { blocks } }
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";
import { isPreviewMode } from "@/lib/preview-mode";
import type { DashboardBlockPreference } from "@/lib/dashboard-blocks-catalog";

export interface DashboardPreferences {
  blocks: DashboardBlockPreference[];
}

interface PreferencesResponse {
  dashboard: DashboardPreferences;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  const text = await res.text();
  if (!res.ok) {
    let message = "Erro ao carregar preferências.";
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      /* corpo nao-JSON */
    }
    throw new Error(message);
  }
  if (!text.trim()) {
    throw new Error("Sessão expirada. Recarregue e faça login.");
  }
  return JSON.parse(text) as T;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = "Erro ao salvar preferências.";
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      /* corpo nao-JSON */
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

export function fetchDashboardPreferences(): Promise<PreferencesResponse> {
  return getJson<PreferencesResponse>("/api/profile/preferences");
}

export function saveDashboardPreferences(
  blocks: DashboardBlockPreference[],
): Promise<PreferencesResponse> {
  return patchJson<PreferencesResponse>("/api/profile/preferences/dashboard", {
    blocks,
  });
}

export const DASHBOARD_PREFS_KEY = ["dashboard-preferences"] as const;

export function useDashboardPreferences(enabled = true) {
  return useQuery<PreferencesResponse>({
    queryKey: DASHBOARD_PREFS_KEY,
    queryFn: fetchDashboardPreferences,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 60_000,
  });
}

export function useSaveDashboardPreferences() {
  const qc = useQueryClient();
  return useMutation<PreferencesResponse, Error, DashboardBlockPreference[]>({
    mutationFn: saveDashboardPreferences,
    onSuccess: (data) => {
      qc.setQueryData(DASHBOARD_PREFS_KEY, data);
    },
  });
}
