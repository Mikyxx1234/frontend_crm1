"use client";

/*
 * Hook para popovers que precisam escapar de stacking contexts
 * aninhados (ex.: cada Draggable do @hello-pangea/dnd cria um
 * stacking context próprio com transform; popovers absolutos
 * dentro dele ficam atrás de cards seguintes mesmo com z-9999).
 *
 * Solução: renderizar via createPortal em document.body com
 * position: fixed e coordenadas calculadas do trigger.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface PortalPopoverState {
  open: boolean;
  rect: DOMRect | null;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
}

export function usePortalPopover(): PortalPopoverState {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Atualiza posicao quando abre e reage a scroll/resize.
  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      if (triggerRef.current) {
        setRect(triggerRef.current.getBoundingClientRect());
      }
    }
    updatePosition();
    // capture:true para pegar scroll de containers internos (kanban col).
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Click-outside: ignora cliques no trigger OU no popover (ambos
  // sao agora "donos" do popover, em DOMs diferentes via portal).
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(t) &&
        popoverRef.current &&
        !popoverRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return { open, rect, triggerRef, popoverRef, toggle, close };
}

/**
 * Calcula posicao do popover a partir do rect do trigger.
 * Faz auto-flip se ultrapassa o bottom do viewport.
 */
export function computePopoverPosition(
  rect: DOMRect | null,
  popoverHeight = 280,
): { top: number; left: number } {
  if (!rect) return { top: 0, left: 0 };
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const spaceBelow = viewportH - rect.bottom;
  const flipUp = spaceBelow < popoverHeight && rect.top > popoverHeight;
  const top = flipUp ? rect.top - popoverHeight - 4 : rect.bottom + 4;
  return { top, left: rect.left };
}
