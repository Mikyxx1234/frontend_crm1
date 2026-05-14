"use client";

import { Bell, BellOff, X } from "lucide-react";
import { useEffect, useState } from "react";

import { usePushSubscription } from "@/hooks/use-push-subscription";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "eduit:push:permission:dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

/**
 * Banner pedindo permissao de push.
 *
 * Regras:
 *  - So aparece se PWA esta INSTALADO (display-mode standalone).
 *    Notificacao web em Chrome/Edge desktop tambem funciona, mas
 *    em mobile so faz sentido apos instalar — UX consistente com
 *    WhatsApp Business.
 *  - So aparece se permission === "default" (nao decidiu ainda).
 *  - Se denied, oculta de vez (operador precisa ir nas
 *    configuracoes do browser pra mudar — nao faz sentido reapertar).
 *  - Dismiss persiste 7 dias.
 *
 * Posicionamento: top sheet abaixo do TopBar mobile.
 */
export function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } =
    usePushSubscription();
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone = () => {
      const isStandaloneMq = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isIosStandalone = (
        window.navigator as Navigator & { standalone?: boolean }
      ).standalone;
      setIsStandalone(Boolean(isStandaloneMq || isIosStandalone));
    };
    checkStandalone();

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", checkStandalone);

    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) {
      setDismissed(false);
    } else {
      const ts = Number(raw);
      if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_TTL_MS) {
        window.localStorage.removeItem(DISMISS_KEY);
        setDismissed(false);
      }
    }

    return () => mq.removeEventListener("change", checkStandalone);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) dismiss();
  };

  if (!isSupported) return null;
  if (!isStandalone) return null;
  if (isSubscribed) return null;
  if (permission === "denied") return null;
  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] z-40",
        "rounded-[20px] border border-border bg-white p-4 shadow-[var(--shadow-lg)]",
        "md:hidden",
      )}
      role="dialog"
      aria-label="Ativar notificações"
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
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#06b6d4] text-white shadow-[var(--shadow-lavender-glow)]">
          <Bell className="size-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-extrabold tracking-tight text-slate-900">
            Receba mensagens em tempo real
          </p>
          <p className="mt-0.5 text-[12px] font-medium leading-tight text-slate-500">
            Avisamos no celular quando um cliente responder, mesmo com o
            app fechado.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={isLoading}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-4",
                "bg-primary text-[12px] font-bold text-white",
                "shadow-[var(--shadow-indigo-glow)] transition-colors hover:bg-[#4466d6] active:scale-[0.97]",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isLoading ? "Ativando…" : "Ativar notificações"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-foreground"
            >
              <BellOff className="size-3.5" strokeWidth={2.4} />
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
