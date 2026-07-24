"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { messagesKey } from "./use-messages";
import { playInboxPing } from "./use-inbox-sound";

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
            direction?: string;
          };
          // Aviso sonoro só em mensagens RECEBIDAS (inbound) — envios do
          // próprio agente (direction="out") não tocam. Respeita o mudo.
          if (data.direction === "in") playInboxPing();
          if (data.conversationId) {
            if (data.conversationId === activeRef.current) {
              // Conversa aberta: refetch imediato para exibir a mensagem.
              qc.invalidateQueries({ queryKey: messagesKey(activeRef.current) });
            } else {
              // Outra conversa: marca stale sem refetch imediato.
              // Quando o operador navegar até ela, verá dados frescos.
              qc.invalidateQueries({
                queryKey: messagesKey(data.conversationId),
                refetchType: "none",
              });
            }
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
            /** Id da bolha (= externalId/wamid no Meta). */
            messageId?: string;
            /** UUID interno — fallback p/ payloads antigos. */
            internalId?: string;
            status?: string;
          };
          if (data.conversationId) {
            // Atualização otimista do tick (sent→delivered→read) sem
            // esperar o refetch — evita atraso perceptível nos ticks azuis.
            if (data.messageId && data.status) {
              const mapped = ({
                pending: "PENDING",
                sent: "SENT",
                delivered: "DELIVERED",
                read: "READ",
                failed: "FAILED",
              } as Record<string, string>)[data.status.toLowerCase()];
              if (mapped) {
                const bubbleId = data.messageId;
                const internalId = data.internalId;
                qc.setQueryData(
                  messagesKey(data.conversationId),
                  (old: { messages?: Array<{ id: string; status?: string; sendStatus?: string | null }> } | undefined) => {
                    if (!old?.messages) return old;
                    return {
                      ...old,
                      messages: old.messages.map((m) =>
                        m.id === bubbleId || (internalId != null && m.id === internalId)
                          ? { ...m, status: mapped, sendStatus: data.status!.toLowerCase() }
                          : m,
                      ),
                    };
                  },
                );
              }
            }
            // Refetch forçado na conversa aberta — invalidate sozinho
            // às vezes não dispara a tempo do tick azul.
            if (data.conversationId === activeRef.current) {
              void qc.refetchQueries({
                queryKey: messagesKey(data.conversationId),
              });
            } else {
              qc.invalidateQueries({
                queryKey: messagesKey(data.conversationId),
                refetchType: "none",
              });
            }
          }
          scheduleInboxRefresh();
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("conversation_updated", () => {
        scheduleInboxRefresh();
      });

      // Timeline (chatter) da conversa — encerramento/reabertura empurrados
      // pelo backend. Invalida ["conversation-timeline", id] p/ o
      // ConversationTimelineTab exibir o evento na hora, mesmo quando a
      // acao veio de outro agente/automacao (sem mutation local).
      es.addEventListener("conversation_timeline_updated", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as {
            conversationId?: string;
          };
          if (data.conversationId) {
            qc.invalidateQueries({
              queryKey: ["conversation-timeline", data.conversationId],
            });
          }
        } catch {
          /* ignore */
        }
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

      // Ciclo de vida de automações (robô iniciou/avançou/terminou) —
      // atualiza o chip "robô em execução" do chat aberto. O evento traz
      // contactId (contexto não referencia conversa), então invalidamos a
      // query da conversa ativa; se o contato não for o mesmo, o refetch
      // é barato e o resultado idêntico.
      es.addEventListener("automation_state", (e) => {
        // Invalida o botão "Robôs ativos" (por contato) do evento e,
        // por compat, o chip antigo (por conversa ativa).
        try {
          const data = JSON.parse((e as MessageEvent).data) as {
            contactId?: string;
          };
          if (data.contactId) {
            qc.invalidateQueries({
              queryKey: ["active-automations-contact", data.contactId],
            });
            qc.invalidateQueries({
              queryKey: ["automation-history-contact", data.contactId],
            });
          }
        } catch {
          /* ignore */
        }
        if (activeRef.current) {
          qc.invalidateQueries({
            queryKey: ["active-automations", activeRef.current],
          });
        }
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
