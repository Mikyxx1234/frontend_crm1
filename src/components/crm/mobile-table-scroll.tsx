"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type MobileTableScrollProps = {
  children: React.ReactNode;
  /** Largura mínima do conteúdo interno para viabilizar o scroll horizontal. Default 720px. */
  minWidth?: number;
  className?: string;
};

/**
 * Envolve listas/tabelas largas (cabeçalho `listTableHeadRowClass` + linhas
 * em `LIST_GRID`) para que, em telas estreitas (APK/mobile), o usuário role
 * horizontalmente em vez de ter colunas cortadas/espremidas.
 */
export function MobileTableScroll({
  children,
  minWidth = 720,
  className,
}: MobileTableScrollProps) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <div className="flex flex-col gap-2" style={{ minWidth }}>
        {children}
      </div>
    </div>
  );
}
