"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollMapVerticalProps {
  /** Container do kanban (as colunas são filhas dele). */
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** Muda quando as colunas trocam — força re-subscribe dos listeners. */
  columnCount: number;
  className?: string;
}

/**
 * ScrollMapVertical — navegador vertical do kanban.
 *
 * O scroll do kanban é POR COLUNA (`.kanban-scroll`), não por um único
 * container. Este mapa agrega o scroll de todas as colunas e apresenta
 * um único indicador deslizante:
 *
 *   - posição do thumb = média de `scrollTop / maxScroll` entre colunas
 *     que têm overflow;
 *   - altura do thumb = média de `clientHeight / scrollHeight` (aproxima
 *     a "visibilidade" agregada).
 *
 * Arrastar o thumb rola todas as colunas proporcionalmente. Clicar num
 * ponto do track leva todas ao mesmo percentual.
 *
 * Colunas sem overflow são ignoradas nos cálculos e no scroll — não
 * distorcem a média nem "estacionam" no topo à toa.
 */
export function ScrollMapVertical({
  boardRef,
  columnCount,
  className,
}: ScrollMapVerticalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ y: 0, startPct: 0 });

  const [indicator, setIndicator] = useState({ top: 0, height: 100 });
  const [visible, setVisible] = useState(false);

  const getCols = useCallback(() => {
    const el = boardRef.current;
    if (!el) return [] as HTMLElement[];
    return Array.from(el.querySelectorAll<HTMLElement>(".kanban-scroll"));
  }, [boardRef]);

  const recalc = useCallback(() => {
    const cols = getCols();
    if (cols.length === 0) {
      setVisible(false);
      return;
    }
    let sumPos = 0;
    let sumRatio = 0;
    let n = 0;
    for (const el of cols) {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 1) continue; // sem overflow — ignora
      sumPos += el.scrollTop / max;
      sumRatio += el.clientHeight / el.scrollHeight;
      n++;
    }
    if (n === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const posPct = sumPos / n;
    const ratio = Math.min(0.95, Math.max(0.08, sumRatio / n));
    setIndicator({
      top: posPct * (1 - ratio) * 100,
      height: ratio * 100,
    });
  }, [getCols]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const raf = requestAnimationFrame(recalc);

    let cols = getCols();
    const onScroll = () => recalc();
    cols.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true }));

    const ro = new ResizeObserver(recalc);
    ro.observe(board);
    cols.forEach((el) => ro.observe(el));

    // Colunas podem entrar/sair (troca de funil, filtros, drag). Ao mudar
    // o DOM, re-registra listeners e recalcula.
    const mo = new MutationObserver(() => {
      cols.forEach((el) => el.removeEventListener("scroll", onScroll));
      cols = getCols();
      cols.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true }));
      cols.forEach((el) => ro.observe(el));
      recalc();
    });
    mo.observe(board, { childList: true, subtree: true });

    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(raf);
      cols.forEach((el) => el.removeEventListener("scroll", onScroll));
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [boardRef, getCols, recalc, columnCount]);

  const scrollAllToPct = useCallback(
    (pct: number) => {
      const clamped = Math.max(0, Math.min(1, pct));
      for (const el of getCols()) {
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 1) continue;
        el.scrollTop = clamped * max;
      }
    },
    [getCols],
  );

  const jumpToClientY = useCallback(
    (clientY: number) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      // Centraliza o thumb no ponto tocado/clicado.
      const thumbFrac = indicator.height / 100;
      const localY = clientY - rect.top;
      const denom = 1 - thumbFrac;
      const pct = denom > 0 ? (localY / rect.height - thumbFrac / 2) / denom : 0;
      scrollAllToPct(pct);
    },
    [indicator.height, scrollAllToPct],
  );

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Só o trilho vazio — o thumb chama stopPropagation no próprio handler.
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      jumpToClientY(e.clientY);
    },
    [jumpToClientY],
  );

  // Pointer events cobrem mouse + toque (mobile). Só mousemove falhava no APK.
  const onIndicatorPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      isDragging.current = true;
      const trackSpan = Math.max(1, 100 - indicator.height);
      dragStart.current = {
        y: e.clientY,
        startPct: indicator.top / trackSpan,
      };

      const trackH = wrapper.clientHeight;
      const usableH = trackH * (1 - indicator.height / 100);
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture?.(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!isDragging.current) return;
        const dy = ev.clientY - dragStart.current.y;
        const delta = usableH > 0 ? dy / usableH : 0;
        scrollAllToPct(dragStart.current.startPct + delta);
      };
      const onUp = () => {
        isDragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [indicator.top, indicator.height, scrollAllToPct],
  );

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute right-2 top-1/2 z-20 flex -translate-y-1/2 justify-end sm:right-3",
        className,
      )}
    >
      {/* Trilho curto — no mobile fica sempre legível (sem depender de hover). */}
      <div
        ref={wrapperRef}
        data-track="1"
        onPointerDown={onTrackPointerDown}
        className={cn(
          "group/scrollmap-v pointer-events-auto relative w-[44px] cursor-pointer select-none touch-none rounded-md",
          "opacity-55 transition-opacity duration-200 ease-out hover:opacity-100 md:opacity-35",
        )}
        style={{ height: "min(160px, 45vh)", background: "rgba(91,111,245,0.12)" }}
      >
        <div
          onPointerDown={onIndicatorPointerDown}
          className="absolute inset-x-0 cursor-grab touch-none rounded-md transition-[top,height] duration-75 ease-linear active:cursor-grabbing"
          style={{
            top: `${indicator.top}%`,
            height: `max(28px, ${indicator.height}%)`,
            background: "rgba(91,111,245,0.45)",
          }}
        />
      </div>
    </div>
  );
}
