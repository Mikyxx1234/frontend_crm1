/*
 * Camada de API da sidebar EFETIVA do usuario (derivada dos Roles).
 *
 * 14/jul/26: `saveSidebarPreferences` foi removido. A gravacao agora e feita
 * pelo admin em cada Role (via `useUpdateRole` do features/permissions).
 * Ver AGENT.md "Sidebar por Papel".
 *
 * Endpoints (backend):
 *   GET /api/profile/preferences  -> { sidebar: { items } } (uniao dos roles)
 */

import { apiUrl } from "@/lib/api";

import type { SidebarPreferencesResponse } from "./types";

async function getJson<T>(path: string, errLabel: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  const text = await res.text();
  if (!res.ok) {
    let message = errLabel;
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      /* corpo nao-JSON */
    }
    throw new Error(message);
  }
  if (!text.trim()) {
    throw new Error("Sessão expirada ou backend indisponível. Recarregue e faça login.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Sessão não reconhecida pelo backend. Recarregue e faça login.");
  }
}

export function fetchSidebarPreferences(): Promise<SidebarPreferencesResponse> {
  return getJson<SidebarPreferencesResponse>(
    "/api/profile/preferences",
    "Erro ao carregar preferências.",
  );
}
