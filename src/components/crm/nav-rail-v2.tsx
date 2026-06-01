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
  IconMoon,
  IconSettings,
  IconSun,
  IconUsers,
} from "@tabler/icons-react";

import { useEffect, useState } from "react";

import { useThemeV2 } from "@/hooks/use-theme-v2";
import { cn } from "@/lib/utils";
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode";

/**
 * NavRail dedicado ao segmento REAL `/*`.
 * O avatar redireciona diretamente para /settings/profile.
 */

interface NavItem {
  icon: React.ReactNode;
  title: string;
  href: string;
  exact?: boolean;
}

const items: NavItem[] = [
  { icon: <IconLayoutDashboard size={20} />, title: "Dashboard", href: "/dashboard" },
  { icon: <IconFilter size={20} />, title: "Pipeline", href: "/pipeline" },
  { icon: <IconUsers size={20} />, title: "Contatos", href: "/contacts" },
  { icon: <IconBuilding size={20} />, title: "Empresas", href: "/companies" },
  { icon: <IconMessageCircle size={20} />, title: "Inbox", href: "/inbox" },
  { icon: <IconChecklist size={20} />, title: "Atividades", href: "/activities" },
  { icon: <IconBolt size={20} />, title: "Automações", href: "/automations" },
];

function isActiveFor(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavRailV2({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const { theme, toggle } = useThemeV2();

  // Iniciais resolvidas apenas no client para evitar hydration mismatch —
  // isPreviewMode() depende de NEXT_PUBLIC_PREVIEW_MODE que pode diferir entre SSR e client.
  const [initials, setInitials] = useState("··");
  useEffect(() => {
    const preview = isPreviewMode();
    const displayName = preview ? PREVIEW_USER.name : "Usuário";
    setInitials(
      displayName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    );
  }, []);

  const isProfileActive = pathname.startsWith("/settings/profile");

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "flex h-full flex-col items-center gap-2 bg-[var(--glass-bg-panel)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-xl)] px-3 py-4 shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <Link
        href="/dashboard"
        aria-label="Início"
        className="mb-2 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-base font-bold text-white shadow-[0_6px_16px_rgba(91,111,245,0.4)]"
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
              "flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-all duration-150",
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

      <Link
        href="/settings"
        title="Configurações"
        aria-label="Configurações"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-all duration-150",
          pathname.startsWith("/settings") && !isProfileActive
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
        )}
      >
        <IconSettings size={20} />
      </Link>

      {/* Tema: lua / sol */}
      <button
        type="button"
        onClick={toggle}
        title={theme === "light" ? "Modo escuro" : "Modo claro"}
        aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
      >
        {theme === "light" ? (
          <IconMoon size={20} />
        ) : (
          <IconSun size={20} />
        )}
      </button>

      {/* Avatar — redireciona direto para /settings/profile */}
      <Link
        href="/settings/profile"
        title="Meu perfil"
        aria-label="Ir para meu perfil"
        className="relative block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary)]/25"
      >
        <div
          className={cn(
            "av-pink relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 font-display text-[10px] font-bold text-white transition-all hover:ring-4 hover:ring-[var(--brand-primary)]/25",
            isProfileActive
              ? "border-[var(--brand-primary)] ring-4 ring-[var(--brand-primary)]/25"
              : "border-[var(--glass-bg-strong)]",
          )}
        >
          {initials}
          <span className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-[1.5px] border-[var(--glass-bg-strong)] bg-[var(--color-online)]" />
        </div>
      </Link>
    </nav>
  );
}
