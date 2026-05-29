"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconLayoutDashboard,
  IconFilter,
  IconUsers,
  IconBuilding,
  IconMessageCircle,
  IconChecklist,
  IconBolt,
  IconChartBar,
  IconBell,
  IconSettings,
} from "@tabler/icons-react"

interface NavItem {
  icon: React.ReactNode
  title: string
  href: string
}

const items: NavItem[] = [
  { icon: <IconLayoutDashboard size={20} />, title: "Dashboard", href: "/dashboard" },
  { icon: <IconFilter size={20} />, title: "Pipeline", href: "/pipeline" },
  { icon: <IconUsers size={20} />, title: "Contatos", href: "/contacts" },
  { icon: <IconBuilding size={20} />, title: "Empresas", href: "/companies" },
  { icon: <IconMessageCircle size={20} />, title: "Inbox", href: "/" },
  { icon: <IconChecklist size={20} />, title: "Atividades", href: "/activities" },
  { icon: <IconBolt size={20} />, title: "Automações", href: "/automations" },
  { icon: <IconChartBar size={20} />, title: "Relatórios", href: "/reports" },
]

export function NavRail({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "flex h-full flex-col items-center gap-2 bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-xl)] px-3 py-4 shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <div className="w-11 h-11 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-display font-bold text-base shadow-[0_6px_16px_rgba(91,111,245,0.4)] mb-2">
        EL
      </div>

      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.title}
            href={item.href}
            title={item.title}
            className={cn(
              "w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer transition-all duration-150 relative",
              isActive
                ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
            )}
          >
            {item.icon}
          </Link>
        )
      })}

      <div className="flex-1" />

      <button
        title="Notificações"
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer transition-all duration-150 bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
      >
        <IconBell size={20} />
      </button>

      <button
        title="Configurações"
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer transition-all duration-150 bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
      >
        <IconSettings size={20} />
      </button>

      <div className="av-pink relative w-[30px] h-[30px] rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white border-2 border-white">
        AL
        <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full border-[1.5px] border-white bg-[var(--color-online)]" />
      </div>
    </nav>
  )
}
