import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface InputGlassProps extends React.InputHTMLAttributes<HTMLInputElement> {
  withSearch?: boolean
}

export const InputGlass = forwardRef<HTMLInputElement, InputGlassProps>(
  ({ className, withSearch = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 font-body text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none backdrop-blur-sm transition-all duration-150",
          "focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20",
          withSearch && "pl-10 bg-[length:16px_16px] bg-no-repeat bg-[12px_center] bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E\")]",
          className
        )}
        {...props}
      />
    )
  }
)
InputGlass.displayName = "InputGlass"
