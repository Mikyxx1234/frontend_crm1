/*
 * Camada de API da personalizacao da sidebar (preferencias do usuario).
 *
 * Endpoints (backend):
 *   GET   /api/profile/preferences           -> { sidebar: { items } }
 *   PATCH /api/profile/preferences/sidebar   -> { sidebar: { items } }
 */

import { apiUrl } from "@/lib/api";

import type { SidebarItemPreference, SidebarPreferencesResponse } from "./types";

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

async function sendJson<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
  errLabel: string,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
  if (!text.trim()) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}

export function fetchSidebarPreferences(): Promise<SidebarPreferencesResponse> {
  return getJson<SidebarPreferencesResponse>(
    "/api/profile/preferences",
    "Erro ao carregar preferências.",
  );
}

export function saveSidebarPreferences(
  items: SidebarItemPreference[],
): Promise<SidebarPreferencesResponse> {
  return sendJson<SidebarPreferencesResponse>(
    "/api/profile/preferences/sidebar",
    "PATCH",
    { items },
    "Erro ao salvar preferências.",
  );
}
