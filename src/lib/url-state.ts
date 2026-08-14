/**
 * Primitivas de estado na URL (query string) compartilhadas por Inbox e
 * Pipeline.
 *
 * Escrevemos via History API (`pushState`/`replaceState`) em vez de
 * `router.push/replace` do App Router: a página do CRM é RSC e o replace do
 * Next refaz o payload do servidor a cada tecla digitada — foi a causa do
 * board voltar a "Todos 0" e do deep-link `?deal=` ser apagado. Os deep-links
 * já existentes (`?c=`, `?pipeline=`, `?stage=`, `?deal=`) usam a mesma
 * abordagem, então a base de leitura é sempre `window.location.search` (o
 * `useSearchParams()` fica defasado quando só a History API escreve).
 */

"use client";

import { useEffect } from "react";

export type UrlWriteMode = "push" | "replace";

/** Query string atual (fonte da verdade, mesmo sem passar pelo router). */
export function readLiveParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/**
 * Aplica um patch de parâmetros preservando todos os outros (deep-links de
 * conversa/negócio inclusive). `null`/`undefined`/`""` removem a chave.
 * No-op quando a URL resultante é igual à atual — evita entradas duplicadas
 * no histórico e loops de efeito.
 */
export function applyUrlParams(
  patch: Record<string, string | null | undefined>,
  mode: UrlWriteMode = "replace",
): void {
  if (typeof window === "undefined") return;
  const params = readLiveParams();
  const before = params.toString();
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const after = params.toString();
  if (after === before) return;
  const url = `${window.location.pathname}${after ? `?${after}` : ""}${window.location.hash}`;
  if (mode === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

/** Voltar/avançar do navegador. */
export function useUrlPopstate(handler: () => void): void {
  useEffect(() => {
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [handler]);
}

/** `["a","b"]` → `"a,b"`. Vazio → `null` (chave removida da URL). */
export function encodeCsv(
  values: readonly (string | null | undefined)[] | null | undefined,
): string | null {
  if (!values?.length) return null;
  const list = values
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter((v) => v.length > 0);
  return list.length ? list.join(",") : null;
}

export function decodeCsv(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/** `"1"`/`"true"`/`"y"` → true; `"0"`/`"false"` → false; resto → undefined. */
export function decodeBool(raw: string | null | undefined): boolean | undefined {
  if (raw == null) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "y" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "n" || v === "no") return false;
  return undefined;
}

export function encodeBool(value: boolean | undefined): string | null {
  if (value === true) return "1";
  if (value === false) return "0";
  return null;
}

/** Valida contra uma lista fechada; valor desconhecido → undefined. */
export function decodeEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!raw) return undefined;
  const v = raw.trim() as T;
  return allowed.includes(v) ? v : undefined;
}

export function decodeNumber(
  raw: string | null | undefined,
  opts: { min?: number; max?: number } = {},
): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (opts.min != null && n < opts.min) return undefined;
  if (opts.max != null && n > opts.max) return undefined;
  return n;
}

/**
 * Faixa `from..to` (qualquer ponta pode ficar vazia: `..500`, `100..`).
 * Formato usado por `value=` (valor de venda) e datas personalizadas.
 */
export function encodeRange(
  from: string | number | null | undefined,
  to: string | number | null | undefined,
): string | null {
  const a = from == null || from === "" ? "" : String(from);
  const b = to == null || to === "" ? "" : String(to);
  if (!a && !b) return null;
  return `${a}..${b}`;
}

export function decodeRange(
  raw: string | null | undefined,
): { from: string | null; to: string | null } | null {
  if (!raw) return null;
  const idx = raw.indexOf("..");
  if (idx < 0) {
    const only = raw.trim();
    return only ? { from: only, to: only } : null;
  }
  const from = raw.slice(0, idx).trim();
  const to = raw.slice(idx + 2).trim();
  if (!from && !to) return null;
  return { from: from || null, to: to || null };
}

/** JSON compacto em base64url — só para critérios raros (campos custom). */
export function encodeJsonParam(value: unknown): string | null {
  try {
    if (value == null) return null;
    const json = JSON.stringify(value);
    if (!json || json === "null" || json === "[]" || json === "{}") return null;
    if (typeof window === "undefined") return null;
    const b64 = window.btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return null;
  }
}

export function decodeJsonParam<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const decoded =
      typeof window === "undefined"
        ? Buffer.from(b64 + pad, "base64").toString("binary")
        : window.atob(b64 + pad);
    const parsed = JSON.parse(decodeURIComponent(escape(decoded)));
    return parsed == null ? null : (parsed as T);
  } catch {
    return null;
  }
}
