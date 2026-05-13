"use client";

import { apiUrl } from "@/lib/api";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Book, Bot, ChartBar as BarChart3, Building2, SquareCheck as CheckSquare, Circle, Coffee, FileBarChart, Filter, Headphones, LayoutDashboard, LogOut, Megaphone, MessageSquare, MoreHorizontal, Moon, Settings, Sun, UserCircle2, Users, Wifi, WifiOff, X, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { MobileModuleIcon } from "@/components/layout/mobile-module-icon";
import { WhatsAppHealthBanner } from "@/components/layout/whatsapp-health-banner";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PushNavigateListener } from "@/components/pwa/push-navigate-listener";
import { PushPermissionPrompt } from "@/components/pwa/push-permission-prompt";
import { useMobileLayout } from "@/hooks/use-mobile-layout";
import { MOBILE_MODULES, type MobileModuleId } from "@/lib/mobile-layout";
import { cn, getInitials } from "@/lib/utils";

/**
 * Lookup rapido do descriptor do modulo por id.
 * Construido uma vez no carregamento do modulo (Map -> O(1)).
 */
const MOBILE_MODULE_MAP = new Map(MOBILE_MODULES.map((m) => [m.id, m] as const));

/**
 * Badges por modulo. Extensivel: adicione um modulo novo no
 * MOBILE_MODULES e mapeie o badgeKey aqui se ele tiver contador.
 */
const MOBILE_BADGE_KEYS: Partial<Record<MobileModuleId, string>> = {
  tasks: "overdueTasks",
};

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  badgeKey?: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  // Item ÚNICO de pipeline/funil de vendas. O ícone Funnel (`Filter`)
  // representa o "funil de vendas" — semanticamente mais alinhado do
  // que o foguete (Rocket) anterior.
  //
  // O href aponta pra `/pipeline` em vez de uma rota `/sales-hub`
  // separada (que nunca existiu). A página `/pipeline` lembra a
  // ÚLTIMA visualização escolhida pelo usuário (`pipeline-view-mode`
  // no localStorage, gerenciado por `loadViewMode()`/`saveViewMode()`):
  // se foi `saleshub` da última vez, abre direto no Sales Hub; se foi
  // `kanban` ou `list`, abre no formato correspondente. Assim cada
  // operador tem o seu modo de trabalho preservado entre sessões.
  { href: "/pipeline", label: "Sales Hub", icon: Filter },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare, badgeKey: "overdueTasks" },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/ai-agents", label: "Agentes IA", icon: Bot },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/analytics/inbox", label: "Atendimento", icon: Headphones },
  // /monitor foi absorvido pelo dashboard principal como preset "Monitor"
  // + botão de TV Wall. A rota /monitor ainda existe, mas redireciona
  // para /?preset=monitor — não precisa aparecer na navegação principal.
  { href: "/reports", label: "Relatórios", icon: FileBarChart },
];

const bottomItems: NavItem[] = [
  { href: "/developers", label: "Desenvolvedores", icon: Book },
  { href: "/settings", label: "Configurações", icon: Settings },
];

type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

const STATUS_OPTIONS: { value: AgentOnlineStatus; label: string; icon: ComponentType<{ className?: string }>; dot: string; bg: string }[] = [
  { value: "ONLINE", label: "Online", icon: Wifi, dot: "bg-emerald-500", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
  { value: "AWAY", label: "Ausente", icon: Coffee, dot: "bg-amber-500", bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30" },
  { value: "OFFLINE", label: "Offline", icon: WifiOff, dot: "bg-slate-400", bg: "hover:bg-slate-50 dark:hover:bg-slate-800/30" },
];

const STATUS_DOT_COLOR: Record<AgentOnlineStatus, string> = {
  ONLINE: "#10b981",
  AWAY: "#f59e0b",
  OFFLINE: "#94a3b8",
};

/**
 * Tooltip unificado dos botões da sidebar vertical.
 *
 * Precisa ser usado dentro de um elemento `group` com `position: relative`.
 * Centraliza verticalmente com `top-1/2 -translate-y-1/2` (antes ficava
 * alinhado ao topo do ícone e a seta ao centro do tooltip — o que
 * desalinhava visualmente). Anima com leve deslize da esquerda e tem
 * `delay-100` pra não aparecer em hovers acidentais.
 */
function SidebarRailTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
    >
      {label}
      <span className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-popover" />
    </span>
  );
}

function SidebarIcon({
  href, label, icon: Icon, end, badge,
}: {
  href: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean; badge?: number;
}) {
  const pathname = usePathname();
  const active = end ? pathname === href || pathname === "" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex size-11 items-center justify-center rounded-xl eduit-transition outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        active
          ? "text-primary shadow-lg ring-1 ring-white/20"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white hover:scale-105",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-white/95 dark:bg-white/10"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className="relative size-5" />
      {badge != null && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-md ring-2 ring-sidebar">
          {badge > 99 ? "99" : badge}
        </span>
      )}
      <SidebarRailTooltip label={label} />
    </Link>
  );
}

function StatusPopup({
  open,
  onClose,
  onSelect,
  current,
  voiceCallsEnabled,
  onVoiceCallsChange,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (s: AgentOnlineStatus) => void;
  current: AgentOnlineStatus;
  voiceCallsEnabled: boolean;
  onVoiceCallsChange: (enabled: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" style={{ animation: "fade-in 0.2s ease" }}>
      <div ref={ref} className="w-[360px] rounded-2xl border border-border bg-card p-7 shadow-2xl" style={{ animation: "scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl eduit-gradient shadow-lg">
            <Wifi className="size-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Definir Status</h3>
          <p className="mt-2 text-sm text-muted-foreground">Selecione sua disponibilidade para atendimento</p>
        </div>

        <div className="space-y-2.5">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = current === opt.value;
            return (
              <button key={opt.value} type="button"
                onClick={() => { onSelect(opt.value); onClose(); }}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-xl px-4 py-4 text-left eduit-transition",
                  isActive
                    ? "border-2 border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : "border-2 border-transparent " + opt.bg,
                )}>
                <span className={cn("flex size-3.5 shrink-0 rounded-full shadow-sm", opt.dot)}
                  style={isActive ? { boxShadow: `0 0 0 4px ${STATUS_DOT_COLOR[opt.value]}22` } : undefined} />
                <Icon className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {opt.value === "ONLINE" && "Disponível para receber leads"}
                    {opt.value === "AWAY" && "Pausado — não recebe novos leads"}
                    {opt.value === "OFFLINE" && "Indisponível — fora do expediente"}
                  </p>
                </div>
                {isActive && <Circle className="size-4 fill-primary text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MOBILE NAV (< 768px)
   ─────────────────────────────────────────────────────────────────────
   A sidebar lateral navy (`<aside>` 80px) fica `hidden md:flex` em
   mobile. No lugar entra:
     • <MobileTopBar> — barra superior navy (56px + safe-top) com logo
       + título da página + avatar (abre menu de conta).
     • <MobileBottomNav> — barra inferior navy (60px + safe-bottom) com
       5 ícones touch-friendly (Dashboard, Sales Hub, Inbox, Tarefas,
       Mais). Padrão app-like (Instagram/WhatsApp/iFood).
     • <MobileMoreSheet> — bottom-sheet acionado pelo "Mais" com TODOS
       os itens secundários + status + tema + sair. */

// Os itens da barra inferior agora vem do useMobileLayout() em
// runtime (configurados pelo admin em /settings/mobile-layout).
// MOBILE_PRIMARY foi removido — defaults vivem em src/lib/mobile-layout.ts.

function getPageTitle(pathname: string | null): string {
  if (!pathname || pathname === "/") return "Dashboard";
  // Match contra navItems (canonical) e bottomItems pra cobrir tudo.
  const all: NavItem[] = [...navItems, ...bottomItems];
  for (const item of all) {
    if (item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return "EduIT";
}

function MobileTopBar({
  badges,
  onAvatarClick,
  avatarUrl,
  displayName,
  dotColor,
  agentStatus,
}: {
  badges: Record<string, number>;
  onAvatarClick: () => void;
  avatarUrl: string | null | undefined;
  displayName: string;
  dotColor: string;
  agentStatus: AgentOnlineStatus;
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  void badges;
  return (
    <header className="pt-safe sticky top-0 z-30 flex shrink-0 items-center justify-between bg-brand-navy px-4 pb-3 shadow-md md:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Início"
          className="flex size-9 items-center justify-center rounded-lg bg-white/95 shadow-sm ring-1 ring-white/20"
        >
          <span className="text-base font-black text-gradient">E</span>
        </Link>
        <h1 className="font-outfit text-[16px] font-black tracking-tight text-white">
          {title}
        </h1>
      </div>
      <button
        type="button"
        onClick={onAvatarClick}
        aria-label={`Conta: ${displayName} · ${STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label}`}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Avatar className="size-9 ring-2 ring-white/20 shadow-sm">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="bg-white text-[11px] font-bold text-primary">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[1.5px] border-brand-navy"
          style={{ backgroundColor: dotColor }}
        />
      </button>
    </header>
  );
}

function MobileBottomNav({
  badges,
  onMoreClick,
  moreOpen,
}: {
  badges: Record<string, number>;
  onMoreClick: () => void;
  moreOpen: boolean;
}) {
  const pathname = usePathname();
  const { config } = useMobileLayout();
  // Resolve descriptors a partir dos IDs configurados pelo admin.
  // Filtra IDs que sumiram do catalogo (defesa contra cache antigo).
  const items = config.bottomNav
    .map((id) => MOBILE_MODULE_MAP.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <nav
      className="pb-safe sticky bottom-0 z-30 flex shrink-0 items-stretch border-t border-white/10 bg-brand-navy px-2 pt-1.5 shadow-[0_-8px_30px_-15px_rgba(13,27,62,0.5)] md:hidden"
      aria-label="Navegação principal"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const badgeKey = MOBILE_BADGE_KEYS[item.id];
        const badge = badgeKey ? badges[badgeKey] ?? 0 : 0;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-colors",
              active ? "text-white" : "text-sidebar-muted active:bg-white/5",
            )}
          >
            <span className="relative">
              <MobileModuleIcon
                name={item.iconName}
                className={cn("size-[22px] transition-transform", active && "scale-110")}
                strokeWidth={active ? 2.5 : 2}
              />
              {badge > 0 && (
                <span className="absolute -right-2 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-md ring-2 ring-brand-navy">
                  {badge > 99 ? "99" : badge}
                </span>
              )}
            </span>
            <span className={cn("text-[10px] font-semibold tracking-tight", active ? "text-white" : "text-sidebar-muted")}>
              {item.label}
            </span>
            {active && (
              <span className="absolute -top-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white" />
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMoreClick}
        aria-label="Mais opções"
        aria-expanded={moreOpen}
        className={cn(
          "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-colors",
          moreOpen ? "text-white" : "text-sidebar-muted active:bg-white/5",
        )}
      >
        <MoreHorizontal className={cn("size-[22px]", moreOpen && "scale-110")} strokeWidth={moreOpen ? 2.5 : 2} />
        <span className={cn("text-[10px] font-semibold tracking-tight", moreOpen ? "text-white" : "text-sidebar-muted")}>
          Mais
        </span>
        {moreOpen && (
          <span className="absolute -top-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white" />
        )}
      </button>
    </nav>
  );
}

/* Bottom-sheet com itens secundários, status, tema, conta. */
function MobileMoreSheet({
  open,
  onClose,
  badges,
  agentStatus,
  onStatusClick,
  displayName,
  email,
  avatarUrl,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  badges: Record<string, number>;
  agentStatus: AgentOnlineStatus;
  onStatusClick: () => void;
  displayName: string;
  email: string | null | undefined;
  avatarUrl: string | null | undefined;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { config } = useMobileLayout();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  // Itens secundarios = enabled - bottomNav. Inclui modulos do
  // catalogo que o admin habilitou mas que nao couberam nos 4
  // slots da bottom nav. Mantemos a ordem do `enabled` definido
  // pelo admin pra previsibilidade no Layout Builder.
  const bottomSet = new Set(config.bottomNav);
  const secondaryModules = config.enabled
    .filter((id) => !bottomSet.has(id))
    .map((id) => MOBILE_MODULE_MAP.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const dotColor = STATUS_DOT_COLOR[agentStatus];

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: "fade-in 0.2s ease" }}
      />
      <div
        className="pb-safe absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card shadow-2xl"
        style={{ animation: "slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        {/* Drag handle visual */}
        <div className="sticky top-0 z-10 bg-card pt-2 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header com perfil */}
        <div className="flex items-center gap-3 border-b border-border px-5 pb-4 pt-3">
          <Avatar className="size-12 ring-2 ring-white shadow-sm">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-linear-to-br from-[#fbcfe8] to-[#f9a8d4] text-sm font-black text-white">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-outfit truncate text-sm font-black text-foreground">{displayName}</p>
            {email && <p className="truncate text-[11px] text-muted-foreground">{email}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="touch-target flex items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Status + tema (linha) */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onStatusClick();
            }}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-3 text-left active:bg-muted"
          >
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <p className="text-sm font-bold text-foreground">
                {STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-3 text-left active:bg-muted"
          >
            {isDark ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-indigo-500" />}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tema</p>
              <p className="text-sm font-bold text-foreground">{isDark ? "Claro" : "Escuro"}</p>
            </div>
          </button>
        </div>

        {/* Itens secundários */}
        <div className="px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mais seções</p>
          <div className="grid grid-cols-2 gap-1.5">
            {secondaryModules.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const badgeKey = MOBILE_BADGE_KEYS[item.id];
              const badge = badgeKey ? badges[badgeKey] ?? 0 : 0;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-3 transition-colors active:scale-[0.98]",
                    active ? "border-brand-blue bg-brand-blue/10 text-brand-blue" : "border-border bg-card text-foreground active:bg-muted",
                  )}
                >
                  <MobileModuleIcon
                    name={item.iconName}
                    className="size-4 shrink-0"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className="flex-1 truncate text-sm font-semibold">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {badge > 99 ? "99" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {secondaryModules.length === 0 && (
              <p className="col-span-2 rounded-xl bg-muted/40 px-3 py-4 text-center text-[12px] text-muted-foreground">
                Todos os módulos habilitados estão na barra inferior.
              </p>
            )}
          </div>

          <p className="mt-4 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conta</p>
          <div className="grid grid-cols-1 gap-1.5">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-foreground active:bg-muted"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 text-sm font-semibold">{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/settings/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-foreground active:bg-muted"
            >
              <UserCircle2 className="size-4 shrink-0" />
              <span className="flex-1 text-sm font-semibold">Meu perfil</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-destructive active:bg-destructive/10"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="flex-1 text-left text-sm font-semibold">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-11" />;
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Modo claro" : "Modo escuro";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex size-11 items-center justify-center rounded-xl text-sidebar-muted eduit-transition outline-none hover:bg-sidebar-hover hover:text-white hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/40"
      aria-label={label}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </motion.span>
      </AnimatePresence>
      <SidebarRailTooltip label={label} />
    </button>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const myUserId = (session?.user as { id?: string })?.id;
  const inboxHeightLocked = pathname === "/inbox" || pathname?.startsWith("/inbox/") || pathname === "/sales-hub";

  // Heartbeat global: mantém lastActivityAt atualizado em qualquer rota autenticada.
  // O presence-reaper server-side rebaixa agentes inativos para AWAY/OFFLINE
  // automaticamente com base nesse timestamp.
  usePresenceHeartbeat({ enabled: status === "authenticated" });

  const { data: overdueData } = useQuery({
    queryKey: ["overdue-tasks-count"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/activities/overdue-count"));
      if (!res.ok) return { count: 0 };
      return res.json() as Promise<{ count: number }>;
    },
    refetchInterval: 60_000,
    enabled: status === "authenticated",
  });

  // Perfil completo (avatarUrl, phone, signature…) — a sessão do NextAuth
  // não expõe o avatar, então buscamos via /api/profile. Mesma cache chave
  // usada pela página `/settings/profile` para sincronização automática
  // após salvar (invalidateQueries em ["profile"]).
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/profile"));
      if (!r.ok) return null;
      return r.json() as Promise<{ avatarUrl: string | null } | null>;
    },
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
  const badges: Record<string, number> = { overdueTasks: overdueData?.count ?? 0 };

  const { data: myStatusData } = useQuery<{
    status: AgentOnlineStatus;
    availableForVoiceCalls?: boolean;
  }>({
    queryKey: ["my-agent-status", myUserId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/agents/${myUserId}/status`));
      return r.json();
    },
    enabled: !!myUserId,
    refetchInterval: 60_000,
  });
  const agentStatus: AgentOnlineStatus = myStatusData?.status ?? "OFFLINE";
  const voiceCallsEnabled = myStatusData?.availableForVoiceCalls ?? false;

  const statusMutation = useMutation({
    mutationFn: async (payload: Partial<{ status: AgentOnlineStatus; availableForVoiceCalls: boolean }>) => {
      const r = await fetch(apiUrl(`/api/agents/${myUserId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-agent-status", myUserId] }),
  });

  const [statusPopupOpen, setStatusPopupOpen] = useState(false);
  const [loginPromptShown, setLoginPromptShown] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // Fecha o popover de conta quando o clique sai da árvore do menu.
  // Não usa `pointer-events-none` em overlay (já que é num canto da
  // sidebar) — preferimos detectar via event listener global.
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (status === "authenticated" && myUserId && agentStatus === "OFFLINE" && !loginPromptShown) {
      const timer = setTimeout(() => {
        setStatusPopupOpen(true);
        setLoginPromptShown(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, myUserId, agentStatus, loginPromptShown]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-9 animate-pulse rounded-xl bg-primary/20" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const displayName = user?.name ?? "Usuário";
  const dotColor = STATUS_DOT_COLOR[agentStatus];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-navy md:flex-row">
      {/* TopBar mobile only */}
      <MobileTopBar
        badges={badges}
        onAvatarClick={() => setMobileMoreOpen(true)}
        avatarUrl={profile?.avatarUrl}
        displayName={displayName}
        dotColor={dotColor}
        agentStatus={agentStatus}
      />

      <aside className="hidden w-20 shrink-0 flex-col items-center bg-brand-navy py-4 shadow-xl md:flex">
        <Link
          href="/"
          aria-label="Início"
          className="group relative mb-6 flex size-12 items-center justify-center rounded-xl bg-white/95 shadow-lg ring-1 ring-white/20 eduit-transition hover:scale-105 hover:shadow-xl"
        >
          <span className="text-lg font-black text-gradient">E</span>
          <SidebarRailTooltip label="Início" />
        </Link>

        <nav className="scrollbar-none flex flex-1 flex-col items-center gap-2 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarIcon key={item.href} {...item} badge={item.badgeKey ? badges[item.badgeKey] : undefined} />
          ))}
        </nav>

        <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setStatusPopupOpen(true)}
            className="group relative flex size-11 items-center justify-center rounded-xl text-sidebar-muted eduit-transition outline-none hover:bg-sidebar-hover hover:text-white hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={`Status: ${STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label}`}
          >
            {agentStatus === "ONLINE" ? <Wifi className="size-5" /> : agentStatus === "AWAY" ? <Coffee className="size-5" /> : <WifiOff className="size-5" />}
            <span
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border-2 border-sidebar shadow-sm"
              style={{ backgroundColor: dotColor, boxShadow: agentStatus === "ONLINE" ? `0 0 8px ${dotColor}` : undefined }}
            />
            <SidebarRailTooltip
              label={STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label ?? "Status"}
            />
          </button>

          {bottomItems.map((item) => (
            <SidebarIcon key={item.href} {...item} />
          ))}
          <ThemeToggle />
          {/*
            ── POPOVER DE CONTA ──
            Substitui o tooltip hover antigo por um popover controlado:
            click no avatar → abre card em estilo "Minha conta" (inspirado
            na referência Umbler) com acesso a "Meu perfil" e "Sair".
            O item "Perfil" foi removido do menu /settings/* para não
            duplicar o caminho — este é o ponto único de entrada.
          */}
          <div className="relative mt-2" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label="Abrir menu da conta"
              className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Avatar className="size-11 cursor-pointer ring-2 ring-white/20 shadow-lg eduit-transition group-hover:ring-4 group-hover:ring-white/30">
                {profile?.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-white text-sm font-bold text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute -bottom-0.5 -right-0.5 flex size-3.5 rounded-full border-2 border-sidebar shadow-sm"
                style={{
                  backgroundColor: dotColor,
                  boxShadow:
                    agentStatus === "ONLINE" ? `0 0 6px ${dotColor}` : undefined,
                }}
              />
              {!accountMenuOpen && <SidebarRailTooltip label={displayName} />}
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-0 left-full z-50 ml-4 w-[280px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-premium"
              >
                {/* ── Header do popover ── */}
                <div className="flex flex-col items-center gap-2 px-5 pt-6 pb-4">
                  <Avatar className="size-16 shadow-float ring-4 ring-white">
                    {profile?.avatarUrl ? (
                      <AvatarImage src={profile.avatarUrl} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="bg-linear-to-br from-[#fbcfe8] to-[#f9a8d4] text-base font-black text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-outfit text-sm font-black text-foreground">
                    {displayName}
                  </p>
                  {user?.email && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>

                <div className="border-t border-border/60" />

                {/* ── Itens ── */}
                <nav className="flex flex-col gap-0.5 p-2">
                  <Link
                    href="/settings/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground eduit-transition hover:bg-muted"
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
                      setAccountMenuOpen(false);
                      void signOut({ callbackUrl: "/login" });
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive eduit-transition hover:bg-destructive/10"
                    role="menuitem"
                  >
                    <LogOut className="size-4" />
                    <span className="font-medium">Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Wrapper "Inward Curve": navy aside + main com rounded-tl-[32px]
          deixa o canto superior esquerdo da área de conteúdo cortado em curva
          contra a sidebar escura — assinatura visual EduIT Premium Core.
          shadow-premium no main reforça a separação navy/conteúdo. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-brand-navy">
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col bg-background p-3 sm:p-4 md:rounded-tl-[32px] md:p-8 md:shadow-premium",
            inboxHeightLocked ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          <WhatsAppHealthBanner />
          {children}
        </main>
      </div>

      {/* BottomNav mobile only */}
      <MobileBottomNav
        badges={badges}
        onMoreClick={() => setMobileMoreOpen(true)}
        moreOpen={mobileMoreOpen}
      />

      <MobileMoreSheet
        open={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        badges={badges}
        agentStatus={agentStatus}
        onStatusClick={() => setStatusPopupOpen(true)}
        displayName={displayName}
        email={user?.email}
        avatarUrl={profile?.avatarUrl}
        onLogout={() => void signOut({ callbackUrl: "/login" })}
      />

      <StatusPopup
        open={statusPopupOpen}
        onClose={() => setStatusPopupOpen(false)}
        current={agentStatus}
        onSelect={(s) => statusMutation.mutate({ status: s })}
        voiceCallsEnabled={voiceCallsEnabled}
        onVoiceCallsChange={(enabled) => statusMutation.mutate({ availableForVoiceCalls: enabled })}
      />

      {/* PWA prompts (so renderizam em mobile + condicoes especificas) */}
      <InstallPrompt />
      <PushPermissionPrompt />
      <PushNavigateListener />

      {/* Onboarding: 4 passos no primeiro acesso ao dashboard. */}
      <OnboardingTour />
    </div>
  );
}
