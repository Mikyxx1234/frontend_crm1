/**
 * Stub no frontend. A implementação real (que conversa com a Meta Graph
 * API) vive no backend. O frontend importa apenas tipos pra renderizar
 * o WhatsAppHealthBanner com dados vindos de `/api/whatsapp/health`.
 */

export type WhatsAppHealthSeverity = "ok" | "warning" | "error" | "unknown";

export type MetaPhoneNumberHealth = {
  display_phone_number?: string | null;
  quality_rating?: "GREEN" | "YELLOW" | "RED" | string | null;
  name_status?: string | null;
  status?: string | null;
  messaging_limit_tier?: string | null;
  [key: string]: unknown;
};

export type WhatsAppHealthStatus = {
  reachable: boolean;
  severity: WhatsAppHealthSeverity;
  message: string;
  reasons: string[];
  raw?: MetaPhoneNumberHealth | null;
  configured: boolean;
  checkedAt: string | null;
  error?: string | null;
};
