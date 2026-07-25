"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";
import { useSSE } from "@/hooks/use-sse";

interface SystemPresenceEvent {
  userId: string;
  systemOnline: boolean;
  lastSeenAt: string | null;
}

/**
 * Escuta `system_presence_update` do SSE e patcheia in-place as caches
 * de listagem de agentes (React Query) que carregam `systemOnline` /
 * `lastSeenAt`. Nunca refetcha em resposta ao evento — só faz merge.
 *
 * Também dispara um refetch leve dessas queries a cada 60s como rede
 * de segurança (SSE pode cair silenciosamente atrás de proxies).
 *
 * Montado UMA vez por sessão (ex.: no shell autenticado).
 */
export function useSystemPresenceSync(enabled = true) {
  const qc = useQueryClient();

  useSSE(
    apiUrl("/api/sse/messages"),
    (event, data) => {
      if (event !== "system_presence_update") return;
      const evt = data as Partial<SystemPresenceEvent> | undefined;
      if (!evt || typeof evt.userId !== "string") return;
      patchUsersCaches(qc, evt as SystemPresenceEvent);
    },
    enabled,
  );

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      // Refetch em background — não invalida instantaneamente para não
      // provocar loading state em popovers já abertos.
      qc.invalidateQueries({ queryKey: ["users", "assign-picker"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["team-users"], refetchType: "active" });
    }, 60_000);
    return () => clearInterval(t);
  }, [enabled, qc]);
}

function patchUsersCaches(
  qc: ReturnType<typeof useQueryClient>,
  evt: SystemPresenceEvent,
) {
  // Caches que carregam TeamUser[] no shape do backend.
  const keys: readonly (readonly unknown[])[] = [
    ["users", "assign-picker"],
    ["team-users"],
    ["users"],
    ["distribution-responsibles"],
  ];
  for (const key of keys) {
    qc.setQueriesData({ queryKey: key }, (prev: unknown) => {
      if (!prev) return prev;
      return mergePresence(prev, evt);
    });
  }
}

type MaybeUser = { id?: string; userId?: string } & Record<string, unknown>;

function mergePresence(prev: unknown, evt: SystemPresenceEvent): unknown {
  if (Array.isArray(prev)) {
    let touched = false;
    const next = prev.map((item) => {
      const u = item as MaybeUser;
      const uid = u.id ?? u.userId;
      if (uid !== evt.userId) return item;
      touched = true;
      return {
        ...(item as object),
        systemOnline: evt.systemOnline,
        lastSeenAt: evt.lastSeenAt,
      };
    });
    return touched ? next : prev;
  }
  // Shape { responsibles: [...] } (Distribuição).
  if (
    typeof prev === "object" &&
    prev !== null &&
    "responsibles" in prev &&
    Array.isArray((prev as { responsibles: unknown[] }).responsibles)
  ) {
    const arr = (prev as { responsibles: unknown[] }).responsibles;
    const next = mergePresence(arr, evt);
    return next === arr ? prev : { ...prev, responsibles: next };
  }
  return prev;
}
