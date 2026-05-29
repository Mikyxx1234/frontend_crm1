"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconBolt,
  IconBuilding,
  IconChecklist,
  IconFilter,
  IconLayoutDashboard,
  IconMessageCircle,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * NavRail dedicado ao segmento REAL `/v2/*` — não mexe no NavRail
 * legado (usado pelo route group `(v2)` e por outras telas). Hrefs
 * fixos no novo prefixo. Estado ativo casado por prefixo (`/v2/pipeline`
 * permanece ativo em `/v2/pipeline/123`).
 */

interface NavItem {
  icon: React.ReactNode;
  title: string;
  href: string;
  /**
   * Casamento exato (true) ou prefixo (default). Útil pra Inbox onde
   * o root da seção é `/v2/inbox` e a página de deal aberto vive
   * em `/v2/pipeline/[id]`.
   */
  exact?: boolean;
}

const items: NavItem[] = [
  { icon: <IconLayoutDashboard size={20} />, title: "Dashboard", href: "/v2/dashboard" },
  { icon: <IconFilter size={20} />, title: "Pipeline", href: "/v2/pipeline" },
  { icon: <IconUsers size={20} />, title: "Contatos", href: "/v2/contacts" },
  { icon: <IconBuilding size={20} />, title: "Empresas", href: "/v2/companies" },
  { icon: <IconMessageCircle size={20} />, title: "Inbox", href: "/v2/inbox" },
  { icon: <IconChecklist size={20} />, title: "Atividades", href: "/v2/activities" },
  { icon: <IconBolt size={20} />, title: "Automações", href: "/v2/automations" },
  // "Relatórios" removido: a página /v2/reports ainda não existe e o
  // prefetch do Link gerava um 404 recorrente em toda tela /v2. Reintroduzir
  // quando o /v2/reports for construído.
];

function isActiveFor(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavRailV2({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "flex h-full flex-col items-center gap-2 bg-[var(--glass-bg-strong)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-xl)] px-3 py-4 shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <Link
        href="/v2/dashboard"
        aria-label="Início"
        className="w-11 h-11 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-display font-bold text-base shadow-[0_6px_16px_rgba(91,111,245,0.4)] mb-2"
      >
        EL
      </Link>

      {items.map((item) => {
        const active = isActiveFor(pathname, item);
        return (
          <Link
            key={item.title}
            href={item.href}
            title={item.title}
            aria-label={item.title}
            className={cn(
              "w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer transition-all duration-150 relative",
              active
                ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
            )}
          >
            {item.icon}
          </Link>
        );
      })}

      <div className="flex-1" />

      {/* Sino de notificações removido: não há superfície de notificações
          no segmento /v2 ainda (era um botão sem ação). Reintroduzir quando
          existir o destino/painel. */}

      <Link
        href="/settings"
        title="Configurações"
        aria-label="Configurações"
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer transition-all duration-150 bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
      >
        <IconSettings size={20} />
      </Link>

      <div className="av-pink relative w-[30px] h-[30px] rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white border-2 border-white">
        AL
        <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full border-[1.5px] border-white bg-[var(--color-online)]" />
      </div>
    </nav>
  );
}
