"use client";

import { useEffect, useState } from "react";

/** Tempo máximo que um shell de loading pode ficar no ar antes de virar erro. */
export const STUCK_TIMEOUT_MS = 12_000;

/**
 * Rede de segurança para estados pendentes: retorna `true` quando `pending`
 * ficou continuamente ligado por mais de `ms`.
 *
 * Serve para telas que dependem de uma query sem estado de erro alcançável
 * (query `enabled:false`, `idle` que nunca dispara, resposta que nunca chega):
 * em vez de girar para sempre, a tela troca para um erro com "Tentar
 * novamente". Sai do ar sozinho assim que `pending` volta a `false`.
 */
export function useStuckTimeout(pending: boolean, ms: number = STUCK_TIMEOUT_MS): boolean {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!pending) {
      setStuck(false);
      return;
    }
    const t = window.setTimeout(() => setStuck(true), ms);
    return () => window.clearTimeout(t);
  }, [pending, ms]);

  return stuck;
}
