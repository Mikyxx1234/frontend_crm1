"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollMapProps {
  boardRef: React.RefObject<HTMLDivElement | null>;
  columnCount: number;
  className?: string;
}

/**
 * ScrollMap — navegador horizontal estilo Kommo.
 *
 * Um segmento por coluna. Indicador deslizante mostra a área visível.
 * Clique num segmento navega para a coluna. Arrastar o indicador faz
 * scroll proporcional.
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

  const onSegmentClick = useCallback(
    (index: number) => {
      const el = boardRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: (index / Math.max(1, columnCount - 1)) * maxScroll, behavior: "smooth" });
    },
    [boardRef, columnCount],
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

  const segments = Math.max(1, columnCount);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-3 left-0 right-3 z-20",
        "flex items-end justify-end",
        className,
      )}
    >
      <div
        ref={wrapperRef}
        className={cn(
          "group/scrollmap pointer-events-auto relative flex select-none items-stretch gap-1",
          // Transparente em repouso, totalmente visível ao passar o mouse
          "opacity-35 transition-opacity duration-200 ease-out hover:opacity-100",
        )}
        style={{
          height: "44px",
          /* Largura mais compacta — ~34px por segmento, limitada à largura útil */
          width: `min(${segments * 34}px, calc(100vw - 140px))`,
        }}
      >
        {/* Segmentos — um por coluna */}
        {Array.from({ length: segments }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para coluna ${i + 1}`}
            onClick={() => onSegmentClick(i)}
            className="h-full flex-1 cursor-pointer rounded-md transition-colors duration-150 hover:opacity-80"
            style={{ background: "rgba(91,111,245,0.12)" }}
          />
        ))}

        {/* Indicador de posição deslizante */}
        <div
          onMouseDown={onIndicatorMouseDown}
          className="absolute inset-y-0 cursor-grab rounded-md transition-[left,width] duration-75 ease-linear active:cursor-grabbing"
          style={{
            left: `${indicator.left}%`,
            width: `${indicator.width}%`,
            background: "rgba(91,111,245,0.45)",
          }}
        />
      </div>
    </div>
  );
}
