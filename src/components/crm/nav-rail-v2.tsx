"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
  IconUserCircle,
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
import { DockButton, DockProvider } from "@/components/crm/floating-dock";
import {
  AGENT_STATUS_META,
  AgentStatusPopup,
  useAgentStatus,
  useAgentStatusAutoPrompt,
} from "@/components/crm/agent-status";
import { useThemeV2 } from "@/hooks/use-theme-v2";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";
import { isPreviewMode, PREVIEW_USER } from "@/lib/preview-mode";
import {
  filterNavItemsByPermissions,
  filterNavItemsByRole,
  toNavItems,
  type SidebarItemPreference,
} from "@/lib/sidebar-catalog";
import { useSidebarPreferences } from "@/features/sidebar/hooks";
import { useMyPermissions } from "@/hooks/use-my-permissions";

/**
 * Cache local da preferencia da sidebar. O react-query perde o cache a cada
 * F5, entao sem isso a nav pisca: renderiza a ordem padrao do catalogo e so
 * troca para a ordem do usuario quando o GET volta (latencia de rede visivel).
 * Guardamos a ultima preferencia conhecida no localStorage e aplicamos
 * assim que o componente monta (sincrono), antes da resposta da API.
 */
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

/**
 * NavRail dedicado ao segmento REAL `/*`.
 * O avatar redireciona diretamente para /settings/profile.
 *
 * Os itens operacionais sao montados a partir do catalogo
 * (`@/lib/sidebar-catalog`) mesclado com a preferencia pessoal do usuario
 * (GET /api/profile/preferences). Antes da preferencia carregar, renderiza
 * a ordem padrao do catalogo (mesmo resultado no SSR e no 1o render client,
 * evitando hydration mismatch).
 */

function isActiveFor(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const { role, isSuperAdmin } = useUserRole();
  const { data: prefs } = useSidebarPreferences();
  const { data: myPerms } = useMyPermissions();

  const agentStatus = useAgentStatus();
  const [statusPopupOpen, setStatusPopupOpen] = useState(false);
  useAgentStatusAutoPrompt(agentStatus, () => setStatusPopupOpen(true));
  const statusMeta = AGENT_STATUS_META[agentStatus.status];
  const StatusIcon = statusMeta.icon;

  // Cache lido uma unica vez (lazy). So e USADO apos o mount, entao o 1o
  // render (SSR e client) continua usando a ordem padrao do catalogo —
  // preservando a hidratacao sem mismatch.
  const [cachedItems] = useState<SidebarItemPreference[] | undefined>(
    readCachedSidebarItems,
  );

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

  // Persiste a preferencia assim que a API responde, para o proximo F5 ja
  // abrir com a ordem certa sem esperar a rede.
  useEffect(() => {
    const items = prefs?.sidebar?.items;
    if (!items) return;
    try {
      window.localStorage.setItem(SIDEBAR_PREFS_CACHE, JSON.stringify(items));
    } catch {
      /* localStorage indisponivel — ignora */
    }
  }, [prefs]);

  // Fonte dos itens: 1o render usa o padrao (mounted=false). Apos montar,
  // aplica a preferencia da API; se ainda nao chegou, usa o cache local —
  // eliminando o flash de "itens diferentes" ao recarregar.
  const effectiveItems =
    prefs?.sidebar?.items ?? (mounted ? cachedItems : undefined);
  const navItems = filterNavItemsByPermissions(
    filterNavItemsByRole(toNavItems(effectiveItems), { role, isSuperAdmin }),
    { isSuperAdmin, permissions: myPerms?.permissions },
  );
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
    <DockProvider
      aria-label="Navegação principal"
      className={cn(
        "flex h-full flex-col items-center gap-2 bg-[var(--glass-bg-panel)] backdrop-blur-[16px] border border-[var(--glass-border)] rounded-[var(--radius-xl)] py-4 shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <Link
        href="/dashboard"
        aria-label="Início"
        className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-base font-bold text-white shadow-[0_6px_16px_rgba(91,111,245,0.4)]"
      >
        EL
      </Link>

      {/* Área rolável dos itens de navegação. Com zoom alto a rail não cabe
          inteira na viewport; em vez de transbordar e cortar os ícones de
          baixo + avatar (parent .v2-screen tem overflow-hidden), o miolo
          rola. `overflow-x-clip` permite o scroll vertical sem forçar
          overflow-x:auto (que cortaria a magnificação) — os DockButton aqui
          usam `disablePop` para a escala caber dentro do padding. */}
      <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-clip px-3 [scrollbar-width:none] [scrollbar-gutter:stable_both-edges] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <DockButton
              key={item.key}
              href={item.href}
              title={item.title}
              active={isActiveFor(pathname, item.href)}
              disablePop
            >
              <Icon size={20} />
            </DockButton>
          );
        })}
      </div>

      {/* Ícones inferiores usam `disablePop` como os itens de navegação:
          magnificação no lugar, sem saltar para fora do trilho. O wrapper
          replica a régua horizontal do miolo (w-full + px-3) para os dois
          grupos ficarem alinhados mesmo quando o scrollbar ocupa espaço. */}
      <div className="flex w-full shrink-0 flex-col items-center gap-2 px-3">
      {/* Status do agente (Online / Ausente / Offline) — define a distribuição */}
      <DockButton
        title={`Status: ${statusMeta.label}`}
        onClick={() => setStatusPopupOpen(true)}
        disablePop
      >
        <span className="relative inline-flex">
          <StatusIcon size={20} style={{ color: statusMeta.color }} />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full border-[1.5px] border-[var(--glass-bg-panel)]"
            style={{ backgroundColor: statusMeta.color }}
          />
        </span>
      </DockButton>

      {/* Tema: lua / sol */}
      <DockButton
        title={theme === "light" ? "Modo escuro" : "Modo claro"}
        onClick={toggle}
        disablePop
      >
        {theme === "light" ? <IconMoon size={20} /> : <IconSun size={20} />}
      </DockButton>

      {/* Configurações — último ícone antes do avatar do usuário. */}
      <DockButton
        href="/settings"
        title="Configurações"
        active={pathname.startsWith("/settings") && !isProfileActive}
        disablePop
      >
        <IconSettings size={20} />
      </DockButton>

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
              "relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[12px] font-bold text-white transition-all hover:ring-4 hover:ring-[var(--brand-primary)]/25",
              isProfileActive
                ? "border-[var(--brand-primary)] ring-4 ring-[var(--brand-primary)]/25"
                : "border-[var(--glass-bg-strong)]",
            )}
          >
            {initials}
            <span
              className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-[var(--glass-bg-strong)]"
              style={{ backgroundColor: statusMeta.color }}
            />
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
              "relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] font-display text-[12px] font-bold text-white transition-all hover:ring-4 hover:ring-[var(--brand-primary)]/25",
              isProfileActive
                ? "border-[var(--brand-primary)] ring-4 ring-[var(--brand-primary)]/25"
                : "border-[var(--glass-bg-strong)]",
            )}
          >
            {initials}
            <span
              className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-[var(--glass-bg-strong)]"
              style={{ backgroundColor: statusMeta.color }}
            />
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

          <DropdownMenuItem onClick={() => setStatusPopupOpen(true)}>
            <span
              className="inline-flex h-4 w-4 items-center justify-center"
              aria-hidden
            >
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

      <AgentStatusPopup
        open={statusPopupOpen}
        current={agentStatus.status}
        onClose={() => setStatusPopupOpen(false)}
        onSelect={(s) => agentStatus.setStatus(s)}
      />
    </DockProvider>
  );
}
