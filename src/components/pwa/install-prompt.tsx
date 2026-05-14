"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "eduit:pwa:install:dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias

/**
 * Banner discreto pra "Adicionar a Tela de Inicio".
 *
 * Comportamento:
 *  - So aparece em mobile (md:hidden no wrapper).
 *  - So aparece se NAO instalado E (canInstall OU iOS).
 *  - Dismiss persiste 14 dias no localStorage — depois disso volta
 *    a aparecer (porque o operador pode ter trocado de aparelho).
 *  - Em iOS mostra instrucao Share + "Adicionar a Tela de Inicio"
 *    (nao tem prompt programatico).
 *  - Em Chrome/Android dispara o prompt nativo do browser ao
 *    clicar em "Instalar".
 *
 * Posicionamento: bottom sheet acima da bottom nav (bottom-20).
 */
export function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // SSR-safe: assume dismissed

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) {
      setDismissed(false);
      return;
    }
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_TTL_MS) {
      window.localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
      return;
    }
    setDismissed(true);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted" || outcome === "dismissed") {
      dismiss();
    }
  };

  if (isInstalled) return null;
  if (dismissed) return null;
  // Em mobile, mostramos quando ha prompt nativo OU em iOS (instrucao manual).
  const shouldShow = canInstall || isIOS;
  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] z-40",
        "rounded-[20px] border border-border bg-white p-4 shadow-[var(--shadow-lg)]",
        "md:hidden",
      )}
      role="dialog"
      aria-label="Instalar EduIT"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="absolute right-2 top-2 rounded-full p-1.5 text-[var(--color-ink-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-ink-soft)]"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-indigo-glow)]">
          <span className="text-lg font-bold">E</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-extrabold tracking-tight text-slate-900">
            Instale o EduIT
          </p>
          <p className="mt-0.5 text-[12px] font-medium leading-tight text-slate-500">
            {isIOS
              ? "Toque em Compartilhar e depois em \"Adicionar a Tela de Início\" para abrir como app."
              : "Tenha acesso rápido às conversas direto da tela inicial, mesmo offline."}
          </p>

          {!isIOS && canInstall && (
            <button
              type="button"
              onClick={handleInstall}
              className={cn(
                "mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-4",
                "bg-primary text-[12px] font-bold text-white",
                "shadow-[var(--shadow-indigo-glow)] transition-colors hover:bg-[#4466d6] active:scale-[0.97]",
              )}
            >
              <Download className="size-3.5" strokeWidth={2.5} />
              Instalar agora
            </button>
          )}

          {isIOS && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-[var(--color-ink-soft)]">
              <Share className="size-3.5" strokeWidth={2.5} />
              Use o botão Compartilhar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
