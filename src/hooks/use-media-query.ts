"use client";

import { useEffect, useState } from "react";

/**
 * Hook SSR-safe que reage a media queries CSS.
 *
 * Retorna `false` no server e no primeiro render do client (antes do
 * mount), evitando hydration mismatch. Atualiza assim que o cliente
 * hidrata e responde a mudancas de viewport (resize, orientacao).
 *
 * Usar APENAS quando JS e necessario (ex.: trocar texto de placeholder,
 * calculo derivado de breakpoint). Sempre que possivel, prefira a
 * variante CSS-only do Tailwind (`md:hidden`, `hidden md:block`) que
 * elimina hydration flicker e e zero-cost em runtime.
 *
 * Convencao de breakpoints (alinhada com tailwind.config.ts):
 *   - useIsMobile():  < 768px  (md breakpoint)
 *   - useIsTablet():  768-1023 (md-lg)
 *   - useIsDesktop(): >= 1024px (lg+)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
