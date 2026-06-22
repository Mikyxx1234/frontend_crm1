"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useRef } from "react";

/** Intervalo mínimo entre pings — evita fila no pool HTTP do navegador (6 conexões/host). */
const MIN_PING_GAP_MS = 8_000;

/**
 * Envia um ping para /api/agents/me/ping a cada `intervalMs` (default 90s) enquanto
 * a aba estiver visível. Também dispara quando a aba recupera foco, com debounce.
 *
 * Falhas são silenciadas propositalmente.
 */
export function usePresenceHeartbeat(options?: { intervalMs?: number; enabled?: boolean }) {
  const { intervalMs = 90_000, enabled = true } = options ?? {};
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const lastPingAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    async function ping() {
      const now = Date.now();
      if (inFlightRef.current) return;
      if (now - lastPingAtRef.current < MIN_PING_GAP_MS) return;

      inFlightRef.current = true;
      lastPingAtRef.current = now;
      try {
        await fetch(apiUrl("/api/agents/me/ping"), {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // silenciado de propósito (ver doc do hook)
      } finally {
        inFlightRef.current = false;
      }
    }

    function scheduleNext() {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
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

    function onFocus() {
      void ping();
    }

    void ping();
    scheduleNext();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [intervalMs, enabled]);
}
