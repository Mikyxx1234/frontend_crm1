"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { messagesKey } from "./use-messages";

/**
 * SSE em /api/sse/messages — preserva exatamente o comportamento do
 * legado (`useSSE` + `scheduleInboxRefresh`):
 *
 *  - 1 EventSource só, compartilhado pela página.
 *  - Eventos new_message / message_status / conversation_updated
 *    invalidam list + counts.
 *  - new_message / whatsapp_call invalidam mensagens da conversa
 *    ativa quando o conversationId casa.
 *  - contact_updated invalida lista + sidebar do contato.
 *  - Throttle de 250ms: rajadas de eventos não viram refetch×N.
 *  - Reconexão automática com backoff fixo de 5s em onerror.
 */
export function useInboxRealtime(options: {
  activeConversationId: string | null;
  enabled?: boolean;
}) {
  const { activeConversationId, enabled = true } = options;
  const qc = useQueryClient();
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
  }, [activeConversationId]);

  useEffect(() => {
    if (!enabled) return;

    function scheduleInboxRefresh() {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
        qc.invalidateQueries({ queryKey: ["conversations", "tab-counts"] });
      }, 250);
    }

    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      es = new EventSource("/api/sse/messages");

      es.addEventListener("new_message", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as {
            conversationId?: string;
          };
          if (data.conversationId && data.conversationId === activeRef.current) {
            qc.invalidateQueries({ queryKey: messagesKey(activeRef.current) });
          }
          scheduleInboxRefresh();
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("message_status", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as {
            conversationId?: string;
          };
          if (data.conversationId && data.conversationId === activeRef.current) {
            qc.invalidateQueries({ queryKey: messagesKey(activeRef.current) });
          }
          scheduleInboxRefresh();
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("conversation_updated", () => {
        scheduleInboxRefresh();
      });

      es.addEventListener("contact_updated", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as {
            contactId?: string;
          };
          qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
          if (data.contactId) {
            qc.invalidateQueries({ queryKey: ["contact-sidebar", data.contactId] });
          }
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("whatsapp_call", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as {
            conversationId?: string;
          };
          if (data.conversationId && data.conversationId === activeRef.current) {
            qc.invalidateQueries({ queryKey: messagesKey(activeRef.current) });
          }
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("presence_update", () => {
        qc.invalidateQueries({ queryKey: ["my-agent-status"] });
      });

      es.onerror = () => {
        es?.close();
        retry = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      es?.close();
      if (retry) clearTimeout(retry);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, [enabled, qc]);
}
