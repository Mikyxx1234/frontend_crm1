import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'strong' | 'subtle' | 'overlay'
}

const variantClasses = {
  default: 'bg-[var(--glass-bg)]',
  strong: 'bg-[var(--glass-bg-strong)]',
  subtle: 'bg-[var(--glass-bg-subtle)]',
  overlay: 'bg-[var(--glass-bg-overlay)]',
}

export function GlassCard({ children, className, variant = 'strong' }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--glass-border)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  )
}
