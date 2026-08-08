"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useSSE } from "@/hooks/use-sse";

/** Cobre `pipeline-board`, `pipeline-board-search` e `pipeline-board-filtered`. */
function isBoardQueryKey(key: readonly unknown[]): boolean {
  const root = key[0];
  return typeof root === "string" && root.startsWith("pipeline-board");
}

/**
 * Mantém os cards do Kanban/Flow em dia sem esperar o polling de 30s.
 *
 * O board carrega `lastMessage`, que define o rodapé "aguardando resposta"
 * no `DealCard`. Sem isto, responder pelo Flow deixava o card marcado como
 * se o cliente ainda estivesse esperando até o próximo refetch.
 *
 * Rajadas (ex.: automação disparando várias mensagens) são agrupadas em uma
 * única invalidação — o board é a query mais cara do app.
 */
export function usePipelineRealtime(enabled = true) {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    },
    [],
  );

  const handler = useCallback(
    (event: string) => {
      // new_message / conversation_updated → preview + "aguardando resposta"
      // message_status → ticks delivered→read (azul) nos cards do board
      if (
        event !== "new_message" &&
        event !== "conversation_updated" &&
        event !== "message_status"
      ) {
        return;
      }
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        qc.invalidateQueries({ predicate: (q) => isBoardQueryKey(q.queryKey) });
      }, 800);
    },
    [qc],
  );

  useSSE("/api/sse/messages", handler, enabled);
}

/** Invalidação imediata do board — usar após ações locais (ex.: envio). */
export function invalidatePipelineBoards(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ predicate: (q) => isBoardQueryKey(q.queryKey) });
}
