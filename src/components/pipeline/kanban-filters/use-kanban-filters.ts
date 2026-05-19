/**
 * Hook que centraliza estado dos filtros avançados do Kanban.
 *
 * - Mantém em memória + URL (`?f=<base64url>`) + localStorage (fallback).
 * - Não dispara reidratação cega: prioridade é URL > localStorage > vazio.
 * - Reidrata uma vez no mount, depois grava nos dois.
 *
 * O serializador usa base64url(JSON) — compacto e seguro pra URL longa.
 */

"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AdvancedDealFilters } from "./types";
import { isEmptyFilters } from "./types";

const LS_KEY = "kanban-advanced-filters";
const URL_PARAM = "f";

function encode(filters: AdvancedDealFilters): string {
  try {
    const json = JSON.stringify(filters);
    // base64url
    if (typeof window === "undefined") return "";
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

function decode(value: string | null | undefined): AdvancedDealFilters | null {
  if (!value) return null;
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const decoded = atob(b64 + pad);
    const json = decodeURIComponent(escape(decoded));
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return parsed as AdvancedDealFilters;
    return null;
  } catch {
    return null;
  }
}

export type UseKanbanFiltersResult = {
  filters: AdvancedDealFilters;
  setFilters: (next: AdvancedDealFilters | ((prev: AdvancedDealFilters) => AdvancedDealFilters)) => void;
  clear: () => void;
  /** Patch parcial — mantém o resto dos critérios. */
  patch: (partial: Partial<AdvancedDealFilters>) => void;
  isEmpty: boolean;
};

export function useKanbanFilters(): UseKanbanFiltersResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFiltersState] = React.useState<AdvancedDealFilters>({});
  const hydrated = React.useRef(false);

  // Refs estáveis p/ acessar dependências dentro do callback sem reanexar
  // o setter a cada render (estabilidade do `setFilters` é importante pois
  // ele é prop de muitos componentes filhos).
  const pathnameRef = React.useRef(pathname);
  pathnameRef.current = pathname;
  const searchParamsRef = React.useRef(searchParams);
  searchParamsRef.current = searchParams;
  const routerRef = React.useRef(router);
  routerRef.current = router;

  // Reidrata uma vez (URL > localStorage)
  React.useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const fromUrl = decode(searchParams.get(URL_PARAM));
    if (fromUrl && !isEmptyFilters(fromUrl)) {
      setFiltersState(fromUrl);
      return;
    }
    try {
      const fromLs = localStorage.getItem(LS_KEY);
      if (fromLs) {
        const parsed = JSON.parse(fromLs);
        if (parsed && typeof parsed === "object" && !isEmptyFilters(parsed)) {
          setFiltersState(parsed as AdvancedDealFilters);
        }
      }
    } catch {
      /* noop */
    }
  }, [searchParams]);

  // Sincroniza URL e localStorage como SIDE-EFFECT depois do commit. Antes
  // chamávamos `router.replace` dentro do updater de `setState`, o que
  // disparava o aviso "Cannot update a component (Router) while rendering
  // a different component (PipelinePage)" no React 18+/StrictMode — porque
  // o updater pode ser executado durante render (replay para detecção de
  // efeitos). Mover para useEffect garante que router.replace acontece
  // SEMPRE fora da fase de render.
  React.useEffect(() => {
    if (!hydrated.current) return;
    // URL
    const params = new URLSearchParams(searchParamsRef.current.toString());
    if (isEmptyFilters(filters)) {
      params.delete(URL_PARAM);
    } else {
      const encoded = encode(filters);
      if (encoded) params.set(URL_PARAM, encoded);
    }
    const qs = params.toString();
    const nextUrl = qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current;
    // Evita push redundante quando a URL já reflete o estado.
    const current = `${pathnameRef.current}${
      searchParamsRef.current.toString() ? `?${searchParamsRef.current.toString()}` : ""
    }`;
    if (nextUrl !== current) {
      routerRef.current.replace(nextUrl, { scroll: false });
    }
    // localStorage
    try {
      if (isEmptyFilters(filters)) localStorage.removeItem(LS_KEY);
      else localStorage.setItem(LS_KEY, JSON.stringify(filters));
    } catch {
      /* noop */
    }
  }, [filters]);

  const setFilters = React.useCallback<UseKanbanFiltersResult["setFilters"]>(
    (next) => {
      setFiltersState((prev) =>
        typeof next === "function" ? next(prev) : next,
      );
    },
    [],
  );

  const patch = React.useCallback(
    (partial: Partial<AdvancedDealFilters>) => {
      setFilters((prev) => ({ ...prev, ...partial }));
    },
    [setFilters],
  );

  const clear = React.useCallback(() => setFilters({}), [setFilters]);

  return {
    filters,
    setFilters,
    patch,
    clear,
    isEmpty: isEmptyFilters(filters),
  };
}
