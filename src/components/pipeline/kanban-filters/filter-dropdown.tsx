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
  anchorRef: _anchorRef,
  value,
  options,
  optionsLoading,
  optionsError,
  onApply,
  onClear,
  onRequestSave,
  width = 900,
  maxHeight = "min(85vh, 720px)",
  className,
}: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = React.useState(false);

  // Detecta dark mode pelo `.dark` no <html>.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Trava scroll do body enquanto o modal está aberto.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fecha ao pressionar ESC.
  React.useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Overlay escuro semitransparente — clicar fecha */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: "var(--z-popover)" }}
        className="bg-black/40 backdrop-blur-[2px]"
        onMouseDown={() => onOpenChange(false)}
      />

      {/* Dialog centrado — sempre 100% dentro do viewport */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros avançados"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `min(${width}px, calc(100vw - 32px))`,
          height: maxHeight,          /* altura explícita: permite flex-1 interno crescer */
          maxHeight,
          zIndex: "var(--z-popover)",
          backgroundColor: isDark ? "#13192d" : "#ffffff",
          isolation: "isolate",
        }}
        className={cn(
          "flex flex-col overflow-hidden",
          "rounded-2xl border border-[var(--glass-border)] shadow-[0_24px_64px_rgba(15,20,40,0.22)] dark:border-slate-700",
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
      </div>
    </>,
    document.body,
  );
}
