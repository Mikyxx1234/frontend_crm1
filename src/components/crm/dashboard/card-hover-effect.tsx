"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Hover sutil dos cards do dashboard.
 *
 * Em vez de um brilho que "desliza" entre cards (versão anterior), cada
 * card ganha uma elevação própria no hover: uma sombra suave na cor da
 * marca + um realce fino na borda. Usa `drop-shadow` (segue o formato
 * arredondado de qualquer card) e NÃO usa transform/scale — então não há
 * deslocamento de layout nem clipping dentro do carrossel do funil.
 *
 * `HoverEffectGroup` e `HoverEffectItem` permanecem como API estável; o
 * grupo é apenas um passthrough (mantido para não alterar os pontos de
 * uso existentes).
 */

export function HoverEffectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface HoverEffectItemProps {
  /** Mantido por compatibilidade; não é mais necessário. */
  itemKey?: string;
  children: React.ReactNode;
  /** Classes do contêiner externo (ex.: `h-full`, `shrink-0`). */
  className?: string;
}

export function HoverEffectItem({ children, className }: HoverEffectItemProps) {
  return (
    <div className={cn("group/card h-full", className)}>
      <div
        className={cn(
          "h-full transition-[filter] duration-200 ease-out",
          "filter-[drop-shadow(0_0_0_transparent)_drop-shadow(0_0_0_transparent)]",
          "group-hover/card:filter-[var(--card-hover-filter)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
