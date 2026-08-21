/**
 * Espelho do tipo `AcademicCockpit` do backend
 * (`src/services/ai/cockpit-academic.ts`), servido dentro de
 * `GET /api/public/agent-cockpit` no campo `academic`.
 */

export interface NamedCount {
  name: string;
  n: number;
}

export interface AcademicSaude {
  agentActive: boolean;
  agentName: string | null;
  spokeToday: number;
  attendingNow: number;
  resolvedSoloToday: number;
  handoffToday: number;
  sendFailedToday: number;
  firstResponseMedianSec: number | null;
}

export interface AcademicResolucao {
  closedByAiToday: number;
  closedByIdle: number;
  closedByStudentAsk: number;
  idleNudgesToday: number;
  returnedAfterAiClose: number;
}

export interface AcademicHandoff {
  totalToday: number;
  byDepartment: NamedCount[];
  byKind: NamedCount[];
}

export interface AcademicFunil {
  academicChannelSpoke: number;
  otherChannelSpoke: number;
  byStage: NamedCount[];
  leadDeEntradaOpen: number;
  leadDeEntradaWithAi: number;
}

export interface AcademicCockpit {
  saude: AcademicSaude;
  resolucao: AcademicResolucao;
  handoff: AcademicHandoff;
  funil: AcademicFunil;
}

export interface AgentCockpitResponse {
  generatedAt: string;
  academic?: AcademicCockpit;
}

/** Abas nativas do agente acadêmico dentro de "Agentes de IA". */
export type AcademicTabId = "saude" | "resolucao" | "handoff" | "funil";
