"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, UserCircle2 } from "lucide-react";

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
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode";

/**
 * NavRail dedicado ao segmento REAL `/v2/*`.
 * O avatar abre um popover com as mesmas opções da versão legada:
 * nome, e-mail, "Meu perfil" e "Sair".
 */

interface NavItem {
  icon: React.ReactNode;
  title: string;
  href: string;
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
];

function isActiveFor(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Popover de conta — mesmo padrão do dashboard-shell legado. */
function AccountPopover({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      left: rect.right + 12,
      bottom: window.innerHeight - rect.bottom - 4,
    });
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    // Usa "click" (não "mousedown") para que o toggle do botão trigger
    // já tenha sido processado antes de checar se clicou fora.
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      onClose();
    };
    // Delay de um frame para evitar que o próprio click que abriu o
    // menu seja capturado imediatamente e feche o menu.
    const timer = setTimeout(() => {
      document.addEventListener("click", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [open, onClose, triggerRef]);

  const preview = isPreviewMode();
  const displayName = preview ? PREVIEW_USER.name : "Usuário";
  const email = preview ? PREVIEW_USER.email : "";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", left: pos.left, bottom: pos.bottom, zIndex: 1000 }}
      className="w-[280px] overflow-hidden rounded-[22px] border border-white/55 bg-white/85 text-popover-foreground shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col items-center gap-2 px-5 pb-4 pt-6">
        <div className="av-pink flex size-9 items-center justify-center rounded-full border-2 border-white font-bold text-xs text-white shadow-lg ring-4 ring-white/30">
          {initials}
        </div>
        <p className="font-display text-sm font-bold text-foreground">{displayName}</p>
        {email && <p className="truncate text-[11px] text-muted-foreground">{email}</p>}
      </div>

      <div className="border-t border-border/60" />

      <nav className="flex flex-col gap-0.5 p-2">
        <Link
          href="/settings/profile"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          role="menuitem"
        >
          <UserCircle2 className="size-4 text-muted-foreground" />
          <span className="font-medium">Meu perfil</span>
        </Link>
      </nav>

      <div className="border-t border-border/60" />

      <div className="p-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            // Em preview mode, redireciona para /login sem chamar signOut do NextAuth
            if (isPreviewMode()) {
              window.location.href = "/login";
            } else {
              import("next-auth/react").then(({ signOut }) => {
                void signOut({ callbackUrl: "/login" });
              });
            }
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          role="menuitem"
        >
          <LogOut className="size-4" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function NavRailV2({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const preview = isPreviewMode();
  const displayName = preview ? PREVIEW_USER.name : "Usuário";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className={cn(
          "flex h-full flex-col items-center gap-2 bg-[var(--glass-bg-panel)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-xl)] px-3 py-4 shadow-[var(--glass-shadow)]",
          className,
        )}
      >
        <Link
          href="/v2/dashboard"
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
          href="/v2/settings"
          title="Configurações"
          aria-label="Configurações"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-all duration-150",
            pathname.startsWith("/v2/settings")
              ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
              : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
          )}
        >
          <IconSettings size={20} />
        </Link>

        {/* Avatar — abre popover com opções de conta */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Abrir menu da conta"
          className="relative block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary)]/25"
        >
          <div className="av-pink relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white font-display text-[10px] font-bold text-white transition-all hover:ring-4 hover:ring-[var(--brand-primary)]/25">
            {initials}
            <span className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-[1.5px] border-white bg-[var(--color-online)]" />
          </div>
        </button>
      </nav>

      <AccountPopover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
}
