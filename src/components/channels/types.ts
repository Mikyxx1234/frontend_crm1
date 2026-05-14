import type {
  ChannelProvider,
  ChannelStatus,
  ChannelType,
} from "@prisma/client";

/** Canal como retornado pela API (datas serializadas como string). */
export type ApiChannel = {
  id: string;
  name: string;
  type: ChannelType;
  provider: ChannelProvider;
  status: ChannelStatus;
  config: unknown;
  phoneNumber: string | null;
  lastConnectedAt: string | null;
  qrCode: string | null;
  sessionData: unknown;
  createdAt: string;
  updatedAt: string;
  /// Slug da Organization dona deste canal — usado pra montar a URL
  /// do webhook Meta scoped (/api/webhooks/meta/{slug}). Vazio nao
  /// deve acontecer (todo canal tem org), mas tipado como string
  /// pra robustez.
  organizationSlug: string;
};

export function parseChannelConfigRecord(
  config: unknown
): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}
