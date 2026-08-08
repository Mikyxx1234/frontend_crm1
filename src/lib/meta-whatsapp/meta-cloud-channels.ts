import type { ApiChannel } from "@/components/channels/types";
import { apiUrl } from "@/lib/api";

/** Canal WhatsApp Cloud API (templates são por WABA deste canal). */
export function isMetaCloudWhatsAppChannel(ch: Pick<ApiChannel, "type" | "provider">): boolean {
  return ch.type === "WHATSAPP" && ch.provider === "META_CLOUD_API";
}

/** Canal de e-mail (usado por `send_email`). */
export function isEmailChannel(ch: Pick<ApiChannel, "type">): boolean {
  return ch.type === "EMAIL";
}

/** Filtra só os canais CONECTADOS — é o que importa pra seleção em automação. */
export function onlyConnectedChannels<T extends Pick<ApiChannel, "status">>(channels: T[]): T[] {
  return channels.filter((c) => c.status === "CONNECTED");
}

/** Label do select: nome + telefone (não o WABA cru). */
export function formatMetaChannelLabel(ch: Pick<ApiChannel, "name" | "phoneNumber">): string {
  const phone = typeof ch.phoneNumber === "string" ? ch.phoneNumber.trim() : "";
  const name = ch.name?.trim() || "Canal";
  return phone ? `${name} · ${phone}` : name;
}

async function fetchAllChannels(): Promise<ApiChannel[]> {
  const res = await fetch(apiUrl("/api/channels"));
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { channels?: unknown })?.channels)
      ? ((data as { channels: ApiChannel[] }).channels)
      : [];
  return list as ApiChannel[];
}

export async function fetchMetaCloudWhatsAppChannels(): Promise<ApiChannel[]> {
  const list = await fetchAllChannels();
  return list.filter(isMetaCloudWhatsAppChannel);
}

/** Canais WhatsApp Cloud API CONECTADOS — usado pelo picker de canal dos steps de mensagem. */
export async function fetchConnectedMetaCloudWhatsAppChannels(): Promise<ApiChannel[]> {
  return onlyConnectedChannels(await fetchMetaCloudWhatsAppChannels());
}

/** Canais de e-mail CONECTADOS — usado pelo picker de canal do `send_email`. */
export async function fetchConnectedEmailChannels(): Promise<ApiChannel[]> {
  const list = await fetchAllChannels();
  return onlyConnectedChannels(list.filter(isEmailChannel));
}
