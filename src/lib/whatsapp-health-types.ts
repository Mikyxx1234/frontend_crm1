/** Tipos do banner de saúde WhatsApp (sem lógica de servidor / Meta). */

export type WhatsAppHealthSeverity = "ok" | "warning" | "critical" | "unknown";

export type WhatsAppHealthStatus = {
  reachable: boolean;
  severity: WhatsAppHealthSeverity;
  message: string;
  reasons: string[];
  raw?: unknown;
};
