import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectNativeProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, disabled, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative grid w-full items-center [&>select]:col-start-1 [&>select]:row-start-1"
        )}
      >
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            // Padrão DS v2 (glass) — trava visual de todos os selects nativos.
            "col-start-1 row-start-1 flex h-9 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-1 ps-3 pe-9 font-display text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none backdrop-blur-sm transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40",
            "aria-invalid:border-[var(--color-danger)] aria-invalid:ring-[var(--color-danger)]/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none col-start-1 row-start-1 ms-auto me-2.5 size-4 justify-self-end text-[var(--text-muted)]",
            disabled && "opacity-50"
          )}
        />
      </div>
    );
  }
);
SelectNative.displayName = "SelectNative";

export { SelectNative };
