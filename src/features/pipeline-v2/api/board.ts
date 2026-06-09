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

/**
 * Ordenação opcional dos cards dentro de cada coluna. Quando omitida,
 * o backend cai no default histórico (`position asc` = ordem manual
 * de drag-and-drop). Espelha os params aceitos pelo route handler em
 * `backend_crm1/src/app/api/pipelines/[id]/board/route.ts`.
 *
 * Hoje o frontend usa dois campos server-side:
 *   - `field: "createdAt"` — opções `created_newest`/`created_oldest`
 *     do kebab "Ordenar cards".
 *   - `field: "lastInteraction"` — opções `interaction_newest`/
 *     `interaction_oldest` (última atualização da conversa do contato).
 *
 * Para os demais sorts (`name_*`) a ordenação continua client-side
 * porque o backend ainda não suporta esses campos.
 */
export interface BoardSortParam {
  field: "createdAt" | "lastInteraction";
  direction: "asc" | "desc";
}

/** GET /api/pipelines/:id/board?status=OPEN[&sort=createdAt&direction=desc] */
export async function getBoard(
  pipelineId: string,
  status: StatusFilter = "OPEN",
  sort?: BoardSortParam,
): Promise<BoardStageDto[]> {
  const params = new URLSearchParams();
  if (status !== "OPEN") params.set("status", status);
  if (sort) {
    params.set("sort", sort.field);
    params.set("direction", sort.direction);
  }
  const q = params.toString();
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/board${q ? `?${q}` : ""}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar quadro",
    );
  }
  if (Array.isArray(data)) return data as BoardStageDto[];
  return (Array.isArray(data.stages) ? data.stages : []) as BoardStageDto[];
}
