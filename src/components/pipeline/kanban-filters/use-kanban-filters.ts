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

  const writeToUrl = React.useCallback(
    (next: AdvancedDealFilters) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isEmptyFilters(next)) {
        params.delete(URL_PARAM);
      } else {
        const encoded = encode(next);
        if (encoded) params.set(URL_PARAM, encoded);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const persist = React.useCallback((next: AdvancedDealFilters) => {
    try {
      if (isEmptyFilters(next)) localStorage.removeItem(LS_KEY);
      else localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, []);

  const setFilters = React.useCallback<UseKanbanFiltersResult["setFilters"]>(
    (next) => {
      setFiltersState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        writeToUrl(value);
        persist(value);
        return value;
      });
    },
    [persist, writeToUrl],
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
