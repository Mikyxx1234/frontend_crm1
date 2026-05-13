"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tooltip CSS-only com estilo padrão escuro (navy #1e293b, texto branco,
 * cantos rounded-md, seta no lado indicado). Usa group/tooltip para exibir
 * no hover e focus-within.
 *
 * Uso padrão:
 *   <Tooltip>
 *     <TooltipTrigger>
 *       <button>…</button>
 *     </TooltipTrigger>
 *     <TooltipContent>Customizar assinatura</TooltipContent>
 *   </Tooltip>
 *
 * Para uma API enxuta sem boilerplate, use <TooltipHost label="...">…</TooltipHost>.
 */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export interface TooltipProps {
  children: React.ReactNode;
  /** Mantido por paridade de API — animação é CSS. */
  delayDuration?: number;
  className?: string;
  asChild?: boolean;
}

export function Tooltip({ children, className }: TooltipProps) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
    </span>
  );
}

export const TooltipTrigger = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean }
>(({ className, asChild: _asChild, ...props }, ref) => (
  <span ref={ref} className={cn("inline-flex", className)} {...props} />
));
TooltipTrigger.displayName = "TooltipTrigger";

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  /** Mostra seta indicadora. Default true. */
  arrow?: boolean;
}

const sidePositions: Record<NonNullable<TooltipContentProps["side"]>, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
};

const arrowPositions: Record<NonNullable<TooltipContentProps["side"]>, string> = {
  top: "-bottom-1 left-1/2 -translate-x-1/2",
  bottom: "-top-1 left-1/2 -translate-x-1/2",
  left: "-right-1 top-1/2 -translate-y-1/2",
  right: "-left-1 top-1/2 -translate-y-1/2",
};

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", arrow = true, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-60 w-max max-w-xs whitespace-nowrap rounded-md bg-[#1e293b] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xl",
        "invisible -translate-y-0.5 opacity-0 transition-[opacity,visibility,transform] duration-150",
        "group-hover/tooltip:visible group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100",
        "group-focus-within/tooltip:visible group-focus-within/tooltip:translate-y-0 group-focus-within/tooltip:opacity-100",
        sidePositions[side],
        className,
      )}
      {...props}
    >
      {children}
      {arrow && (
        <span
          aria-hidden="true"
          className={cn("absolute size-2 rotate-45 bg-[#1e293b]", arrowPositions[side])}
        />
      )}
    </div>
  ),
);
TooltipContent.displayName = "TooltipContent";

export interface TooltipHostProps {
  label: React.ReactNode;
  side?: TooltipContentProps["side"];
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
}

/**
 * Wrapper enxuto para uso comum: embrulha o children em Tooltip + TooltipContent
 * usando `label` como conteúdo. Preserva acessibilidade via aria-describedby não é
 * necessário aqui pois o label é complementar ao `title`/`aria-label` do elemento.
 */
export function TooltipHost({
  label,
  side = "top",
  children,
  className,
  contentClassName,
  arrow = true,
}: TooltipHostProps) {
  return (
    <Tooltip className={className}>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent side={side} arrow={arrow} className={contentClassName}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
