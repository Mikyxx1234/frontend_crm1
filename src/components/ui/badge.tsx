import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base glass: inline-flex, radius-full (pill), peso 600, font-display
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[11px] font-semibold leading-none tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-[var(--color-primary-soft)] text-primary",
        secondary:
          "border-white/40 bg-white/50 text-[var(--color-ink-soft)] backdrop-blur-sm",
        outline:
          "border-white/55 bg-transparent text-foreground",
        destructive:
          "border-destructive/25 bg-[var(--color-destructive-soft)] text-destructive",
        success:
          "border-[var(--color-success)]/25 bg-[var(--color-success-soft)] text-[var(--color-success-text)]",
        warning:
          "border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warn-text)]",
        // Índigo suave — estado, etapa
        indigo:
          "border-primary/25 bg-[var(--color-primary-soft)] text-primary",
        // Lavanda — IA / Copilot
        ai:
          "border-[var(--color-lavender)]/25 bg-[var(--color-lavender-soft)] text-[var(--color-lavender)]",
        // Rosa — destaque especial
        pink:
          "border-[var(--color-pink)]/25 bg-[var(--color-pink-soft)] text-[var(--color-pink)]",
        // Lead (laranja warm) — novo
        lead:
          "border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warn-text)]",
        // Glass — translúcida com blur
        glass:
          "border-white/55 bg-white/45 text-foreground backdrop-blur-sm shadow-[var(--glass-shadow-sm)]",
        // Muted — chip neutro
        muted:
          "border-white/40 bg-slate-400/15 text-[var(--color-ink-muted)]",
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold leading-none text-white shadow-[var(--shadow-lavender-glow)]",
        "bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-accent)]",
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
