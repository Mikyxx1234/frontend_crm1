/**
 * DTOs de USO REAL — espelho dos retornos das APIs em backend_crm1:
 *   GET /api/logs/system-usage
 *   GET /api/logs/system-usage/:userId/sessions
 *
 * `activeNow` é o campo canônico para "sessão de atividade aberta agora".
 * Não reusar `systemOnline` (esse é da presença ao vivo, distinta).
 */

export interface SystemUsageAggregateRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  avatarUrl: string | null;
  activeNow: boolean;
  lastActivityAt: string | null;
  totalSeconds: number;
  sessionCount: number;
  averageSessionSeconds: number;
  interactionCount: number;
}

export interface SystemUsageSummaryResponse {
  items: SystemUsageAggregateRow[];
  pending?: boolean;
}

export interface SystemUsageSessionItem {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  interactionCount: number;
  isOpen: boolean;
}

export interface SystemUsageSessionsResponse {
  items: SystemUsageSessionItem[];
  nextCursor: string | null;
  pending?: boolean;
}
