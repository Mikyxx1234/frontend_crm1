/*
 * Camada de API da Central de Widgets.
 *
 * Endpoints (backend):
 *   GET  /api/widgets            -> { items: WidgetDto[] }
 *   POST /api/widgets/install    -> { slug, installed: true }
 *   POST /api/widgets/uninstall  -> { slug, installed: false }
 *
 * Segue o mesmo padrao getJson/sendJson das outras features v2 para
 * diferenciar "sessao expirada" (corpo vazio) de "erro real do backend".
 */

import { apiUrl } from "@/lib/api";
import { isPageMockMode } from "@/lib/page-mock-mode";

import type { WidgetDto, WidgetsResponse } from "./types";
import { MOCK_WIDGETS_RESPONSE } from "./mock";

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

export function fetchWidgets(): Promise<WidgetsResponse> {
  if (isPageMockMode()) {
    return Promise.resolve(MOCK_WIDGETS_RESPONSE);
  }
  return getJson<WidgetsResponse>("/api/widgets", "Erro ao carregar widgets.");
}

export function installWidget(slug: string): Promise<{ slug: string; installed: boolean }> {
  return sendJson<{ slug: string; installed: boolean }>(
    "/api/widgets/install",
    "POST",
    { slug },
    "Erro ao instalar widget.",
  );
}

export function uninstallWidget(slug: string): Promise<{ slug: string; installed: boolean }> {
  return sendJson<{ slug: string; installed: boolean }>(
    "/api/widgets/uninstall",
    "POST",
    { slug },
    "Erro ao remover widget.",
  );
}

export interface WidgetSsoResponse {
  token: string;
  iframeUrl: string;
  /** Epoch seconds quando o token expira (TTL 5 min). */
  exp: number;
}

/** Solicita um token SSO curto pra abrir o iframe do widget de parceiro. */
export function fetchWidgetSso(slug: string): Promise<WidgetSsoResponse> {
  return getJson<WidgetSsoResponse>(
    `/api/widgets/${encodeURIComponent(slug)}/sso-token`,
    "Erro ao abrir widget.",
  );
}

export type { WidgetDto };
