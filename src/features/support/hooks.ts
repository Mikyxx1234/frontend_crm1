"use client";

import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  claimSupportTicket,
  createSupportTicket,
  getSupportMeta,
  listSupportMessages,
  listSupportTickets,
  resolveSupportTicket,
  sendSupportMessage,
} from "./api";
import type { SupportScope } from "./types";

const TICKETS_KEY = "support-tickets";
const MESSAGES_KEY = "support-messages";
const META_KEY = "support-meta";

export function useSupportMeta() {
  return useQuery({
    queryKey: [META_KEY],
    queryFn: getSupportMeta,
    staleTime: 60_000,
  });
}

export function useSupportTickets(scope: SupportScope, enabled = true) {
  return useQuery({
    queryKey: [TICKETS_KEY, scope],
    queryFn: () => listSupportTickets(scope),
    enabled,
    refetchInterval: 20_000,
  });
}

export function useSupportMessages(ticketId: string | null) {
  return useQuery({
    queryKey: [MESSAGES_KEY, ticketId],
    queryFn: () => listSupportMessages(ticketId as string),
    enabled: !!ticketId,
    refetchInterval: 10_000,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
    },
  });
}

export function useSendSupportMessage(ticketId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      sendSupportMessage(ticketId as string, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MESSAGES_KEY, ticketId] });
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
    },
  });
}

export function useClaimSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimSupportTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: [TICKETS_KEY] }),
  });
}

export function useResolveSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolveSupportTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
    },
  });
}

/**
 * Realtime do suporte via SSE (mesma stream do inbox). Invalida as
 * queries de tickets/mensagens ao receber eventos. Throttle leve pra
 * evitar rajadas.
 */
export function useSupportRealtime(activeTicketId: string | null, enabled = true) {
  const qc = useQueryClient();
  const activeRef = useRef(activeTicketId);
  activeRef.current = activeTicketId;

  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let lastInvalidate = 0;

    const invalidateTickets = () => {
      const now = Date.now();
      if (now - lastInvalidate < 250) return;
      lastInvalidate = now;
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
    };

    const onMessage = (raw: string) => {
      try {
        const data = JSON.parse(raw) as { ticketId?: string };
        invalidateTickets();
        if (data.ticketId) {
          qc.invalidateQueries({ queryKey: [MESSAGES_KEY, data.ticketId] });
        }
      } catch {
        /* ignore */
      }
    };

    function connect() {
      es = new EventSource("/api/sse/messages");
      es.addEventListener("support_ticket_new", () => invalidateTickets());
      es.addEventListener("support_ticket_updated", () => invalidateTickets());
      es.addEventListener("support_message", (e) => onMessage((e as MessageEvent).data));
      es.onerror = () => {
        es?.close();
        retry = setTimeout(connect, 5_000);
      };
    }
    connect();
    return () => {
      es?.close();
      clearTimeout(retry);
    };
  }, [qc, enabled]);
}
