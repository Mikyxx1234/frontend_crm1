"use client";

import * as React from "react";

import { SEARCH_MIN_CHARS } from "@/lib/search-query";

export type OmnisearchCoords = { top: number; left: number; width: number };

/**
 * Posição, teclado e clique-fora do dropdown de busca (Inbox / Pipeline /
 * Contatos / Empresas). O painel usa `data-omnisearch-results`.
 */
export function useOmnisearchMenu(search: string, hitCount: number) {
  const [focused, setFocused] = React.useState(false);
  const [coords, setCoords] = React.useState<OmnisearchCoords | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const showHits = focused && search.trim().length >= SEARCH_MIN_CHARS;

  React.useEffect(() => {
    setActiveIndex(0);
  }, [search, hitCount]);

  const updateCoords = React.useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 280);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setCoords({
      top: Math.min(rect.bottom + 6, window.innerHeight - 8),
      left,
      width: rect.width,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!showHits) {
      setCoords(null);
      return;
    }
    updateCoords();
  }, [showHits, search, hitCount, updateCoords]);

  const close = React.useCallback(() => setFocused(false), []);

  React.useEffect(() => {
    if (!showHits) return;
    function onDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (wrapRef.current?.contains(target)) return;
      if (target.closest?.("[data-omnisearch-results]")) return;
      setFocused(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFocused(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", updateCoords, { passive: true });
    window.addEventListener("scroll", updateCoords, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [showHits, updateCoords]);

  function onInputKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    onPickActive: () => void,
  ) {
    if (!showHits) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(hitCount - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    onPickActive();
  }

  return {
    wrapRef,
    showHits,
    coords,
    activeIndex,
    setActiveIndex,
    setFocused,
    close,
    onInputKeyDown,
  };
}
