"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseResizablePanelOptions {
  /** Largura inicial em px (também usada como fallback se o localStorage falhar). */
  defaultWidth: number;
  /** Largura mínima permitida em px. */
  min: number;
  /** Largura máxima permitida em px. */
  max: number;
  /** Chave única do localStorage; se omitida, a largura não persiste. */
  storageKey?: string;
  /**
   * Direção em que o handle "cresce":
   * - "right": handle no lado direito do painel (painel cresce arrastando pra direita). Default.
   * - "left": handle no lado esquerdo do painel (painel cresce arrastando pra esquerda).
   *   Útil para painéis ancorados na borda direita (ex.: sidebar CRM).
   */
  direction?: "right" | "left";
}

/**
 * Hook genérico de painel redimensionável horizontalmente. Não renderiza UI —
 * apenas gerencia a largura e expõe o handler `startResize` que deve ser
 * ligado ao `onPointerDown` de um divisor (ex.: `<div className="cursor-col-resize" />`).
 *
 * Uso típico em layouts flex:
 *
 *   const { width, startResize } = useResizablePanel({
 *     defaultWidth: 300, min: 240, max: 500, storageKey: "inbox-conv-list-width",
 *   });
 *   <div style={{ "--cl-w": `${width}px` }} className="md:w-[var(--cl-w)] md:basis-[var(--cl-w)]" />
 *   <div onPointerDown={startResize} className="w-1 cursor-col-resize" />
 *
 * Pointer Events (cobre mouse + touch + caneta). Durante o drag, `body.style.cursor`
 * vira `col-resize` global pra não "trocar" se o ponteiro sair do handle.
 */
export function useResizablePanel({
  defaultWidth,
  min,
  max,
  storageKey,
  direction = "right",
}: UseResizablePanelOptions) {
  const [width, setWidth] = useState(defaultWidth);
  // Ref pra ler o valor mais recente dentro do handler de unmount sem
  // depender de closures (que capturariam o valor inicial).
  const widthRef = useRef(defaultWidth);
  widthRef.current = width;

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const n = parseInt(stored, 10);
        if (Number.isFinite(n)) {
          setWidth(Math.max(min, Math.min(max, n)));
        }
      }
    } catch {
      // localStorage bloqueado (private mode) — mantém default.
    }
  }, [storageKey, min, max]);

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;
      const sign = direction === "right" ? 1 : -1;

      const onMove = (ev: PointerEvent) => {
        const delta = sign * (ev.clientX - startX);
        const next = Math.max(min, Math.min(max, startWidth + delta));
        setWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, String(widthRef.current));
          } catch {
            /* ignore */
          }
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [direction, min, max, storageKey],
  );

  return { width, startResize };
}
