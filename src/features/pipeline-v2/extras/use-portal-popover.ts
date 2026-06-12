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
  // Usa capture:true para interceptar ANTES dos handlers do Radix, evitando
  // que a camada de bloqueio de pointer-events do DropdownMenu (modal=true)
  // seja interpretada como "clique fora".
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;

      // Ignora elementos que foram removidos do DOM antes deste handler
      // rodar (ex: Radix fecha seu portal antes do mousedown borbulhar).
      if (!document.contains(t)) return;

      // Resolve o Element mais próximo — e.target pode ser um Text node
      // quando o usuário clica no texto de um item (ex: opção de dropdown
      // Radix). Sem isso, instanceof Element falha e o guard abaixo nunca
      // roda, causando o fechamento indevido do popover.
      const el: Element | null =
        t instanceof Element ? t : (t as Node).parentElement;

      // Ignora cliques dentro de QUALQUER portal do Radix (DropdownMenu,
      // Select, Tooltip, Popover…). O atributo data-radix-portal está
      // presente em todos os containers de portal do Radix, cobrindo
      // também casos onde a camada de bloqueio (modal=true) intercepta
      // o evento antes dos elementos reais.
      if (el) {
        if (
          el.closest("[data-radix-portal]") ||
          el.closest("[data-radix-popper-content-wrapper]") ||
          el.closest("[data-radix-select-viewport]") ||
          el.closest("[data-radix-dropdown-menu-content]") ||
          el.closest("[role='listbox']") ||
          el.closest("[role='menu']")
        ) {
          return;
        }
      }

      if (
        triggerRef.current &&
        !triggerRef.current.contains(t) &&
        popoverRef.current &&
        !popoverRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    // capture:true garante que este handler roda ANTES dos listeners do Radix,
    // permitindo verificar o alvo original antes de qualquer re-montagem do DOM.
    document.addEventListener("mousedown", onClickOutside, true);
    return () => document.removeEventListener("mousedown", onClickOutside, true);
  }, [open]);

  return { open, rect, triggerRef, popoverRef, toggle, close };
}

/**
 * Calcula posicao do popover a partir do rect do trigger.
 * - Auto-flip vertical se ultrapassa o bottom do viewport.
 * - Clamp horizontal: quando o popover (largura `popoverWidth`)
 *   ultrapassaria a borda direita da viewport, alinha pela DIREITA do
 *   trigger (ou encosta na margem), evitando "vazar" a tela — caso
 *   comum quando o trigger fica na sidebar direita.
 */
export function computePopoverPosition(
  rect: DOMRect | null,
  popoverHeight = 280,
  popoverWidth = 256,
  margin = 8,
): { top: number; left: number } {
  if (!rect) return { top: 0, left: 0 };
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;

  const spaceBelow = viewportH - rect.bottom;
  const flipUp = spaceBelow < popoverHeight && rect.top > popoverHeight;
  const top = flipUp ? rect.top - popoverHeight - 4 : rect.bottom + 4;

  // Horizontal: tenta alinhar pela esquerda do trigger. Se estourar a
  // direita, alinha o popover pela direita do trigger; por fim, faz
  // clamp para nunca passar das margens da viewport.
  let left = rect.left;
  if (left + popoverWidth + margin > viewportW) {
    left = rect.right - popoverWidth;
  }
  left = Math.max(margin, Math.min(left, viewportW - popoverWidth - margin));

  return { top, left };
}
