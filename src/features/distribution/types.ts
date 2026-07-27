/** Tipos da Distribuição Inteligente (frontend). Espelham o backend
 *  (`services/distribution/*`). */

export type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

export type DistributionBlockReason =
  | "INACTIVE"
  | "OFFLINE"
  | "ON_PAUSE"
  | "OUTSIDE_WORKING_HOURS"
  | "PRE_LUNCH"
  | "PRE_END"
  | "QUEUE_LIMIT_REACHED"
  | "TYPE_INCOMPATIBLE"
  | "DEPARTMENT_MISMATCH";

export interface ResponsibleScheduleDto {
  startTime: string;
  lunchStart: string;
  lunchEnd: string;
  endTime: string;
  timezone: string;
  weekdays: number[];
}

export interface ResponsibleDepartmentRef {
  id: string;
  name: string;
}

export interface DistributionResponsibleDto {
  userId: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;
  role: string;
  participates: boolean;
  queueLimit: number;
  volume: number;
  type: string | null;
  paused: boolean;
  /**
   * Minutos de antecedência (pré-almoço e pré-fim de expediente).
   * Default 30.
   */
  preLunchStopMinutes?: number;
  lastExecutionAt: string | null;
  /** Departamentos dos quais é membro (roteamento por departamento). */
  departments?: ResponsibleDepartmentRef[];
  status: AgentOnlineStatus | null;
  hasSchedule: boolean;
  /** Expediente (null se não configurado). */
  schedule?: ResponsibleScheduleDto | null;
  queueCount: number;
  eligible: boolean;
  blockedReasons: DistributionBlockReason[];
  /**
   * Presença de USO do CRM ("aba aberta") — separada do `status`
   * (Online/Ausente/Offline da Distribuição). Alimentada pelo
   * heartbeat global do frontend.
   */
  systemOnline?: boolean;
  lastSeenAt?: string | null;
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
  /** Canal de origem (WHATSAPP, INSTAGRAM, FACEBOOK, EMAIL, WEBCHAT). */
  channel: string;
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
  preLunchStopMinutes?: number;
  /** Substitui o conjunto de departamentos do responsável. */
  departmentIds?: string[];
  /** Upsert parcial do AgentSchedule (almoço / expediente). */
  schedule?: {
    startTime?: string;
    lunchStart?: string;
    lunchEnd?: string;
    endTime?: string;
    timezone?: string;
    weekdays?: number[];
  };
}

/** Rótulos PT-BR dos motivos de bloqueio (para tooltips/badges). */
export const BLOCK_REASON_LABELS: Record<DistributionBlockReason, string> = {
  INACTIVE: "Inativo (bloqueado pelo admin)",
  OFFLINE: "Offline",
  ON_PAUSE: "Em pausa / ausente",
  OUTSIDE_WORKING_HOURS: "Fora do expediente",
  PRE_LUNCH: "Pré-almoço / almoço",
  PRE_END: "Pré-fim de expediente",
  QUEUE_LIMIT_REACHED: "Fila cheia",
  TYPE_INCOMPATIBLE: "Tipo incompatível",
  DEPARTMENT_MISMATCH: "Fora do departamento",
};
