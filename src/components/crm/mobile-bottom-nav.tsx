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
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
  IconUserCircle,
} from "@tabler/icons-react";
import { signOut, useSession } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AGENT_STATUS_META,
  AgentStatusPopup,
  useAgentStatus,
  useAgentStatusAutoPrompt,
} from "@/components/crm/agent-status";
import { useThemeV2 } from "@/hooks/use-theme-v2";
import { useUserRole } from "@/hooks/use-user-role";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useSidebarPreferences } from "@/features/sidebar/hooks";
import {
  filterNavItemsByPermissions,
  filterNavItemsByRole,
  toNavItems,
  type SidebarItemPreference,
} from "@/lib/sidebar-catalog";
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode";
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

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, toggle } = useThemeV2();
  const { role, isSuperAdmin } = useUserRole();
  const { data: myPerms } = useMyPermissions();
  const { data: prefs } = useSidebarPreferences();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [initials, setInitials] = useState("··");
  const [displayName, setDisplayName] = useState("Usuário");
  const [email, setEmail] = useState<string | null>(null);

  const agentStatus = useAgentStatus();
  const [statusPopupOpen, setStatusPopupOpen] = useState(false);
  useAgentStatusAutoPrompt(agentStatus, () => setStatusPopupOpen(true));
  const statusMeta = AGENT_STATUS_META[agentStatus.status];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const preview = isPreviewMode();
    const sessUser = session?.user;
    const name =
      sessUser?.name?.trim() || (preview ? PREVIEW_USER.name : "Usuário");
    const mail =
      sessUser?.email ?? (preview ? (PREVIEW_USER.email ?? null) : null);
    setDisplayName(name);
    setEmail(mail);
    setInitials(computeInitials(name));
  }, [session]);

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

  const hrefs = [...navItems.map((i) => i.href), "/settings", "/settings/profile"];
  const activeHrefs = computeActiveHrefs(pathname, hrefs);
  const isProfileActive = pathname.startsWith("/settings/profile");
  const settingsActive =
    pathname === "/settings" ||
    (pathname.startsWith("/settings/") && !isProfileActive);

  const itemClass = (active: boolean) =>
    cn(
      "flex min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-2.5 py-1.5",
      "font-display text-[10px] font-semibold leading-tight transition-colors",
      active
        ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
        : "text-[var(--nav-text-muted)] hover:bg-[var(--nav-text-hover-bg)] hover:text-[var(--nav-text-hover)]",
    );

  return (
    <>
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
                className={itemClass(isActive)}
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
            className={itemClass(settingsActive || activeHrefs.has("/settings"))}
          >
            <IconSettings size={20} stroke={1.8} />
            <span className="max-w-[4.5rem] truncate">Ajustes</span>
          </Link>

          {/* Minha conta — avatar + menu (mesmo da NavRail). */}
          {!mounted ? (
            <button
              type="button"
              title="Minha conta"
              aria-label="Abrir menu da conta"
              className={itemClass(isProfileActive)}
            >
              <span
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[10px] font-bold text-white",
                  isProfileActive
                    ? "border-white/80"
                    : "border-[var(--glass-bg-strong)]",
                )}
              >
                {initials}
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full border-2 border-[var(--nav-bg)]"
                  style={{ backgroundColor: statusMeta.color }}
                />
              </span>
              <span className="max-w-[4.5rem] truncate">Conta</span>
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                title="Minha conta"
                aria-label="Abrir menu da conta"
                className={itemClass(isProfileActive)}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[10px] font-bold text-white",
                    isProfileActive
                      ? "border-white/80"
                      : "border-[var(--glass-bg-strong)]",
                  )}
                >
                  {initials}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full border-2 border-[var(--nav-bg)]"
                    style={{ backgroundColor: statusMeta.color }}
                  />
                </span>
                <span className="max-w-[4.5rem] truncate">Conta</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" side="top" className="mb-2 w-60">
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[11px] font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[13px] font-bold text-foreground">
                      {displayName}
                    </p>
                    {email && (
                      <p className="truncate text-[11px] text-muted-foreground">{email}</p>
                    )}
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setStatusPopupOpen(true)}>
                  <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusMeta.color }}
                    />
                  </span>
                  <span className="font-medium">Status: {statusMeta.label}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                  <IconUserCircle size={16} className="text-muted-foreground" />
                  <span className="font-medium">Meu perfil</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={toggle}>
                  {theme === "light" ? (
                    <IconMoon size={16} className="text-muted-foreground" />
                  ) : (
                    <IconSun size={16} className="text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {theme === "light" ? "Modo escuro" : "Modo claro"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <IconLogout size={16} />
                  <span className="font-medium">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>

      <AgentStatusPopup
        open={statusPopupOpen}
        current={agentStatus.status}
        onClose={() => setStatusPopupOpen(false)}
        onSelect={(s) => agentStatus.setStatus(s)}
      />
    </>
  );
}
