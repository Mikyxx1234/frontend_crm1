import { cn } from "@/lib/utils"

/**
 * Tabs aceita tanto `string[]` (legado, sem counts) quanto
 * `{ label, count? }[]` (novo, com badge numerica). Mantemos as duas
 * formas para nao quebrar consumidores existentes.
 */
export interface TabItem {
  label: string
  count?: number | null
}

interface TabsGlassProps {
  tabs: ReadonlyArray<string | TabItem>
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
        const isActive = activeTab === index
        return (
          <button
            key={`${label}-${index}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(index)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-transparent px-2.5 py-1.5 text-center font-display text-xs font-semibold transition-all duration-150",
              isActive
                ? "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
                : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <span className="truncate">{label}</span>
            {count !== undefined && count !== null && count > 0 && (
              <span
                className={cn(
                  "inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-[rgba(91,111,245,0.15)] text-[var(--brand-primary)]"
                    : "bg-[rgba(0,0,0,0.06)] text-[var(--text-muted)]"
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
