"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useRef } from "react";

/**
 * Envia um ping para /api/agents/me/ping a cada `intervalMs` (default 90s) enquanto
 * a aba estiver visível. Também dispara imediatamente quando a aba recupera foco
 * (visibilitychange) — assim o agente que volta de AWAY sobe para ONLINE de imediato,
 * sem esperar o próximo tick.
 *
 * Falhas são silenciadas propositalmente: se o servidor estiver offline ou a
 * migration ainda não tiver rodado, não queremos poluir o console do usuário.
 */
export function usePresenceHeartbeat(options?: { intervalMs?: number; enabled?: boolean }) {
  const { intervalMs = 90_000, enabled = true } = options ?? {};
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    async function ping() {
      try {
        await fetch(apiUrl("/api/agents/me/ping"), {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // silenciado de propósito (ver doc do hook)
      }
    }

    function scheduleNext() {
      if (timerRef.current) clearInterval(timerRef.current);
      if (document.visibilityState !== "visible") return;
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") void ping();
      }, intervalMs);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void ping();
        scheduleNext();
      } else if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Primeiro ping imediato + agenda os subsequentes.
    void ping();
    scheduleNext();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", () => void ping());

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [intervalMs, enabled]);
}
