/*
 * Endpoints do Kanban v2.
 *
 * Espelha exatamente as URLs usadas pela tela legada
 * (`/api/pipelines/:id/board` GET com `?status=OPEN`) — preserva o
 * cache compartilhado por query key.
 */

import { apiUrl } from "@/lib/api";

import type { BoardStageDto, PipelineListItemDto, StatusFilter } from "./types";

/** GET /api/pipelines */
export async function listPipelines(): Promise<PipelineListItemDto[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar pipelines",
    );
  }
  return Array.isArray(data) ? data : data.pipelines ?? data.items ?? [];
}

/** GET /api/pipelines/:id/board?status=OPEN */
export async function getBoard(
  pipelineId: string,
  status: StatusFilter = "OPEN",
): Promise<BoardStageDto[]> {
  const q = status === "OPEN" ? "" : `?status=${status}`;
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/board${q}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar quadro",
    );
  }
  if (Array.isArray(data)) return data as BoardStageDto[];
  return (Array.isArray(data.stages) ? data.stages : []) as BoardStageDto[];
}
