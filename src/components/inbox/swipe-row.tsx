"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SwipeAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Cor de fundo Tailwind (ex.: "bg-emerald-500"). */
  bg: string;
  onTrigger: () => void | Promise<void>;
};

const TRIGGER_THRESHOLD = 64; // px — quanto dragar antes de revelar
const COMMIT_THRESHOLD = 100; // px — drag total que dispara automaticamente
const MAX_DRAG = 160; // px — limite máximo do swipe revelado

/**
 * Wrapper de linha com swipe-to-reveal-actions estilo iMessage/WhatsApp.
 *
 * - Funciona apenas em viewport mobile/touch (md:hidden por convenção do
 *   chamador). Em desktop o container ignora o pointer events do drag.
 * - Drag horizontal pra esquerda revela `rightActions` por baixo.
 * - Soltar com translate > COMMIT_THRESHOLD dispara a primeira ação
 *   automaticamente (gesto rápido). Caso contrário, a linha fica aberta
 *   e o usuário tap nas pílulas.
 * - Tap em qualquer lugar fora fecha (clique no próprio item também).
 *
 * Implementação simples sem libs: pointermove + translate3d.
 */
export function SwipeRow({
  children,
  rightActions,
  className,
  disabled,
}: {
  children: React.ReactNode;
  rightActions: SwipeAction[];
  className?: string;
  disabled?: boolean;
}) {
  const [drag, setDrag] = React.useState(0); // negativo = esquerda
  const [animating, setAnimating] = React.useState(false);
  const startX = React.useRef<number | null>(null);
  const startY = React.useRef<number | null>(null);
  const dragging = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const close = React.useCallback(() => {
    setAnimating(true);
    setDrag(0);
    setTimeout(() => setAnimating(false), 180);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    if (e.pointerType === "mouse") return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    dragging.current = false;
    setAnimating(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!dragging.current) {
      // Detecta intent horizontal vs vertical (scroll). Threshold curto.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Scroll vertical — desliga drag horizontal pra esse gesto.
        startX.current = null;
        startY.current = null;
        return;
      }
      dragging.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    }
    if (dx >= 0) {
      // Swipe direita — não fazemos nada por enquanto (pode ser um snap-back).
      setDrag(0);
      return;
    }
    const next = Math.max(-MAX_DRAG, dx);
    setDrag(next);
  };

  const onPointerUp = async () => {
    const wasDragging = dragging.current;
    const finalDrag = drag;
    dragging.current = false;
    startX.current = null;
    startY.current = null;
    if (!wasDragging) return;

    if (finalDrag <= -COMMIT_THRESHOLD) {
      // Auto-trigger da primeira ação (a mais "destrutiva"/comum à direita).
      const action = rightActions[0];
      if (action) {
        setAnimating(true);
        setDrag(-MAX_DRAG);
        await Promise.resolve(action.onTrigger());
        close();
      }
    } else if (finalDrag <= -TRIGGER_THRESHOLD) {
      // Snapa pra revelar e deixa o usuário escolher.
      setAnimating(true);
      setDrag(-Math.min(MAX_DRAG, rightActions.length * 72));
    } else {
      close();
    }
  };

  // Fecha se o usuário tocar fora.
  React.useEffect(() => {
    if (drag === 0) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [drag, close]);

  const revealedWidth = Math.abs(drag);

  return (
    <div
      ref={containerRef}
      className={cn("relative isolate overflow-hidden", className)}
    >
      {/* Camada de actions atrás. Fica colada na direita; cresce em
          largura conforme o foreground se desloca pra esquerda. */}
      {rightActions.length > 0 && (
        <div
          className="absolute inset-y-0 right-0 flex"
          style={{ width: `${revealedWidth}px` }}
          aria-hidden={drag === 0}
        >
          {rightActions.map((a, idx) => {
            const isPrimary = idx === 0;
            return (
              <button
                key={a.key}
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await Promise.resolve(a.onTrigger());
                  close();
                }}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-white",
                  a.bg,
                  // Em swipe parcial, só mostra a primeira (resto fica clipado).
                  isPrimary ? "opacity-100" : "opacity-90",
                )}
                aria-label={a.label}
              >
                <span className="size-5">{a.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Foreground deslizante. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "relative bg-inherit touch-pan-y",
          animating && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translate3d(${drag}px, 0, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}
