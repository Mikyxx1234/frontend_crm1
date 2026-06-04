"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  IconBolt,
  IconBuilding,
  IconChecklist,
  IconFilter,
  IconLayoutDashboard,
  IconLogout,
  IconMessageCircle,
  IconMoon,
  IconSettings,
  IconSun,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import { signOut, useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function NavRailV2({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { theme, toggle } = useThemeV2();
  const { data: session } = useSession();

  // Iniciais resolvidas apenas no client para evitar hydration mismatch —
  // isPreviewMode() depende de NEXT_PUBLIC_PREVIEW_MODE que pode diferir entre SSR e client.
  // Prioridade: usuário autenticado (NextAuth) > usuário de preview > genérico.
  const [initials, setInitials] = useState("··");
  const [displayName, setDisplayName] = useState("Usuário");
  const [email, setEmail] = useState<string | null>(null);
  // `mounted` evita hydration mismatch do DropdownMenu (Radix). Quando este
  // componente é instanciado em uma Server Page e passado como prop JSX,
  // os IDs gerados por `useId()` do Radix divergem entre SSR e client porque
  // a posição na árvore difere. Renderizamos um botão estático no SSR e
  // trocamos pelo DropdownMenu real só após mount — comportamento idêntico
  // do ponto de vista do usuário (o dropdown só abre via clique, que naturalmente
  // ocorre depois do mount).
  const [mounted, setMounted] = useState(false);
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

      {/* Avatar — abre menu da conta (Meu perfil / Sair).
          No SSR/primeiro render renderizamos um botão estático equivalente
          para evitar hydration mismatch (ver comentário em `mounted` acima). */}
      {!mounted ? (
        <button
          type="button"
          title="Minha conta"
          aria-label="Abrir menu da conta"
          className="relative block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary)]/25"
        >
          <div
            className={cn(
              "relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[10px] font-bold text-white transition-all hover:ring-4 hover:ring-[var(--brand-primary)]/25",
              isProfileActive
                ? "border-[var(--brand-primary)] ring-4 ring-[var(--brand-primary)]/25"
                : "border-[var(--glass-bg-strong)]",
            )}
          >
            {initials}
            <span className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-[1.5px] border-[var(--glass-bg-strong)] bg-[var(--color-online)]" />
          </div>
        </button>
      ) : (
      <DropdownMenu>
        <DropdownMenuTrigger
          title="Minha conta"
          aria-label="Abrir menu da conta"
          className="relative block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary)]/25"
        >
          <div
            className={cn(
              "relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[10px] font-bold text-white transition-all hover:ring-4 hover:ring-[var(--brand-primary)]/25",
              isProfileActive
                ? "border-[var(--brand-primary)] ring-4 ring-[var(--brand-primary)]/25"
                : "border-[var(--glass-bg-strong)]",
            )}
          >
            {initials}
            <span className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-[1.5px] border-[var(--glass-bg-strong)] bg-[var(--color-online)]" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-60">
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

          <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
            <IconUserCircle size={16} className="text-muted-foreground" />
            <span className="font-medium">Meu perfil</span>
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
    </nav>
  );
}
