"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

export type PipelineUrlRef = {
  id: string;
  number?: number;
  slug?: string;
  name?: string;
};

export type StageUrlRef = {
  id: string;
  number?: number;
  slug?: string;
  name?: string;
};

/** Valor público na URL: `?pipeline=12`. */
export function pipelineUrlParam(p: PipelineUrlRef | undefined | null): string | null {
  return typeof p?.number === "number" && Number.isFinite(p.number) ? String(p.number) : null;
}

/** Valor público na URL: `?stage=3`. */
export function stageUrlParam(s: StageUrlRef | undefined | null): string | null {
  return typeof s?.number === "number" && Number.isFinite(s.number) ? String(s.number) : null;
}

function resolvePublicUrlRef<T extends { id: string; number?: number; slug?: string; name?: string }>(
  items: T[],
  raw: string,
): T | undefined {
  const key = raw.trim();
  if (!key) return undefined;
  if (/^\d+$/.test(key)) {
    const n = Number(key);
    const byNumber = items.find((item) => Number(item.number) === n);
    if (byNumber) return byNumber;
  }
  return (
    items.find((item) => item.slug === key) ??
    items.find((item) => (item.name ?? "").toLowerCase() === key.toLowerCase()) ??
    items.find((item) => item.id === key)
  );
}

/**
 * Resolve `?pipeline=`: dígitos → number; senão slug/nome (bookmarks); CUID por último.
 */
export function findPipelineByUrlParam<T extends PipelineUrlRef>(
  pipelines: T[],
  raw: string,
): T | undefined {
  return resolvePublicUrlRef(pipelines, raw);
}

/**
 * Resolve `?stage=`: dígitos → number; senão slug/nome (bookmarks); CUID por último.
 */
export function findStageByUrlParam<T extends StageUrlRef>(
  stages: T[],
  raw: string,
): T | undefined {
  return resolvePublicUrlRef(stages, raw);
}

/**
 * Funil na URL como `?pipeline=<number>`; estado interno continua CUID.
 * Init: URL number/slug/CUID → LS (id) → default. Troca limpa `?stage=`.
 * Depois do load, slug/CUID na query são substituídos pelo number.
 */
export function usePipelineUrlSync(pipelines: PipelineListItemDto[] | undefined) {
  const [pipelineId, setPipelineIdState] = useState<string | null>(null);

  // useLayoutEffect: `?pipeline=9` vira CUID antes do paint — senão o board
  // fica enabled:false (idle) e o host antigo esperava isFetched para sempre.
  useLayoutEffect(() => {
    if (pipelineId || !pipelines?.length) return;

    const urlKey = readUrlParam("pipeline");
    if (urlKey) {
      const hit = findPipelineByUrlParam(pipelines, urlKey);
      if (hit) {
        setPipelineIdState(hit.id);
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
    const urlVal = pipelineUrlParam(p);
    if (urlVal) writeUrlParam("pipeline", urlVal, "replace");
  }, [pipelineId, pipelines]);

  const setPipelineId = useCallback(
    (id: string | null) => {
      setPipelineIdState(id);
      writeUrlParam("stage", null, "replace");
      if (!id || !pipelines?.length) return;
      const p = pipelines.find((x) => x.id === id);
      const urlVal = pipelineUrlParam(p);
      if (urlVal) writeUrlParam("pipeline", urlVal, "replace");
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
  numberOrEmpty: string,
): void {
  if (!pipelineId || typeof window === "undefined") return;
  try {
    localStorage.setItem(flowStageStorageKey(pipelineId), numberOrEmpty);
  } catch {
    /* private mode / quota */
  }
}

/**
 * Etapa do Flow: `?stage=<number>`; ausente = Todos.
 * Init: URL number/slug/nome/CUID → LS (por funil) → Todos. Troca grava URL + LS.
 * Depois do load, slug/CUID na query são substituídos pelo number.
 *
 * Retorna `hydrated`: enquanto false, `selectedStageId` ainda pode mudar pela
 * restauração. Quem depende da etapa para escolher um deal inicial deve
 * esperar — senão abre o 1º deal do board e a etapa restaurada é sobrescrita.
 */
export function useStageUrlSync(
  stages: StageUrlRef[],
  selectedStageId: string | null,
  setSelectedStageId: (id: string | null) => void,
  /** Troca de funil: re-lê `?stage=` / LS e zera seleção local. */
  resetKey?: string | null,
) {
  const [hydrated, setHydrated] = useState(false);
  const prevResetKeyRef = useRef(resetKey);

  useEffect(() => {
    const prev = prevResetKeyRef.current;
    prevResetKeyRef.current = resetKey;
    // null → 1º funil: a URL ainda vale; não zerar a etapa (flash "Todos 0").
    if (!prev && resetKey) {
      setHydrated(false);
      return;
    }
    if (prev && resetKey && prev !== resetKey) {
      setHydrated(false);
      setSelectedStageId(null);
    }
  }, [resetKey, setSelectedStageId]);

  // useLayoutEffect: restaura ?stage= antes do paint. useEffect deixava
  // um frame com selectedStageId=null ("Todos") depois do board chegar.
  useLayoutEffect(() => {
    if (hydrated || !stages.length) return;

    const urlKey = readUrlParam("stage");
    if (urlKey) {
      const hit = findStageByUrlParam(stages, urlKey);
      if (hit) setSelectedStageId(hit.id);
      setHydrated(true);
      return;
    }

    const saved = readSavedFlowStage(resetKey);
    if (saved != null && saved !== "") {
      const hit = findStageByUrlParam(stages, saved);
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
    const urlVal = stageUrlParam(s);
    if (urlVal) {
      writeUrlParam("stage", urlVal, "replace");
      writeSavedFlowStage(resetKey, urlVal);
    }
  }, [selectedStageId, stages, hydrated, resetKey]);

  return { hydrated };
}
