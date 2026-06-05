/**
 * Dropdown de filtros avancados ancorado em um elemento (ex.: input "Buscar").
 *
 * UX: usuario foca/clica no input -> dropdown abre logo abaixo com todos
 * os criterios. Mantem o mesmo `FilterPanelBody` que o Sheet usa.
 *
 * Fecha ao clicar fora ou ESC. Click no proprio anchor nao fecha (deixa
 * o usuario digitar e abrir o painel ao mesmo tempo).
 *
 * RENDER: via `createPortal` em `document.body` — escapa de qualquer
 * stacking context / `backdrop-filter` / overflow do pai que estava
 * deixando o popover translúcido. Posição calculada a partir do
 * `getBoundingClientRect()` do anchor + reposiciona em scroll/resize.
 */

"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { FilterPanelBody } from "./filter-panel-body";
import type { AdvancedDealFilters, FilterOptionsResponse } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ref ao elemento que ancora o dropdown (input ou botao). */
  anchorRef: React.RefObject<HTMLElement | null>;
  value: AdvancedDealFilters;
  options: FilterOptionsResponse | null;
  optionsLoading: boolean;
  optionsError?: string | null;
  onApply: (next: AdvancedDealFilters) => void;
  onClear: () => void;
  onRequestSave?: (current: AdvancedDealFilters) => void;
  /** Largura do dropdown. Default: 780px. */
  width?: number;
  /** Altura maxima do dropdown. Default: 80vh / 680px. */
  maxHeight?: string;
  className?: string;
};

export function FilterDropdown({
  open,
  onOpenChange,
  anchorRef,
  value,
  options,
  optionsLoading,
  optionsError,
  onApply,
  onClear,
  onRequestSave,
  width = 780,
  maxHeight = "min(80vh, 680px)",
  className,
}: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    maxW: number;
    maxH: number;
  } | null>(null);
  const [isDark, setIsDark] = React.useState(false);

  // Detecta dark mode pelo `.dark` no <html> (next-themes attribute=class).
  // Inline style precisa do valor literal pq `var(--dropdown-solid-bg)`
  // pode falhar dependendo de onde o portal é montado.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Posiciona o dropdown clampado ao viewport.
  // Horizontal: prefere alinhar à esquerda do anchor, mas se ultrapassar
  // a borda direita recua; se ainda assim não couber, alinha à borda esquerda
  // com padding de segurança de 8px.
  // Vertical: prefere abaixo do anchor; se não houver espaço suficiente
  // abre acima. maxH calculado para nunca ultrapassar o rodapé do viewport.
  React.useEffect(() => {
    if (!open) return;
    const MARGIN = 8; // px de folga nas bordas

    function compute() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // --- largura real ---
      const maxW = Math.min(width, vw - MARGIN * 2);

      // --- horizontal ---
      let left = rect.left;
      if (left + maxW > vw - MARGIN) {
        // tenta alinhar à direita do anchor
        left = rect.right - maxW;
      }
      left = Math.max(MARGIN, Math.min(left, vw - maxW - MARGIN));

      // --- vertical: abaixo ou acima ---
      const spaceBelow = vh - rect.bottom - MARGIN;
      const spaceAbove = rect.top - MARGIN;
      const preferBelow = spaceBelow >= Math.min(320, spaceAbove);

      let top: number;
      let maxH: number;
      if (preferBelow) {
        top = rect.bottom + MARGIN;
        maxH = Math.max(200, spaceBelow);
      } else {
        maxH = Math.max(200, spaceAbove);
        top = rect.top - MARGIN - maxH;
      }

      setPos({ top, left, maxW, maxH });
    }

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, anchorRef, width]);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onOpenChange(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onOpenChange, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  // Portal direto no <body> escapa de qualquer stacking context,
  // backdrop-filter ou overflow:hidden do pai que vinha causando o
  // popover aparentar translúcido. Position fixed + coords absolutas
  // do anchor. Cor de fundo via VALOR LITERAL inline (não var(--))
  // pra ser 100% imune a escopo de CSS variables.
  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.maxW,
        maxWidth: pos.maxW,
        maxHeight: pos.maxH,
        zIndex: 9999,
        backgroundColor: isDark ? "#1a2238" : "#ffffff",
        isolation: "isolate",
      }}
      className={cn(
        "flex flex-col overflow-hidden",
        "rounded-[22px] border border-[var(--glass-border)] shadow-[var(--glass-shadow-lg)] dark:border-slate-700",
        className,
      )}
    >
      <FilterPanelBody
        value={value}
        options={options}
        optionsLoading={optionsLoading}
        optionsError={optionsError}
        onApply={onApply}
        onClear={onClear}
        onRequestSave={onRequestSave}
        onClose={() => onOpenChange(false)}
        withHeader
      />
    </div>,
    document.body,
  );
}
