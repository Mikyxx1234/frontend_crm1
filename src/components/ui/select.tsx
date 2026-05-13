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
            "col-start-1 row-start-1 flex h-9 w-full appearance-none rounded-md border border-input bg-transparent py-1 ps-3 pe-9 text-sm shadow-sm outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none col-start-1 row-start-1 ms-auto me-2 size-4 justify-self-end text-muted-foreground",
            disabled && "opacity-50"
          )}
        />
      </div>
    );
  }
);
SelectNative.displayName = "SelectNative";

export { SelectNative };
