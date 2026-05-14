"use client";

import { apiUrl } from "@/lib/api";
import { Bell, BellPlus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Preset = {
  key: string;
  label: string;
  description: string;
  /** Função que retorna a data/hora absoluta a partir de "agora". */
  resolve: () => Date;
};

const PRESETS: Preset[] = [
  {
    key: "15m",
    label: "Em 15 minutos",
    description: "Lembrete rápido",
    resolve: () => new Date(Date.now() + 15 * 60 * 1000),
  },
  {
    key: "1h",
    label: "Em 1 hora",
    description: "Padrão",
    resolve: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    key: "3h",
    label: "Em 3 horas",
    description: "Mais tarde hoje",
    resolve: () => new Date(Date.now() + 3 * 60 * 60 * 1000),
  },
  {
    key: "tomorrow",
    label: "Amanhã 09:00",
    description: "Começo do próximo dia",
    resolve: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    key: "monday",
    label: "Segunda 09:00",
    description: "Próxima semana",
    resolve: () => {
      const d = new Date();
      const day = d.getDay(); // 0 = dom, 1 = seg
      const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
      d.setDate(d.getDate() + daysUntilMonday);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

/**
 * Botão "Lembrar" no header do chat — abre popover com presets de tempo
 * para criar uma `Activity` (TASK) ligada ao contato. O agente usa pra
 * "voltar nesse cliente em 1h" sem sair do chat.
 *
 * Implementado como popover CSS + position fixed (sem Radix) pra evitar
 * mais um overlay no bundle. Em mobile vira sheet bottom (md:absolute
 * top-full pra desktop, fixed bottom-0 pra mobile).
 */
export function RemindButton({
  contactId,
  contactName,
  conversationId: _conversationId,
}: {
  contactId: string;
  contactName: string;
  /** Não persistido na Activity (schema atual não relaciona Activity↔Conversation),
   *  mas mantido na assinatura pra futuras integrações (ex.: link no toast). */
  conversationId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const createReminder = async (preset: Preset) => {
    setLoading(preset.key);
    try {
      const scheduledAt = preset.resolve();
      const res = await fetch(apiUrl("/api/activities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TASK",
          title: `Lembrete: ${contactName}`,
          description: `Voltar a falar com ${contactName} (${preset.label.toLowerCase()})`,
          scheduledAt: scheduledAt.toISOString(),
          contactId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.message === "string" ? data.message : "Não foi possível criar lembrete.");
        return;
      }
      toast.success(`Lembrete criado: ${preset.label}`);
      setOpen(false);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <TooltipHost label="Criar lembrete" side="bottom">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Criar lembrete"
          aria-expanded={open}
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:text-[var(--color-ink-muted)] dark:hover:bg-slate-800 dark:hover:text-slate-100",
            open && "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
          )}
        >
          <BellPlus size={18} strokeWidth={2.2} />
        </button>
      </TooltipHost>

      {open && (
        <>
          {/* Backdrop só em mobile pra fechar tap-fora confortável. */}
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            className={cn(
              "z-50",
              // Mobile: sheet de baixo.
              "fixed inset-x-3 bottom-3 rounded-3xl bg-white p-4 shadow-[var(--shadow-lg)] ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800",
              // Desktop: popover ancorado embaixo do botão.
              "md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-[300px] md:rounded-2xl md:p-3",
            )}
            role="dialog"
            aria-label="Escolher quando lembrar"
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <Bell className="size-4 text-primary" strokeWidth={2.2} />
              <h3 className="text-[13px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                Lembrar de {contactName}
              </h3>
            </div>

            <div className="flex flex-col gap-1">
              {PRESETS.map((p) => {
                const isLoading = loading === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={!!loading}
                    onClick={() => createReminder(p)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      "hover:bg-[var(--color-bg-subtle)] dark:hover:bg-slate-800/60",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                        {p.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[var(--color-ink-muted)]">
                        {p.description}
                      </div>
                    </div>
                    {isLoading && (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 px-3 text-[10px] font-medium text-[var(--color-ink-muted)] dark:text-slate-500">
              Aparece em <span className="font-bold">Tarefas</span> e na timeline do contato.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
