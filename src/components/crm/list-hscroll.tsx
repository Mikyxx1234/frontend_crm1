"use client";

/**
 * Área de lista com scroll X+Y e affordance clara de overflow horizontal:
 *  - scrollbar mais visível (classe `.list-hscroll`)
 *  - fades nas bordas quando há conteúdo fora da viewport
 *  - chip “mais colunas” enquanto ainda dá pra rolar à direita
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

type ListHScrollProps = {
  children: React.ReactNode;
  className?: string;
  /** Classes do container rolável interno. */
  scrollerClassName?: string;
};

export function ListHScroll({
  children,
  className,
  scrollerClassName,
}: ListHScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanLeft(scrollLeft > 2);
    setCanRight(max > 2 && scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Conteúdo interno muda largura (colunas ligadas/desligadas).
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function nudge(dir: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(280, el.clientWidth * 0.55), behavior: "smooth" });
  }

  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1", className)}>
      <div
        ref={ref}
        className={cn(
          "list-hscroll scrollbar-thin min-h-0 h-full overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
          scrollerClassName,
        )}
      >
        {children}
      </div>

      {/* Fades — sinalizam que há mais conteúdo fora da área */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--bg-base,#dde8f5)] via-[color-mix(in_srgb,var(--bg-base,#dde8f5)_70%,transparent)] to-transparent transition-opacity duration-200",
          canLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--bg-base,#dde8f5)] via-[color-mix(in_srgb,var(--bg-base,#dde8f5)_70%,transparent)] to-transparent transition-opacity duration-200",
          canRight ? "opacity-100" : "opacity-0",
        )}
      />

      {canLeft && (
        <button
          type="button"
          aria-label="Rolar colunas para a esquerda"
          onClick={() => nudge(-1)}
          className="absolute left-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-transform hover:scale-105"
        >
          <IconChevronLeft size={16} stroke={2.4} />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Rolar colunas para a direita"
          onClick={() => nudge(1)}
          className="absolute right-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-transform hover:scale-105"
        >
          <IconChevronRight size={16} stroke={2.4} />
        </button>
      )}

      {canRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-2.5 right-12 z-20 inline-flex items-center gap-1 rounded-full border border-[var(--brand-primary)]/25 bg-[var(--color-primary-soft)] px-2.5 py-1 font-display text-[10.5px] font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
        >
          Mais colunas
          <IconChevronRight size={12} stroke={2.6} />
        </div>
      )}
    </div>
  );
}
