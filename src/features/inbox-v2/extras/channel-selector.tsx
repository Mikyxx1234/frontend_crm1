"use client";

import { useMemo } from "react";
import { IconBrandWhatsapp, IconCircleDot } from "@tabler/icons-react";

import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass";
import { cn } from "@/lib/utils";

import type { OutboundChannelOption } from "@/features/inbox-v2/hooks/use-channels";

/**
 * Seletor de canal de envio (WhatsApp). Renderizado acima do Composer
 * apenas quando a org tem >1 canal CONNECTED — orgs com 1 canal só não
 * precisam do widget (comportamento legacy preservado).
 *
 * O canal "atual" da conversa (último inbound) é destacado com um chip
 * "atual" no item da lista. O canal selecionado para envio é controlado
 * pelo pai, que persiste em localStorage por conversa.
 */
export function ChannelSelector({
  channels,
  selectedChannelId,
  conversationChannelId,
  onSelect,
  disabled,
  className,
}: {
  channels: OutboundChannelOption[];
  selectedChannelId: string | null;
  /** Canal "atual" da conversa (último inbound) — destacado como referência. */
  conversationChannelId: string | null;
  onSelect: (channelId: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const options = useMemo<DropdownOption[]>(() => {
    return channels.map((ch) => {
      const isCurrent = ch.id === conversationChannelId;
      return {
        value: ch.id,
        label: (
          <span className="flex items-center gap-2">
            <span className="truncate">{ch.name}</span>
            {isCurrent ? (
              <span className="rounded-full bg-success/15 px-1.5 py-0.5 font-display text-[10px] font-semibold text-success ring-1 ring-inset ring-success/25">
                atual
              </span>
            ) : null}
          </span>
        ),
        icon: <IconBrandWhatsapp size={14} className="text-[var(--color-success)]" />,
        description: ch.phoneNumber ?? undefined,
      };
    });
  }, [channels, conversationChannelId]);

  const selected = channels.find((c) => c.id === selectedChannelId) ?? null;
  const labelText = selected?.name ?? "Selecionar canal";
  const sublabelText = selected?.phoneNumber ?? null;

  return (
    <DropdownGlass
      options={options}
      value={selectedChannelId ?? undefined}
      onValueChange={onSelect}
      disabled={disabled}
      matchTriggerWidth={false}
      menuLabel="Enviar por"
      align="end"
      side="top"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2.5 py-1 font-display text-[11.5px] font-semibold text-[var(--text-secondary)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-label={`Canal de envio: ${labelText}`}
        >
          <IconBrandWhatsapp size={13} className="shrink-0 text-[var(--color-success)]" />
          <span className="truncate">{labelText}</span>
          {sublabelText ? (
            <span className="hidden truncate text-[var(--text-muted)] sm:inline">
              · {sublabelText}
            </span>
          ) : null}
          <IconCircleDot
            size={10}
            className={cn(
              "shrink-0",
              selectedChannelId && selectedChannelId === conversationChannelId
                ? "text-success"
                : "text-[var(--brand-primary)]",
            )}
          />
        </button>
      }
    />
  );
}
