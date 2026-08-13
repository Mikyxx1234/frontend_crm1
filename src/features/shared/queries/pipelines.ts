"use client";

/*
 * Fonte ÚNICA de verdade para `GET /api/pipelines` no client.
 *
 * Key canônica: `["pipelines-v2"]` (a mesma que `usePipelines` do
 * pipeline-v2 já usava e que as mutações de /settings/pipeline
 * invalidam). Keys locais antigas (`pipelines-list`, `pipelines-lite`,
 * `pipelines-stages`, `pipelines-for-condition`, `["pipelines"]`…)
 * faziam a mesma requisição sair várias vezes na mesma tela.
 *
 * O payload do GET traz `stages` embutido, então consumidores que
 * precisam de etapas podem tipar via generic sem uma 2ª requisição.
 */

import { useQuery } from "@tanstack/react-query";

import { listPipelines } from "@/features/pipeline-v2/api/board";
import type { PipelineListItemDto } from "@/features/pipeline-v2/api/types";
import { isPreviewMode } from "@/lib/preview-mode";

export type { PipelineListItemDto };
export { listPipelines };

export const PIPELINES_QUERY_KEY = ["pipelines-v2"] as const;

/** Query canônica da lista de funis (com `stages`). */
export function usePipelinesQuery<T = PipelineListItemDto>(enabled = true) {
  return useQuery<T[]>({
    queryKey: PIPELINES_QUERY_KEY,
    queryFn: () => listPipelines() as Promise<T[]>,
    enabled: isPreviewMode() ? true : enabled,
    staleTime: 5 * 60_000,
  });
}
