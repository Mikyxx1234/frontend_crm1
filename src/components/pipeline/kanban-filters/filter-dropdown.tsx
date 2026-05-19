/**
 * Dropdown de filtros avancados ancorado em um elemento (ex.: input "Buscar").
 *
 * UX: usuario foca/clica no input -> dropdown abre logo abaixo com todos
 * os criterios. Mantem o mesmo `FilterPanelBody` que o Sheet usa.
 *
 * Fecha ao clicar fora ou ESC. Click no proprio anchor nao fecha (deixa
 * o usuario digitar e abrir o painel ao mesmo tempo).
 */

"use client";

import * as React from "react";

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
  onApply: (next: AdvancedDealFilters) => void;
  onClear: () => void;
  onRequestSave?: (current: AdvancedDealFilters) => void;
  /** Largura do dropdown. Default: 420px. */
  width?: number;
  /** Altura maxima do dropdown. Default: 70vh. */
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
  onApply,
  onClear,
  onRequestSave,
  width = 420,
  maxHeight = "min(70vh, 640px)",
  className,
}: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);

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

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{ width, maxHeight }}
      className={cn(
        "absolute left-0 top-full z-50 mt-1 flex flex-col overflow-hidden",
        "rounded-lg border border-zinc-200 bg-white shadow-xl",
        className,
      )}
    >
      <FilterPanelBody
        value={value}
        options={options}
        optionsLoading={optionsLoading}
        onApply={onApply}
        onClear={onClear}
        onRequestSave={onRequestSave}
        onClose={() => onOpenChange(false)}
        withHeader
      />
    </div>
  );
}
