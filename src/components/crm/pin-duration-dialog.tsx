"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const OPTIONS: Array<{ hours: number; label: string }> = [
  { hours: 24, label: "24 horas" },
  { hours: 24 * 7, label: "7 dias" },
  { hours: 24 * 30, label: "30 dias" },
]

/**
 * Hook Promise-based (mesmo padrão de `useConfirm`) que devolve a
 * duração escolhida pelo agente pra fixar uma mensagem — igual ao
 * picker do WhatsApp (24h / 7 dias / 30 dias, default 7 dias).
 *
 * `requestDuration()` resolve com o número de horas escolhido, ou
 * `null` se o agente cancelar.
 */
export function usePinDurationDialog() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(24 * 7);
  const resolveRef = React.useRef<((v: number | null) => void) | null>(null);

  const requestDuration = React.useCallback((): Promise<number | null> => {
    setSelected(24 * 7);
    setOpen(true);
    return new Promise<number | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function finish(value: number | null) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOpen(false);
  }

  const dialog = (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(null); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Defina por quanto tempo a mensagem ficará fixada</DialogTitle>
          <DialogDescription>
            Você pode desafixar a mensagem a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              type="button"
              onClick={() => setSelected(opt.hours)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]",
              )}
            >
              <span
                className={cn(
                  "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2",
                  selected === opt.hours
                    ? "border-[var(--brand-primary)]"
                    : "border-[var(--border-default)]",
                )}
              >
                {selected === opt.hours && (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => finish(null)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => finish(selected)}>
            Fixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requestDuration, dialog };
}
