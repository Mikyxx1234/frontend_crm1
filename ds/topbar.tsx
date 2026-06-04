import { cn } from "@/lib/utils"
import { IconSearch, IconBell, IconHelp } from "@tabler/icons-react"

interface TopbarProps {
  user: {
    name: string
    role: string
    initials: string
  }
  onlineLabel?: string
  className?: string
}

export function Topbar({ user, onlineLabel = "Online", className }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-2.5 pl-5 pr-3.5 backdrop-blur-md shadow-[var(--glass-shadow-sm)]",
        className,
      )}
    >
      <div className="flex flex-1 items-center gap-2.5 text-[var(--text-muted)]">
        <IconSearch size={18} />
        <input
          type="text"
          placeholder="Buscar conversas..."
          className="flex-1 border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/25 bg-[var(--color-success-bg)] px-3 py-1 font-display text-xs font-semibold text-[var(--color-success-text)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
        {onlineLabel}
      </span>

      <button
        type="button"
        title="Notificações"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
      >
        <IconBell size={18} />
      </button>
      <button
        type="button"
        title="Ajuda"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
      >
        <IconHelp size={18} />
      </button>

      <div className="flex items-center gap-2.5 pl-1.5">
        <div className="text-right">
          <div className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            {user.name}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {user.role}
          </div>
        </div>
        <div className="av-purple flex h-10 w-10 items-center justify-center rounded-full border-2 border-white font-display text-sm font-bold text-white">
          {user.initials}
        </div>
      </div>
    </header>
  )
}
