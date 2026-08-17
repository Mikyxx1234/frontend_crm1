"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AutomationStep } from "@/lib/automation-workflow";
import { newStepId } from "@/lib/automation-workflow";

const NONE = "__none__";
const PASTE_OFFSET = { x: 40, y: 40 };

type ClipboardPayload = {
  steps: AutomationStep[];
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return !!target.closest("[contenteditable='true'], input, textarea, select");
}

function readRfPos(config: unknown): { x: number; y: number } | null {
  if (typeof config !== "object" || config === null) return null;
  const c = config as Record<string, unknown>;
  if (typeof c.__rfPos !== "object" || c.__rfPos === null) return null;
  const p = c.__rfPos as Record<string, unknown>;
  if (typeof p.x !== "number" || typeof p.y !== "number") return null;
  return { x: p.x, y: p.y };
}

/** Remapeia ponteiros de step IDs; limpa refs fora do conjunto colado. */
function remapStepConfig(
  config: Record<string, unknown>,
  idMap: Map<string, string>,
  type: string
): Record<string, unknown> {
  const cfg = { ...config };
  const mapOrClear = (id: unknown): string | undefined => {
    if (typeof id !== "string" || !id || id === NONE) return undefined;
    return idMap.get(id);
  };

  if (typeof cfg.nextStepId === "string") {
    const next = mapOrClear(cfg.nextStepId);
    cfg.nextStepId = next ?? NONE;
  }
  for (const key of [
    "elseGotoStepId",
    "elseStepId",
    "timeoutGotoStepId",
    "receivedGotoStepId",
    "failureGotoStepId",
    "gotoStepId",
  ] as const) {
    if (typeof cfg[key] === "string") {
      const mapped = mapOrClear(cfg[key]);
      if (mapped) cfg[key] = mapped;
      else delete cfg[key];
    }
  }

  if (Array.isArray(cfg.buttons)) {
    cfg.buttons = (cfg.buttons as Record<string, unknown>[]).map((b) => {
      const goto = mapOrClear(b.gotoStepId);
      return { ...b, gotoStepId: goto };
    });
  }
  if (Array.isArray(cfg.rows)) {
    cfg.rows = (cfg.rows as Record<string, unknown>[]).map((r) => {
      const goto = mapOrClear(r.gotoStepId);
      return { ...r, gotoStepId: goto };
    });
  }
  if (type === "condition" && Array.isArray(cfg.branches)) {
    cfg.branches = (cfg.branches as Record<string, unknown>[]).map((b) => {
      const next = mapOrClear(b.nextStepId);
      return { ...b, nextStepId: next };
    });
  }
  if (type === "round_robin" && Array.isArray(cfg.options)) {
    cfg.options = (cfg.options as Record<string, unknown>[]).map((o) => {
      const next = mapOrClear(o.nextStepId);
      return { ...o, nextStepId: next };
    });
  }

  return cfg;
}

export type UseFlowClipboardArgs = {
  /** IDs dos steps selecionados (sem trigger / addStep). */
  getSelectedStepIds: () => string[];
  getSteps: () => AutomationStep[];
  onStepsChange: (steps: AutomationStep[]) => void;
  removeSteps: (ids: string[]) => void;
  enabled?: boolean;
};

/**
 * Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D e Delete/Backspace no canvas.
 * Clipboard interno (não usa navigator.clipboard — evita permissões e HTML).
 */
export function useFlowClipboard({
  getSelectedStepIds,
  getSteps,
  onStepsChange,
  removeSteps,
  enabled = true,
}: UseFlowClipboardArgs) {
  const clipRef = useRef<ClipboardPayload | null>(null);

  const copySelection = useCallback(() => {
    const ids = new Set(getSelectedStepIds());
    if (ids.size === 0) return false;
    const steps = getSteps().filter((s) => ids.has(s.id));
    if (steps.length === 0) return false;
    // Deep clone configs
    clipRef.current = {
      steps: steps.map((s) => ({
        id: s.id,
        type: s.type,
        config: structuredClone(s.config) as Record<string, unknown>,
      })),
    };
    return true;
  }, [getSelectedStepIds, getSteps]);

  const pasteClipboard = useCallback(() => {
    const payload = clipRef.current;
    if (!payload?.steps.length) return false;

    const idMap = new Map<string, string>();
    for (const s of payload.steps) {
      idMap.set(s.id, newStepId());
    }

    const clones: AutomationStep[] = payload.steps.map((s) => {
      const cfg = remapStepConfig(
        { ...(s.config as Record<string, unknown>) },
        idMap,
        s.type
      );
      const pos = readRfPos(s.config);
      cfg.__rfPos = {
        x: (pos?.x ?? 200) + PASTE_OFFSET.x,
        y: (pos?.y ?? 300) + PASTE_OFFSET.y,
      };
      cfg.__hasExplicitEdges = true;
      return {
        id: idMap.get(s.id)!,
        type: s.type,
        config: cfg,
      };
    });

    onStepsChange([...getSteps(), ...clones]);
    return true;
  }, [getSteps, onStepsChange]);

  const duplicateSelection = useCallback(() => {
    if (!copySelection()) return false;
    return pasteClipboard();
  }, [copySelection, pasteClipboard]);

  const deleteSelection = useCallback(() => {
    const ids = getSelectedStepIds();
    if (ids.length === 0) return false;
    removeSteps(ids);
    return true;
  }, [getSelectedStepIds, removeSteps]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "c") {
        if (copySelection()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (mod && key === "v") {
        if (pasteClipboard()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (mod && key === "d") {
        if (duplicateSelection()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (key === "delete" || key === "backspace") {
        if (deleteSelection()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, copySelection, pasteClipboard, duplicateSelection, deleteSelection]);

  return {
    copySelection,
    pasteClipboard,
    duplicateSelection,
    deleteSelection,
  };
}
