"use client";

import { useEffect, useState } from "react";

/**
 * Hook que abstrai o fluxo "Adicionar a Tela de Inicio" do PWA:
 *
 * Chrome/Edge/Android:
 *   - Captura o evento `beforeinstallprompt` (so disparado se a PWA
 *     atende aos criterios — manifest valido, SW ativo, HTTPS).
 *   - Exposes `install()` que chama `prompt()` na hora.
 *   - Resolve com 'accepted' | 'dismissed'.
 *
 * iOS Safari:
 *   - NAO tem beforeinstallprompt — o usuario PRECISA usar
 *     Compartilhar -> "Adicionar a Tela de Inicio" manualmente.
 *   - Detectamos `isIOS` + `isInStandalone` pra mostrar instrucoes.
 *
 * Tambem expomos `isInstalled` (display-mode standalone OU
 * navigator.standalone do iOS) pra esconder o banner quando o app
 * ja foi instalado.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export interface PwaInstallState {
  /** Pode chamar `install()` agora? (Chrome/Edge/Android com criterios OK) */
  canInstall: boolean;
  /** Aplicacao ja esta rodando como PWA instalado. */
  isInstalled: boolean;
  /** Browser e iOS Safari (precisa de instrucao manual). */
  isIOS: boolean;
  /** Dispara o prompt nativo. Resolve com a escolha do usuario. */
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS detection — UA sniff e o jeito mais confiavel hoje.
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(iOS);

    // Standalone detection (cross-browser)
    const checkStandalone = () => {
      const isStandaloneMq = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isIosStandalone = (
        window.navigator as Navigator & { standalone?: boolean }
      ).standalone;
      setIsInstalled(Boolean(isStandaloneMq || isIosStandalone));
    };
    checkStandalone();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", checkStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener("change", checkStandalone);
    };
  }, []);

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  };

  return {
    canInstall: deferredPrompt !== null,
    isInstalled,
    isIOS,
    install,
  };
}
