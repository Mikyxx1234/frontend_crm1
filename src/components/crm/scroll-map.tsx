"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollMapProps {
  /** ref do elemento com overflow-x: scroll (o kanban-board-hscroll) */
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** Número de colunas no board — define quantos segmentos aparecem */
  columnCount: number;
  className?: string;
}

/**
 * ScrollMap — navegador horizontal estilo Kommo.
 *
 * Mostra um item por coluna do board. Um indicador ("screen-position")
 * desliza sobre eles refletindo a área visível atual. O usuário pode
 * arrastar o indicador ou clicar em qualquer segmento para navegar.
 */
export function ScrollMap({ boardRef, columnCount, className }: ScrollMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  // left e width do indicador em % relativo ao wrapper
  const [indicator, setIndicator] = useState({ left: 0, width: 100 });
  const [visible, setVisible] = useState(false);

  const recalc = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth + 2;
    setVisible(hasOverflow);
    if (!hasOverflow) return;
    const ratio = clientWidth / scrollWidth;
    const maxScroll = scrollWidth - clientWidth;
    const leftRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    setIndicator({
      left: leftRatio * (1 - ratio) * 100,
      width: ratio * 100,
    });
  }, [boardRef]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    recalc();
    el.addEventListener("scroll", recalc, { passive: true });
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", recalc);
      ro.disconnect();
    };
  }, [boardRef, recalc]);

  // Clique num segmento — scroll proporcional
  const onSegmentClick = useCallback(
    (index: number) => {
      const el = boardRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft = (index / Math.max(1, columnCount - 1)) * maxScroll;
    },
    [boardRef, columnCount],
  );

  // Arrasto do indicador
  const onIndicatorMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = boardRef.current;
      if (!el) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const wrapper = wrapperRef.current;
        if (!wrapper || !boardRef.current) return;
        const wrapperW = wrapper.clientWidth;
        const maxScroll = boardRef.current.scrollWidth - boardRef.current.clientWidth;
        const indicatorW = (indicator.width / 100) * wrapperW;
        const trackW = wrapperW - indicatorW;
        const dx = ev.clientX - dragStart.current.x;
        const scrollDelta = trackW > 0 ? (dx / trackW) * maxScroll : 0;
        boardRef.current.scrollLeft = Math.max(
          0,
          Math.min(maxScroll, dragStart.current.scrollLeft + scrollDelta),
        );
      };

      const onUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", onMove);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp, { once: true });
    },
    [boardRef, indicator.width],
  );

  if (!visible) return null;

  const segments = Math.max(1, columnCount);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-2 right-3 z-20",
        "flex items-center",
        className,
      )}
    >
      {/* Wrapper dos segmentos — tamanho proporcional ao número de colunas */}
      <div
        ref={wrapperRef}
        className="pointer-events-auto relative flex h-[8px] select-none items-stretch gap-[2px]"
        style={{ width: Math.min(segments * 28, 320) + "px" }}
      >
        {/* Um segmento por coluna */}
        {Array.from({ length: segments }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para coluna ${i + 1}`}
            onClick={() => onSegmentClick(i)}
            className="h-full flex-1 cursor-pointer rounded-[2px] transition-colors duration-150"
            style={{ background: "rgba(91,111,245,0.14)" }}
          />
        ))}

        {/* Indicador de posição ("screen-position") — desliza sobre os segmentos */}
        <div
          onMouseDown={onIndicatorMouseDown}
          className={cn(
            "absolute inset-y-0 cursor-grab rounded-[2px]",
            "active:cursor-grabbing",
            "transition-[left,width] duration-75 ease-linear",
          )}
          style={{
            left: `${indicator.left}%`,
            width: `${indicator.width}%`,
            background: "rgba(91,111,245,0.55)",
          }}
        />
      </div>
    </div>
  );
}
