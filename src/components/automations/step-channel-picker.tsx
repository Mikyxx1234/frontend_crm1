"use client";

/**
 * step-channel-picker — seleção de canal (`config.channelId`) para steps
 * de mensagem (WhatsApp texto/mídia/template/botões/lista/produto + e-mail
 * e `question`). Compartilhado entre o campo inline do editor
 * (`inline-editor.tsx`, via `useConnectedStepChannels`) e o menu kebab
 * dos nodes do canvas (`StepChannelKebabMenu`).
 *
 * Padrão: `channelId` vazio = canal da conversa (entrada / gatilho).
 * Override explícito só quando o operador escolhe uma conexão no passo.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconDotsVertical } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipHost } from "@/components/ui/tooltip";
import {
  fetchConnectedEmailChannels,
  fetchConnectedMetaCloudWhatsAppChannels,
  formatMetaChannelLabel,
} from "@/lib/meta-whatsapp/meta-cloud-channels";
import { cn } from "@/lib/utils";

export type StepChannelOption = { id: string; label: string; detail?: string };

/** Mockup do /fluxo quando a org não tem canal conectado. */
const MOCK_WHATSAPP_CHANNELS: StepChannelOption[] = [
  { id: "mock-wa-oficial", label: "WhatsApp Oficial", detail: "+55 11 99999-0001" },
  { id: "mock-wa-suporte", label: "WhatsApp Suporte", detail: "+55 11 99999-0002" },
  { id: "mock-wa-comercial", label: "WhatsApp Comercial", detail: "+55 11 99999-0003" },
];

const MOCK_EMAIL_CHANNELS: StepChannelOption[] = [
  { id: "mock-email-noreply", label: "E-mail operacional", detail: "noreply@empresa.com" },
  { id: "mock-email-contato", label: "E-mail contato", detail: "contato@empresa.com" },
];

/** `send_email` usa canais de e-mail; todo o resto usa WhatsApp (Meta Cloud API). */
function channelKindForStepType(stepType: string): "whatsapp" | "email" {
  return stepType === "send_email" ? "email" : "whatsapp";
}

export function useConnectedStepChannels(
  stepType: string,
  opts?: { enabled?: boolean; mockIfEmpty?: boolean },
): {
  options: StepChannelOption[];
  isLoading: boolean;
} {
  const kind = channelKindForStepType(stepType);
  const mockIfEmpty = opts?.mockIfEmpty === true;
  const { data, isLoading } = useQuery({
    queryKey: ["automation-step-connected-channels", kind],
    queryFn: async () =>
      kind === "email" ? fetchConnectedEmailChannels() : fetchConnectedMetaCloudWhatsAppChannels(),
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  });
  // Memo obrigatório: array novo a cada render quebrava o useEffect de
  // buildNodes no canvas (setNodes em loop → Maximum update depth).
  const options: StepChannelOption[] = useMemo(() => {
    const real = (data ?? []).map((c) => ({
      id: c.id,
      label: c.name?.trim() || (kind === "email" ? "Canal" : formatMetaChannelLabel(c)),
      detail:
        kind === "email"
          ? undefined
          : typeof c.phoneNumber === "string"
            ? c.phoneNumber.trim()
            : undefined,
    }));
    if (real.length > 0 || !mockIfEmpty) return real;
    return kind === "email" ? MOCK_EMAIL_CHANNELS : MOCK_WHATSAPP_CHANNELS;
  }, [data, kind, mockIfEmpty]);
  return { options, isLoading };
}

export function channelLabelFromOptions(
  options: StepChannelOption[],
  channelId: string | undefined | null,
): string | null {
  if (!channelId) return null;
  return options.find((o) => o.id === channelId)?.label ?? null;
}

export const INHERIT_CHANNEL_VALUE = "__inherit__";

/** Menu "⋮" nos nodes do canvas — mesmas opções, formato compacto. */
export function StepChannelKebabMenu({
  stepType,
  channelId,
  isFirstMessageStep,
  onChange,
}: {
  stepType: string;
  channelId: string | undefined;
  isFirstMessageStep: boolean;
  onChange: (channelId: string) => void;
}) {
  const { options } = useConnectedStepChannels(stepType);
  if (options.length <= 1) return null;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <TooltipHost label="Canal de envio" side="top">
          <DropdownMenuTrigger
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)] group-hover/node:opacity-100"
            aria-label="Canal de envio"
          >
            <IconDotsVertical className="size-3.5" strokeWidth={2.2} />
          </DropdownMenuTrigger>
        </TooltipHost>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Canal de envio
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onChange("")}
            className={cn("text-[12.5px]", !channelId && "font-semibold text-primary")}
          >
            Canal da conversa (entrada)
          </DropdownMenuItem>
          {options.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => onChange(o.id)}
              className={cn("text-[12.5px]", channelId === o.id && "font-semibold text-primary")}
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Selo pequeno exibido no node quando há canal explícito/relevante. */
export function StepChannelBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[9.5px] font-bold tracking-tight text-[var(--brand-primary)]">
      {label}
    </span>
  );
}
