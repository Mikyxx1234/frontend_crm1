"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/stores/dashboard-store";

/**
 * Shape canônico retornado por `/api/analytics/inbox`. Reaproveitado
 * pelos widgets de atendimento do dashboard — evita duplicar types
 * em cada widget e garante compatibilidade quando o endpoint evoluir.
 */
export type InboxMetrics = {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  avgFirstResponseMinutes: number;
  avgResolutionHours: number;
  byAgent: {
    userId: string;
    userName: string;
    conversations: number;
    messagesSent: number;
    avgResponseMinutes: number;
  }[];
  byChannel: { channel: string; count: number }[];
  byDay: { date: string; inbound: number; outbound: number; conversations: number }[];
  byHour: { hour: number; count: number }[];
};

/**
 * Hook compartilhado entre todos os widgets de atendimento. Usa o período
 * selecionado na FiltersBar e já tem cache (react-query) por (from, to),
 * então vários widgets no mesmo dashboard fazem só UMA requisição.
 */
export function useInboxMetrics() {
  const from = useDashboardStore((s) => s.from);
  const to = useDashboardStore((s) => s.to);

  return useQuery<InboxMetrics>({
    queryKey: ["inbox-metrics", from, to],
    queryFn: async () => {
      const url = `/api/analytics/inbox?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Falha ao carregar métricas de atendimento");
      return r.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
