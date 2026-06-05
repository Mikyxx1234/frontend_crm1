"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollMapProps {
  /** ref do elemento com overflow-x: scroll (o kanban-board-hscroll) */
  boardRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

/**
 * ScrollMap — barra de navegação horizontal minimalista.
 * Fica fixada no canto inferior direito (sobre o board), substituindo a
 * scrollbar nativa que foi escondida via CSS.
 * Largura proporcional ao viewport / scrollWidth do board.
 */
export function ScrollMap({ boardRef, className }: ScrollMapProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbPct, setThumbPct] = useState({ left: 0, width: 1 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const recalc = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth <= clientWidth) {
      setThumbPct({ left: 0, width: 1 });
      return;
    }
    const ratio = clientWidth / scrollWidth;
    const leftRatio = scrollLeft / (scrollWidth - clientWidth);
    setThumbPct({ left: leftRatio * (1 - ratio), width: ratio });
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

  // Arrasto do thumb
  const onThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const el = boardRef.current;
      if (!el) return;
      dragging.current = true;
      dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const track = trackRef.current;
        if (!track || !boardRef.current) return;
        const trackW = track.clientWidth;
        const scrollRange = boardRef.current.scrollWidth - boardRef.current.clientWidth;
        const dx = ev.clientX - dragStart.current.x;
        const ratio = dx / (trackW * (1 - thumbPct.width));
        boardRef.current.scrollLeft = Math.max(
          0,
          Math.min(scrollRange, dragStart.current.scrollLeft + ratio * scrollRange),
        );
      };
      const onUp = () => { dragging.current = false; };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp, { once: true });
    },
    [boardRef, thumbPct.width],
  );

  // Clique no track (fora do thumb) — scroll até aquele ponto
  const onTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const track = trackRef.current;
      const el = boardRef.current;
      if (!track || !el) return;
      const rect = track.getBoundingClientRect();
      const clickRatio = (e.clientX - rect.left) / rect.width;
      const scrollRange = el.scrollWidth - el.clientWidth;
      el.scrollLeft = clickRatio * scrollRange;
    },
    [boardRef],
  );

  // Não renderiza se não há overflow horizontal
  if (thumbPct.width >= 0.99) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-2 right-3 z-20",
        "flex items-center",
        className,
      )}
      aria-hidden="true"
    >
      {/* Track */}
      <div
        ref={trackRef}
        onClick={onTrackClick}
        className="pointer-events-auto relative h-[5px] w-[180px] cursor-pointer overflow-hidden rounded-full"
        style={{ background: "rgba(91,111,245,0.12)" }}
      >
        {/* Thumb */}
        <div
          onMouseDown={onThumbMouseDown}
          className="absolute inset-y-0 cursor-grab rounded-full transition-[width,left] duration-75 active:cursor-grabbing"
          style={{
            left: `${thumbPct.left * 100}%`,
            width: `${thumbPct.width * 100}%`,
            background: "rgba(91,111,245,0.55)",
          }}
        />
      </div>
    </div>
  );
}
