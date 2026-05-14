"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/**
 * Tooltip via Radix + Portal — conteúdo no `body`, posicionamento acessível.
 *
 * Uso padrão:
 *   <Tooltip>
 *     <TooltipTrigger>
 *       <button>…</button>
 *     </TooltipTrigger>
 *     <TooltipContent>Customizar assinatura</TooltipContent>
 *   </Tooltip>
 *
 * Para uma API enxuta sem boilerplate, use <TooltipHost label="…">…</TooltipHost>.
 */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={100}>
      {children}
    </RadixTooltip.Provider>
  );
}

export interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
  className?: string;
  /** Mantido por paridade de API — o root é o Radix Root (sem wrapper DOM). */
  asChild?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  children,
  delayDuration,
  className,
  open,
  defaultOpen,
  onOpenChange,
}: TooltipProps) {
  const root = (
    <RadixTooltip.Root
      delayDuration={delayDuration ?? 300}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </RadixTooltip.Root>
  );

  if (!className) return root;
  return <span className={cn("relative inline-flex", className)}>{root}</span>;
}

export const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Trigger>
>(({ asChild = true, ...props }, ref) => (
  <RadixTooltip.Trigger ref={ref} asChild={asChild} {...props} />
));
TooltipTrigger.displayName = "TooltipTrigger";

export interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof RadixTooltip.Content> {
  /** Mostra seta indicadora. Default true. */
  arrow?: boolean;
}

export type TooltipAlign = NonNullable<TooltipContentProps["align"]>;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  TooltipContentProps
>(
  (
    {
      className,
      side = "top",
      align = "center",
      arrow = true,
      children,
      sideOffset = 6,
      ...props
    },
    ref,
  ) => (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[9999] w-max max-w-xs",
          "rounded-lg border border-border bg-popover px-2.5 py-1.5",
          "text-[11px] font-semibold text-popover-foreground",
          "shadow-[var(--shadow-lg)]",
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-1",
          "data-[side=top]:slide-in-from-bottom-1",
          "data-[side=left]:slide-in-from-right-1",
          "data-[side=right]:slide-in-from-left-1",
          className,
        )}
        {...props}
      >
        {children}
        {arrow && (
          <RadixTooltip.Arrow
            className="fill-popover drop-shadow-[0_1px_0_var(--color-border)]"
            width={10}
            height={5}
          />
        )}
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  ),
);
TooltipContent.displayName = "TooltipContent";

export interface TooltipHostProps {
  label: React.ReactNode;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  delayDuration?: number;
}

/**
 * Wrapper enxuto para uso comum: Tooltip + Trigger + Content com `label`.
 */
export function TooltipHost({
  label,
  side = "top",
  align = "center",
  children,
  className,
  contentClassName,
  arrow = true,
  delayDuration,
}: TooltipHostProps) {
  return (
    <Tooltip delayDuration={delayDuration} className={className}>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} arrow={arrow} className={contentClassName}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
