import { cn } from "@/lib/utils"

export interface TabItem {
  label: string
  count?: number
  icon?: React.ReactNode
}

interface TabsGlassProps {
  tabs: string[] | TabItem[]
  activeTab: number
  onChange: (index: number) => void
  className?: string
}

export function TabsGlass({ tabs, activeTab, onChange, className }: TabsGlassProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] p-1",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const label = typeof tab === "string" ? tab : tab.label
        const count = typeof tab === "string" ? undefined : tab.count
        return (
          <button
            key={label}
            role="tab"
            aria-selected={activeTab === index}
            onClick={() => onChange(index)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-transparent px-2.5 py-1.5 text-center font-display text-xs font-semibold transition-all duration-150",
              activeTab === index
                ? "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
                : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {label}
            {count !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeTab === index
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-[var(--glass-border)] text-[var(--text-muted)]"
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
