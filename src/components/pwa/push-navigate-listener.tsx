"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Listener pro `postMessage` do service worker quando um push e
 * clicado e a janela ja existe (mas em rota diferente).
 *
 * Sem isso o SW abriria openWindow() criando outra aba — usuario
 * teria 2x EduIT. Com isso aproveitamos a janela e navegamos via
 * Next router (preserva cache do React Query, scroll, etc).
 */
export function PushNavigateListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (!data || data.type !== "PUSH_NAVIGATE" || !data.url) return;
      router.push(data.url);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
