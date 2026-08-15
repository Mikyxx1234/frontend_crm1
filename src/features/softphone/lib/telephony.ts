import type { SipExtension } from "../api/types";

export type RamalStatus = "ativo" | "inativo" | "nao_criado" | "falhou" | "provisionando";

export type TelephonyUser = {
  id: string;
  name: string;
  email: string;
  ramal: string | null;
  status: RamalStatus;
  telephonyOn: boolean;
  provisioningError?: string | null;
};

export const STATUS_LABEL: Record<RamalStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  nao_criado: "Não criado",
  falhou: "Falhou",
  provisionando: "Provisionando",
};

export function statusFromExtension(ext?: SipExtension): RamalStatus {
  if (!ext) return "nao_criado";
  if (ext.provisioningStep === "ACTIVE" && ext.telephonyEnabled) return "ativo";
  if (ext.provisioningStep === "FAILED") return "falhou";
  if (ext.provisioningStep === "DISABLED" || ext.telephonyEnabled === false) return "inativo";
  if (ext.provisioningStep && ext.provisioningStep !== "IDLE") return "provisionando";
  return "nao_criado";
}

export function toTelephonyUser(
  user: { id: string; name: string; email: string },
  ext?: SipExtension,
): TelephonyUser {
  const status = statusFromExtension(ext);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    ramal: ext?.authUser || null,
    status,
    telephonyOn: Boolean(ext?.telephonyEnabled && ext.provisioningStep === "ACTIVE"),
    provisioningError: ext?.provisioningError ?? null,
  };
}

export const PBX_STORAGE_KEY = "crm:pbx-settings";

export type PbxTransport = "UDP" | "TCP" | "TLS";

export type PbxSettings = {
  host: string;
  porta: string;
  transporte: PbxTransport;
  codecs: string[];
  gravacao: boolean;
  filaMax: number;
};

export const PBX_DEFAULTS: PbxSettings = {
  host: "sip.api4com.com",
  porta: "5060",
  transporte: "UDP",
  codecs: ["G.711 μ-law", "G.729", "OPUS"],
  gravacao: true,
  filaMax: 8,
};

export const PBX_CODECS = ["G.711 μ-law", "G.729", "OPUS"] as const;
export const PBX_TRANSPORTS: PbxTransport[] = ["UDP", "TCP", "TLS"];
