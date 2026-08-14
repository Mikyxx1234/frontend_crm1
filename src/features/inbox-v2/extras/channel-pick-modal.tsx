"use client";

import { useEffect, useState } from "react";
import { IconBrandWhatsapp, IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { OutboundChannelOption } from "@/features/inbox-v2/hooks/use-channels";

function pickInitialId(
  channels: OutboundChannelOption[],
  preferredIds: Array<string | null | undefined>,
): string | null {
  const valid = new Set(channels.map((c) => c.id));
  for (const id of preferredIds) {
    if (id && valid.has(id)) return id;
  }
  return channels[0]?.id ?? null;
}

/**
 * Modal para o agente confirmar o WhatsApp de saída quando o canal
 * gravado na conversa está desconectado ou não foi identificado.
 */
export function ChannelPickModal({
  open,
  onOpenChange,
  channels,
  selectedChannelId,
  suggestedChannelId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: OutboundChannelOption[];
  selectedChannelId?: string | null;
  /** Canal da última mensagem pública, se ainda CONNECTED — pré-seleção. */
  suggestedChannelId?: string | null;
  onConfirm: (channelId: string) => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickedId(
      pickInitialId(channels, [selectedChannelId, suggestedChannelId]),
    );
  }, [open, channels, selectedChannelId, suggestedChannelId]);

  const canConfirm = Boolean(pickedId && channels.some((c) => c.id === pickedId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" bodyClassName="flex min-h-0 flex-1 flex-col gap-3 p-5 sm:p-6">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="pr-8">Escolher canal de envio</DialogTitle>
          <DialogDescription>
            O canal desta conversa não está identificado ou está desconectado.
            Selecione um WhatsApp conectado para enviar o template.
          </DialogDescription>
        </DialogHeader>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {channels.map((ch) => {
            const selected = ch.id === pickedId;
            const suggested = ch.id === suggestedChannelId;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => setPickedId(ch.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)] hover:border-[var(--glass-border-strong,var(--glass-border))]",
                  )}
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)]/12 text-[var(--color-success-text)]">
                    <IconBrandWhatsapp size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
                        {ch.name}
                      </span>
                      {suggested ? (
                        <span className="shrink-0 rounded-full bg-success/15 px-1.5 py-px font-display text-[10px] font-semibold text-success ring-1 ring-inset ring-success/25">
                          último envio
                        </span>
                      ) : null}
                    </span>
                    {ch.phoneNumber ? (
                      <span className="mt-0.5 block truncate text-[11.5px] text-[var(--text-muted)]">
                        {ch.phoneNumber}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <IconCheck size={16} className="shrink-0 text-[var(--brand-primary)]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!pickedId) return;
              onConfirm(pickedId);
            }}
          >
            Usar este canal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
