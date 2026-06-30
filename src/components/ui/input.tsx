import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// Input glass: height 38px, radius 10px, fundo translúcido com blur,
// focus ring brand. Os tokens border-input/bg-background apontam
// pra rgba transparente no @theme — o blur dá a sensação de vidro.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full min-w-0 rounded-[10px] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 text-sm text-foreground shadow-[var(--glass-shadow-sm)] backdrop-blur-sm transition-all outline-none",
          "placeholder:text-[var(--color-ink-muted)]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-primary/40",
          "focus-visible:border-primary focus-visible:bg-[var(--glass-bg-strong)] focus-visible:ring-[3px] focus-visible:ring-primary/20",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "selection:bg-primary/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
