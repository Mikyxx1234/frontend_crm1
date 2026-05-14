import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base Lumen: inline-flex, radius-sm (4px), peso 600, transição
  "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold transition-colors leading-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-bg-muted text-ink-soft",
        outline:
          "border-border bg-background text-foreground",
        destructive:
          "border-transparent bg-[var(--color-destructive-soft)] text-destructive",
        success:
          "border-transparent bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning:
          "border-transparent bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        // Índigo suave — estado, etapa
        indigo:
          "border-transparent bg-[var(--color-primary-soft)] text-primary",
        // Lavanda — IA / Copilot
        ai:
          "border-transparent bg-[var(--color-lavender-soft)] text-[var(--color-lavender)]",
        // Rosa — destaque especial
        pink:
          "border-transparent bg-[var(--color-pink-soft)] text-[var(--color-pink)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Badge de IA com gradiente lavanda→rosa e ícone estrela
function AIBadge({
  children = "IA",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold leading-none text-white",
        "bg-gradient-to-r from-[#7B61FF] to-[#F5319D]",
        className
      )}
      {...props}
    >
      <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" className="shrink-0">
        <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" />
      </svg>
      {children}
    </div>
  );
}

export { Badge, badgeVariants, AIBadge };
