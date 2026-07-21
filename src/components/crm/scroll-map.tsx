"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollMapProps {
  boardRef: React.RefObject<HTMLDivElement | null>;
  columnCount: number;
  className?: string;
}

/**
 * ScrollMap — scrollbar horizontal custom, fina e compacta.
 *
 * Trilha discreta com thumb proporcional à área visível. Clique na
 * trilha salta para a posição; arrastar o thumb faz scroll proporcional.
 */
export function ScrollMap({ boardRef, columnCount, className }: ScrollMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

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
    const leftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (1 - ratio) * 100 : 0;
    setIndicator({ left: leftPct, width: ratio * 100 });
  }, [boardRef]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    // Mede após o layout (rAF) — garante scrollWidth correto mesmo
    // quando as colunas acabaram de ser inseridas/trocadas.
    const raf = requestAnimationFrame(recalc);
    el.addEventListener("scroll", recalc, { passive: true });
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    // Observa também os filhos diretos (colunas) para reagir a inserções
    for (const child of Array.from(el.children)) ro.observe(child);
    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
      ro.disconnect();
    };
    // columnCount nas deps: re-subscreve e re-mede quando o nº de colunas muda
  }, [boardRef, recalc, columnCount]);

  const onTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const el = boardRef.current;
      const track = wrapperRef.current;
      if (!el || !track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: ratio * maxScroll, behavior: "smooth" });
    },
    [boardRef],
  );

  const onIndicatorMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = boardRef.current;
      if (!el) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current || !boardRef.current || !wrapperRef.current) return;
        const ww = wrapperRef.current.clientWidth;
        const maxScroll = boardRef.current.scrollWidth - boardRef.current.clientWidth;
        const trackW = ww * (1 - indicator.width / 100);
        const dx = ev.clientX - dragStart.current.x;
        const delta = trackW > 0 ? (dx / trackW) * maxScroll : 0;
        boardRef.current.scrollLeft = Math.max(0, Math.min(maxScroll, dragStart.current.scrollLeft + delta));
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

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2",
        "flex justify-center",
        className,
      )}
    >
      {/* Trilha fina, largura compacta e responsiva */}
      <div
        ref={wrapperRef}
        onClick={onTrackClick}
        className={cn(
          "group/scrollmap pointer-events-auto relative cursor-pointer select-none rounded-full",
          "opacity-40 transition-opacity duration-200 ease-out hover:opacity-100",
        )}
        style={{
          height: "6px",
          width: "min(280px, calc(100vw - 160px))",
          background: "rgba(91,111,245,0.14)",
        }}
      >
        {/* Thumb — reflete a área visível e é arrastável */}
        <div
          onMouseDown={onIndicatorMouseDown}
          className="absolute inset-y-0 cursor-grab rounded-full transition-[left,width] duration-75 ease-linear group-hover/scrollmap:h-2 group-hover/scrollmap:-top-px active:cursor-grabbing"
          style={{
            left: `${indicator.left}%`,
            width: `max(28px, ${indicator.width}%)`,
            background: "rgba(91,111,245,0.6)",
          }}
        />
      </div>
    </div>
  );
}
