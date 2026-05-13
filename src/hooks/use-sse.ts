"use client";

import { useEffect, useRef } from "react";

type SSEHandler = (event: string, data: unknown) => void;

export function useSSE(url: string, handler: SSEHandler, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url);

      es.addEventListener("new_message", (e) => {
        try { handlerRef.current("new_message", JSON.parse(e.data)); } catch { /* ignore */ }
      });

      es.addEventListener("message_status", (e) => {
        try { handlerRef.current("message_status", JSON.parse(e.data)); } catch { /* ignore */ }
      });

      es.addEventListener("conversation_updated", (e) => {
        try { handlerRef.current("conversation_updated", JSON.parse(e.data)); } catch { /* ignore */ }
      });

      es.addEventListener("contact_updated", (e) => {
        try { handlerRef.current("contact_updated", JSON.parse(e.data)); } catch { /* ignore */ }
      });

      es.addEventListener("whatsapp_call", (e) => {
        try { handlerRef.current("whatsapp_call", JSON.parse(e.data)); } catch { /* ignore */ }
      });

      es.addEventListener("presence_update", (e) => {
        try { handlerRef.current("presence_update", JSON.parse(e.data)); } catch { /* ignore */ }
      });

      es.onerror = () => {
        es?.close();
        retryTimeout = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [url, enabled]);
}
