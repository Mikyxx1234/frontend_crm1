"use client";

/**
 * MobileBottomNav — teste mobile: barra inferior com todos os itens da
 * sidebar, scroll horizontal, e hide-on-scroll-down / show-on-scroll-up.
 *
 * Montada uma vez em `(app)/layout.tsx` (md:hidden) para cobrir todas as
 * abas do CRM sem editar cada page shell. A NavRail vertical fica oculta
 * no mesmo breakpoint via CSS + `max-md:hidden` no NavRailV2.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconSettings } from "@tabler/icons-react";

import { useUserRole } from "@/hooks/use-user-role";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useSidebarPreferences } from "@/features/sidebar/hooks";
import {
  filterNavItemsByPermissions,
  filterNavItemsByRole,
  toNavItems,
  type SidebarItemPreference,
} from "@/lib/sidebar-catalog";
import { cn } from "@/lib/utils";

const SIDEBAR_PREFS_CACHE = "crm:sidebar-prefs-items";

function readCachedSidebarItems(): SidebarItemPreference[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_PREFS_CACHE);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SidebarItemPreference[]) : undefined;
  } catch {
    return undefined;
  }
}

function computeActiveHrefs(pathname: string, hrefs: readonly string[]): Set<string> {
  const candidates = hrefs.filter(
    (h) => pathname === h || pathname.startsWith(`${h}/`),
  );
  return new Set(
    candidates.filter(
      (h) =>
        !candidates.some(
          (other) =>
            other !== h &&
            other.length > h.length &&
            other.startsWith(h.endsWith("/") ? h : `${h}/`),
        ),
    ),
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role, isSuperAdmin } = useUserRole();
  const { data: myPerms } = useMyPermissions();
  const { data: prefs } = useSidebarPreferences();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sempre reaparece ao trocar de aba
  useEffect(() => {
    setVisible(true);
  }, [pathname]);

  // Hide on scroll down / show on scroll up — capture porque o scroll
  // acontece em containers internos (overflow-y-auto), nao no window.
  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;

    let lastY = 0;
    let lastTarget: EventTarget | null = null;
    const THRESHOLD = 6;

    function onScroll(e: Event) {
      if (!mq.matches) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      // Ignora scroll horizontal da propria barra
      if (t.closest?.("[data-mobile-bottom-nav]")) return;

      const y =
        t === document.documentElement || t === document.body
          ? window.scrollY || document.documentElement.scrollTop
          : (t as HTMLElement).scrollTop;

      if (t !== lastTarget) {
        lastTarget = t;
        lastY = y;
        return;
      }

      const delta = y - lastY;
      if (Math.abs(delta) < THRESHOLD) return;
      lastY = y;

      if (delta > 0 && y > 24) {
        setVisible(false);
      } else if (delta < 0) {
        setVisible(true);
      }
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [mounted]);

  const cached = mounted ? readCachedSidebarItems() : undefined;
  const effectiveItems = prefs?.sidebar?.items ?? cached;
  const baseNavItems = toNavItems(effectiveItems);
  const navItems = mounted
    ? filterNavItemsByPermissions(
        filterNavItemsByRole(baseNavItems, { role, isSuperAdmin }),
        { isSuperAdmin, permissions: myPerms?.permissions },
      )
    : baseNavItems;

  const hrefs = [...navItems.map((i) => i.href), "/settings"];
  const activeHrefs = computeActiveHrefs(pathname, hrefs);
  const settingsActive =
    pathname === "/settings" ||
    (pathname.startsWith("/settings/") && !pathname.startsWith("/settings/profile"));

  // Sempre no DOM com `md:hidden` — evita flash sem nav no mobile enquanto
  // useIsMobile ainda e false no 1o paint.
  return (
    <nav
      data-mobile-bottom-nav
      aria-label="Navegação principal mobile"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-popover) md:hidden",
        "border-t border-[var(--nav-border)] bg-[var(--nav-bg)]/95 backdrop-blur-[16px]",
        "pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_rgba(0,0,0,0.28)]",
        "transition-transform duration-200 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div
        className={cn(
          "flex flex-nowrap items-stretch gap-1 overflow-x-auto overscroll-x-contain px-2 py-1.5",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "touch-pan-x",
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHrefs.has(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.title}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-2.5 py-1.5",
                "font-display text-[10px] font-semibold leading-tight transition-colors",
                isActive
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                  : "text-[var(--nav-text-muted)] hover:bg-[var(--nav-text-hover-bg)] hover:text-[var(--nav-text-hover)]",
              )}
            >
              <Icon size={20} stroke={1.8} />
              <span className="max-w-[4.5rem] truncate">{item.title}</span>
            </Link>
          );
        })}

        <Link
          href="/settings"
          aria-label="Configurações"
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "flex min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-2.5 py-1.5",
            "font-display text-[10px] font-semibold leading-tight transition-colors",
            settingsActive || activeHrefs.has("/settings")
              ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
              : "text-[var(--nav-text-muted)] hover:bg-[var(--nav-text-hover-bg)] hover:text-[var(--nav-text-hover)]",
          )}
        >
          <IconSettings size={20} stroke={1.8} />
          <span className="max-w-[4.5rem] truncate">Ajustes</span>
        </Link>
      </div>
    </nav>
  );
}
