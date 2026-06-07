/** Tipos da Distribuição Inteligente (frontend). Espelham o backend
 *  (`services/distribution/*`). */

export type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

export type DistributionBlockReason =
  | "INACTIVE"
  | "OFFLINE"
  | "ON_PAUSE"
  | "OUTSIDE_WORKING_HOURS"
  | "QUEUE_LIMIT_REACHED"
  | "TYPE_INCOMPATIBLE";

export interface DistributionResponsibleDto {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  participates: boolean;
  queueLimit: number;
  volume: number;
  type: string | null;
  paused: boolean;
  lastExecutionAt: string | null;
  status: AgentOnlineStatus | null;
  hasSchedule: boolean;
  queueCount: number;
  eligible: boolean;
  blockedReasons: DistributionBlockReason[];
}

export interface ResponsiblesResponse {
  responsibles: DistributionResponsibleDto[];
}

export interface EvaluatedResponsibleSummary {
  userId: string;
  name: string | null;
  eligible: boolean;
  blockedReasons: DistributionBlockReason[];
  queueCount: number;
}

export type DistributionReason =
  | "ASSIGNED"
  | "SMART_DISTRIBUTION_NOT_ENABLED"
  | "NO_ELIGIBLE_RESPONSIBLE";

export interface DistributionResult {
  success: boolean;
  reason: DistributionReason;
  selectedUserId: string | null;
  selectedUserName: string | null;
  evaluated: EvaluatedResponsibleSummary[];
}

export interface PendingDistributionDto {
  id: string;
  dealId: string | null;
  contactId: string | null;
  label: string;
  distributionType: string | null;
  triggerSource: string;
  attempts: number;
  lastAttemptAt: string;
  createdAt: string;
}

export interface PendingResponse {
  pending: PendingDistributionDto[];
}

export interface RetryResult {
  resolved: number;
  cancelled: number;
  pending: number;
}

export interface UpdateResponsibleInput {
  participates?: boolean;
  paused?: boolean;
  queueLimit?: number;
  volume?: number;
  type?: string | null;
}

/** Rótulos PT-BR dos motivos de bloqueio (para tooltips/badges). */
export const BLOCK_REASON_LABELS: Record<DistributionBlockReason, string> = {
  INACTIVE: "Inativo (bloqueado pelo admin)",
  OFFLINE: "Offline",
  ON_PAUSE: "Em pausa / ausente",
  OUTSIDE_WORKING_HOURS: "Fora do expediente",
  QUEUE_LIMIT_REACHED: "Fila cheia",
  TYPE_INCOMPATIBLE: "Tipo incompatível",
};
