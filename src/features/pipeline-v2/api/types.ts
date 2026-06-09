/*
 * Tipos compartilhados pela camada de API do /pipeline/kanban-v2.
 * Espelham os DTOs reais do backend (mantemos o shape exato usado
 * pelo `/api/pipelines/:id/board` para preservar invalidação cruzada
 * com a tela legada).
 */

export type StatusFilter = "OPEN" | "WON" | "LOST" | "ALL";

export interface BoardDealDto {
  id: string;
  number?: number;
  title: string;
  value: number | string;
  status: string;
  position: number;
  expectedClose: string | null;
  createdAt: string;
  updatedAt: string;
  isRotting: boolean;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  owner: { id: string; name: string; avatarUrl?: string | null } | null;
  lastMessage: { content: string; createdAt: string; direction: string } | null;
  channel?: string | null;
  productName?: string | null;
  productType?: "PRODUCT" | "SERVICE" | null;
  tags?: { id: string; name: string; color: string }[];
  pendingActivities?: number;
  hasOverdueActivity?: boolean;
  unreadCount?: number;
}

export interface BoardStageDto {
  id: string;
  name: string;
  color: string;
  position: number;
  winProbability: number;
  rottingDays: number;
  pipelineId?: string;
  isIncoming?: boolean;
  /** Estágios terminais fixos (estilo Kommo) — sempre os 2 últimos. */
  isWon?: boolean;
  isLost?: boolean;
  conversionRate?: number;
  avgDaysInStage?: number;
  totalCount?: number;
  loadedCount?: number;
  hasMore?: boolean;
  offset?: number;
  deals: BoardDealDto[];
}

export interface PipelineListItemDto {
  id: string;
  name: string;
  isDefault?: boolean;
}
