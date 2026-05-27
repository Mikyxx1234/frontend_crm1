import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface ButtonGlassProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'glass' | 'icon'
  size?: 'default' | 'sm' | 'icon'
  children: React.ReactNode
}

export const ButtonGlass = forwardRef<HTMLButtonElement, ButtonGlassProps>(
  ({ variant = 'glass', size = 'default', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-display font-semibold outline-none transition-all duration-150",
          // Variants
          variant === 'primary' && "bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] hover:bg-[var(--brand-primary-dark)] hover:-translate-y-0.5",
          variant === 'glass' && "bg-[var(--glass-bg-strong)] backdrop-blur-md border border-[var(--glass-border)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-overlay)]",
          variant === 'icon' && "bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
          // Sizes
          size === 'default' && "px-[18px] py-2 text-[13px]",
          size === 'sm' && "px-3 py-1.5 text-xs",
          size === 'icon' && "h-9 w-9 p-0 rounded-[var(--radius-md)] text-[17px]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ButtonGlass.displayName = "ButtonGlass"
