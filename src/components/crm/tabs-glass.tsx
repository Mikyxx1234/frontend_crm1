import { cn } from "@/lib/utils"

interface TabsGlassProps {
  tabs: string[]
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
      {tabs.map((tab, index) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === index}
          onClick={() => onChange(index)}
          className={cn(
            "flex-1 rounded-[var(--radius-sm)] border border-transparent px-2.5 py-1.5 text-center font-display text-xs font-semibold transition-all duration-150",
            activeTab === index
              ? "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
              : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
