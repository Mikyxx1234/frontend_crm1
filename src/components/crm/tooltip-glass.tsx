"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

interface TooltipGlassProps {
  /** Texto exibido no tooltip. */
  label: React.ReactNode;
  /** Elemento que dispara o tooltip (deve aceitar ref e props). */
  children: React.ReactElement;
  side?: Side;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Atraso antes de exibir (ms). */
  delay?: number;
  className?: string;
}

/**
 * Provider global para tooltips — coloque uma vez na raiz do layout V2.
 * Todos os `TooltipGlass` dentro dele compartilham o mesmo contexto.
 */
export function TooltipProvider({
  children,
  delay = 200,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

/**
 * Tooltip com o Design System (glass escuro). Requer `TooltipProvider`
 * em um ancestral. Tokens `--tooltip-bg` e `--tooltip-text` do globals-v2.css.
 */
export function TooltipGlass({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset = 8,
  className,
}: TooltipGlassProps) {
  if (!label) return children;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-50 select-none rounded-[var(--radius-md)] px-2.5 py-1.5",
            "bg-[var(--tooltip-bg)] text-[var(--tooltip-text)]",
            "font-display text-xs font-semibold leading-none tracking-tight",
            "shadow-[0_8px_24px_rgba(15,20,40,0.28)] ring-1 ring-white/10 backdrop-blur-md",
            "origin-(--radix-tooltip-content-transform-origin)",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
            className,
          )}
        >
          {label}
          <TooltipPrimitive.Arrow
            width={11}
            height={6}
            className="fill-[var(--tooltip-bg)]"
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
