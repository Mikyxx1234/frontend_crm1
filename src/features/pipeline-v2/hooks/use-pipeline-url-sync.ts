"use client";

import { useCallback, useEffect, useState } from "react";

import type { PipelineListItemDto } from "@/features/pipeline-v2/api/types";

const PIPELINE_STORAGE_KEY = "crm:pipeline:last-selected:v1";

function readUrlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(key);
}

function writeUrlParam(key: string, value: string | null, mode: "replace" | "push" = "replace") {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const cur = url.searchParams.get(key);
  if (value == null || value === "") {
    if (!url.searchParams.has(key)) return;
    url.searchParams.delete(key);
  } else {
    if (cur === value) return;
    url.searchParams.set(key, value);
  }
  const fn = mode === "push" ? window.history.pushState : window.history.replaceState;
  fn.call(window.history, window.history.state, "", url.toString());
}

/**
 * Funil na URL como `?pipeline=<slug>`; estado interno continua CUID.
 * Init: URL slug → LS (id) → default. Troca limpa `?stage=`.
 */
export function usePipelineUrlSync(pipelines: PipelineListItemDto[] | undefined) {
  const [pipelineId, setPipelineIdState] = useState<string | null>(null);

  useEffect(() => {
    if (pipelineId || !pipelines?.length) return;

    const urlSlug = readUrlParam("pipeline");
    if (urlSlug) {
      const bySlug = pipelines.find((p) => p.slug === urlSlug);
      if (bySlug) {
        setPipelineIdState(bySlug.id);
        return;
      }
      // slug inválido: aceita CUID legado na query
      const byId = pipelines.find((p) => p.id === urlSlug);
      if (byId) {
        setPipelineIdState(byId.id);
        return;
      }
    }

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PIPELINE_STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (saved && pipelines.some((p) => p.id === saved)) {
      setPipelineIdState(saved);
      return;
    }
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    setPipelineIdState(def.id);
  }, [pipelines, pipelineId]);

  useEffect(() => {
    if (!pipelineId || !pipelines?.length) return;
    try {
      localStorage.setItem(PIPELINE_STORAGE_KEY, pipelineId);
    } catch {
      /* ignore */
    }
    const p = pipelines.find((x) => x.id === pipelineId);
    if (p?.slug) writeUrlParam("pipeline", p.slug, "replace");
  }, [pipelineId, pipelines]);

  const setPipelineId = useCallback(
    (id: string | null) => {
      setPipelineIdState(id);
      writeUrlParam("stage", null, "replace");
      if (!id || !pipelines?.length) return;
      const p = pipelines.find((x) => x.id === id);
      if (p?.slug) writeUrlParam("pipeline", p.slug, "replace");
    },
    [pipelines],
  );

  return { pipelineId, setPipelineId };
}

/** Última fase do Flow por funil (`""` = Todos). */
const FLOW_STAGE_STORAGE_PREFIX = "crm:pipeline:flow:last-stage:v1:";

function flowStageStorageKey(pipelineId: string): string {
  return `${FLOW_STAGE_STORAGE_PREFIX}${pipelineId}`;
}

function readSavedFlowStage(pipelineId: string | null | undefined): string | null {
  if (!pipelineId || typeof window === "undefined") return null;
  try {
    return localStorage.getItem(flowStageStorageKey(pipelineId));
  } catch {
    return null;
  }
}

function writeSavedFlowStage(
  pipelineId: string | null | undefined,
  slugOrEmpty: string,
): void {
  if (!pipelineId || typeof window === "undefined") return;
  try {
    localStorage.setItem(flowStageStorageKey(pipelineId), slugOrEmpty);
  } catch {
    /* private mode / quota */
  }
}

/**
 * Etapa do Flow: `?stage=<slug>`; ausente = Todos.
 * Init: URL → LS (por funil) → Todos. Troca grava URL + LS.
 */
export function useStageUrlSync(
  stages: Array<{ id: string; slug?: string }>,
  selectedStageId: string | null,
  setSelectedStageId: (id: string | null) => void,
  /** Troca de funil: re-lê `?stage=` / LS e zera seleção local. */
  resetKey?: string | null,
) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    setSelectedStageId(null);
  }, [resetKey, setSelectedStageId]);

  useEffect(() => {
    if (hydrated || !stages.length) return;

    const resolve = (slugOrId: string) =>
      stages.find((s) => s.slug === slugOrId) ??
      stages.find((s) => s.id === slugOrId);

    const urlSlug = readUrlParam("stage");
    if (urlSlug) {
      const hit = resolve(urlSlug);
      if (hit) setSelectedStageId(hit.id);
      setHydrated(true);
      return;
    }

    const saved = readSavedFlowStage(resetKey);
    if (saved != null && saved !== "") {
      const hit = resolve(saved);
      if (hit) setSelectedStageId(hit.id);
    }
    // saved === "" ou ausente → Todos (null)
    setHydrated(true);
  }, [stages, hydrated, setSelectedStageId, resetKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedStageId) {
      writeUrlParam("stage", null, "replace");
      writeSavedFlowStage(resetKey, "");
      return;
    }
    const s = stages.find((x) => x.id === selectedStageId);
    if (s?.slug) {
      writeUrlParam("stage", s.slug, "replace");
      writeSavedFlowStage(resetKey, s.slug);
    }
  }, [selectedStageId, stages, hydrated, resetKey]);
}
