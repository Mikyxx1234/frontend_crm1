"use client";

import { ArrowRight, Bell, MessageSquare, Sparkles, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "eduit:onboarding-v1:dismissed";

type Step = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  cta?: string;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao EduIT Premium",
    body: "Tour rápido de 30 segundos pra mostrar 4 atalhos que economizam horas por dia.",
    cta: "Vamos lá",
  },
  {
    icon: MessageSquare,
    title: "Respostas rápidas com /",
    body: "Dentro do chat, digite \"/\" pra abrir suas respostas prontas. Tab seleciona, Enter envia. Adicione novas em Configurações → Respostas rápidas.",
    cta: "Próximo",
  },
  {
    icon: Bell,
    title: "Lembretes de 1 toque",
    body: "Botão de sino no header de cada conversa cria um lembrete (1h, amanhã, segunda…). Aparece em Tarefas e na timeline do contato.",
    cta: "Próximo",
  },
  {
    icon: Zap,
    title: "Painel do dia",
    body: "Os chips no topo do Inbox mostram o que precisa de você agora: pendentes, críticas (>1h) e quantas mensagens já enviou hoje.",
    cta: "Começar",
  },
];

/**
 * Tour de onboarding leve — 4 passos overlay no primeiro acesso ao
 * dashboard. Persistido em `localStorage` para nunca repetir após dispensar.
 *
 * Não renderiza fora do dashboard (verifica pathname). Não bloqueia
 * uso — backdrop transparente clicável fecha. CSS-only, sem libs.
 *
 * Visual: card centralizado com ícone grande, título, corpo, dots e CTA.
 * Responsivo (sheet bottom em mobile, dialog centralizado em desktop).
 */
export function OnboardingTour() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname || pathname.startsWith("/login") || pathname.startsWith("/register")) {
      return;
    }
    // Só na home do app — evita overlay bloqueando Inbox/Pipeline logo após login (callbackUrl).
    const isDashboardHome = pathname === "/" || pathname === "/dashboard";
    if (!isDashboardHome) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname]);

  const dismiss = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }, []);

  const next = () => {
    if (step >= STEPS.length - 1) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  if (!open) return null;
  const current = STEPS[step];
  if (!current) return null;
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 px-3 pb-3 backdrop-blur-sm md:items-center md:p-6"
      role="presentation"
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-lg)] ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800",
          "animate-in fade-in slide-in-from-bottom-6 duration-300",
        )}
      >
        <div className="bg-linear-to-br from-[var(--color-primary-soft)] via-transparent to-[var(--color-lavender-muted)] p-6 pb-4 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary/20">
            <Icon className="size-7" strokeWidth={2.2} />
          </div>
          <h2 className="font-display text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {current.title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-300">
            {current.body}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-[var(--color-bg-subtle)]/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-slate-300 dark:bg-slate-700",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={dismiss}
                className="text-[12px] font-semibold text-slate-500 transition-colors hover:text-foreground dark:text-[var(--color-ink-muted)] dark:hover:text-slate-200"
              >
                Pular
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white shadow-[var(--shadow-indigo-glow)] transition-colors hover:bg-primary/90 active:scale-95"
            >
              {current.cta ?? "Próximo"}
              <ArrowRight className="size-3.5" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
