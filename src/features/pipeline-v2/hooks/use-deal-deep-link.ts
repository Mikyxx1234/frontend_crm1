"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Deep-link `?deal=` espelhado do kanban (`_v2-client`), sem alterar aquele arquivo.
 *
 * - Estado interno: CUID (ou dígitos até o detail resolver).
 * - URL: número sequencial quando conhecido (`?deal=102`), senão id.
 * - History API (push/replace) para não refetch de RSC.
 */
export function useDealDeepLink() {
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const setActiveDeal = useCallback((id: string | null, num?: number | null) => {
    setActiveDealId(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (id) {
      const urlVal = num != null ? String(num) : id;
      if (url.searchParams.get("deal") === urlVal) return;
      url.searchParams.set("deal", urlVal);
      window.history.pushState(window.history.state, "", url.toString());
    } else {
      if (!url.searchParams.has("deal")) return;
      url.searchParams.delete("deal");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, []);

  useEffect(() => {
    const d = new URL(window.location.href).searchParams.get("deal");
    if (d) setActiveDealId(d);
  }, []);

  useEffect(() => {
    function onPop() {
      setActiveDealId(new URL(window.location.href).searchParams.get("deal"));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** Após GET /deals/:id por número, troca o estado para o CUID real. */
  const normalizeDealId = useCallback((resolvedId: string | null | undefined) => {
    if (!resolvedId || !activeDealId) return;
    if (/^\d+$/.test(activeDealId) && resolvedId !== activeDealId) {
      setActiveDealId(resolvedId);
    }
  }, [activeDealId]);

  return {
    activeDealId,
    setActiveDeal,
    normalizeDealId,
    /** Valor cru da URL no mount (número ou cuid) — útil como hint. */
    dealNumberHint: typeof window !== "undefined"
      ? new URL(window.location.href).searchParams.get("deal")
      : null,
  };
}
