/** Espelha enums Prisma do monólito — sem @prisma/client no frontend. */
export type ChannelType = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "EMAIL" | "WEBCHAT";
export type ChannelProvider = "META_CLOUD_API" | "BAILEYS_MD";
export type ChannelStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_READY"
  | "FAILED";

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
};

export function parseChannelConfigRecord(
  config: unknown
): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}
