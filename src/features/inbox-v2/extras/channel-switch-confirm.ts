import { ApiError } from "@/lib/api";
import type { OutboundChannelOption } from "@/features/inbox-v2/hooks/use-channels";

export const SESSION_CLOSED_TOAST =
  "Sessão de 24h encerrada. Para continuar, utilize um template aprovado.";

/** Erro 409 do backend: envio humano bloqueado por sessão de 24h fechada. */
export function isSessionClosedError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "SESSION_CLOSED";
}

/** 409 do backend: canal de saída DISCONNECTED. */
export function isDisconnectedChannelError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  if (!/desconectado/i.test(message)) return false;
  if (err instanceof ApiError) return err.status === 409;
  return true;
}

/** Canal selecionado (Y) ≠ canal atual da conversa (X). */
export function isChannelMismatch(
  selectedChannelId: string | null | undefined,
  conversationChannelId: string | null | undefined,
): boolean {
  return Boolean(
    selectedChannelId &&
      conversationChannelId &&
      selectedChannelId !== conversationChannelId,
  );
}

function formatChannelLabel(
  channels: OutboundChannelOption[] | undefined,
  channelId: string,
): string {
  const ch = channels?.find((c) => c.id === channelId);
  if (!ch) return channelId;
  return ch.phoneNumber ? `${ch.name} (${ch.phoneNumber})` : ch.name;
}

/** Texto do dialog de confirmação ao enviar por outro canal. */
export function channelSwitchConfirmOptions(
  channels: OutboundChannelOption[] | undefined,
  selectedChannelId: string,
  conversationChannelId: string,
): {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
} {
  const currentLabel = formatChannelLabel(channels, conversationChannelId);
  const selectedLabel = formatChannelLabel(channels, selectedChannelId);
  return {
    title: "Enviar por outro canal?",
    description: `Esta conversa está no canal ${currentLabel}. Você escolheu enviar por ${selectedLabel}. Confirma o envio neste canal?`,
    confirmLabel: "Enviar neste canal",
    cancelLabel: "Cancelar",
  };
}
