"use client";

import { useEffect } from "react";

/**
 * No mobile (< md), marca `html[data-mobile-chat-open="1"]` enquanto o chat
 * estiver montado. A MobileBottomNav se esconde e o composer/barra de opções
 * fica fixo na base da conversa (padrão WhatsApp).
 */
export function useMobileChatChrome(active = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const mq = window.matchMedia("(max-width: 767px)");
    const root = document.documentElement;

    function apply() {
      if (mq.matches) {
        root.dataset.mobileChatOpen = "1";
      } else {
        delete root.dataset.mobileChatOpen;
      }
    }

    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      delete root.dataset.mobileChatOpen;
    };
  }, [active]);
}
