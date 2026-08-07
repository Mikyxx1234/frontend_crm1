import type { ApiChannel } from "@/components/channels/types";
import { apiUrl } from "@/lib/api";

/** Canal WhatsApp Cloud API (templates são por WABA deste canal). */
export function isMetaCloudWhatsAppChannel(ch: Pick<ApiChannel, "type" | "provider">): boolean {
  return ch.type === "WHATSAPP" && ch.provider === "META_CLOUD_API";
}

/** Label do select: nome + telefone (não o WABA cru). */
export function formatMetaChannelLabel(ch: Pick<ApiChannel, "name" | "phoneNumber">): string {
  const phone = typeof ch.phoneNumber === "string" ? ch.phoneNumber.trim() : "";
  const name = ch.name?.trim() || "Canal";
  return phone ? `${name} · ${phone}` : name;
}

export async function fetchMetaCloudWhatsAppChannels(): Promise<ApiChannel[]> {
  const res = await fetch(apiUrl("/api/channels"));
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { channels?: unknown })?.channels)
      ? ((data as { channels: ApiChannel[] }).channels)
      : [];
  return (list as ApiChannel[]).filter(isMetaCloudWhatsAppChannel);
}
