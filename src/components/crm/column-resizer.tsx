"use client";

/**
 * Handle vertical fino que permite redimensionar uma coluna por arrasto
 * horizontal. Use posicionando como filho direto de um container com
 * `position: relative` — ele se ancora em `right: -3px`.
 *
 * Persistência:
 *  - Quando `storageKey` é fornecido, salva o valor em localStorage.
 *
 * Comportamento:
 *  - Pointer events (touch + mouse + pen).
 *  - Aplica `body.style.cursor` e `user-select: none` durante o arrasto.
 *  - Respeita `min` / `max`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ColumnResizerProps {
  /** Largura atual em px (controlada pelo pai). */
  value: number;
  /** Callback chamado a cada movimento (frame-throttled pelo browser). */
  onChange: (px: number) => void;
  /** Largura mínima permitida. Default 240. */
  min?: number;
  /** Largura máxima permitida. Default 520. */
  max?: number;
  /**
   * "right" (padrão): alça ancora à direita do container — para colunas esquerdas.
   * "left": alça ancora à esquerda e inverte o delta — para colunas direitas.
   */
  direction?: "right" | "left";
  className?: string;
}

export function ColumnResizer({
  value,
  onChange,
  min = 240,
  max = 520,
  direction = "right",
  className,
}: ColumnResizerProps) {
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startXRef.current = e.clientX;
      startValueRef.current = value;
      setDragging(true);
    },
    [value],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const raw = e.clientX - startXRef.current;
      // Para coluna direita: arrastar para a ESQUERDA (delta negativo) aumenta a largura.
      const delta = direction === "left" ? -raw : raw;
      const next = Math.min(max, Math.max(min, startValueRef.current + delta));
      onChange(next);
    };
    const onUp = () => setDragging(false);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, direction, min, max, onChange]);

  return (
    <button
      type="button"
      aria-label="Redimensionar coluna"
      onPointerDown={onPointerDown}
      className={cn(
        "group absolute top-0 z-20 flex h-full w-3 cursor-col-resize items-center justify-center",
        direction === "left" ? "-left-[6px]" : "-right-[6px]",
        className,
      )}
    >
      <span
        className={cn(
          "h-12 w-[3px] rounded-full bg-[var(--glass-border)] opacity-0 transition-all group-hover:opacity-100",
          dragging && "bg-[var(--brand-primary)] opacity-100",
        )}
      />
    </button>
  );
}

/**
 * Hook que mantém a largura em state + persiste em localStorage.
 * Retorna [value, setValue] com leitura SSR-safe (default no primeiro
 * render, lê do storage no useEffect — evita hidratação inconsistente).
 */
export function usePersistentWidth(
  storageKey: string,
  defaultValue: number,
): [number, (v: number) => void] {
  const [v, setV] = useState(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) setV(n);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const setAndSave = useCallback(
    (next: number) => {
      setV(next);
      try {
        window.localStorage.setItem(storageKey, String(Math.round(next)));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  return [v, setAndSave];
}
