"use client";

import { apiUrl } from "@/lib/api";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Building2, SquareCheck as CheckSquare, Circle, Coffee, FileBarChart, Filter, LayoutDashboard, LogOut, Megaphone, MessageSquare, MoreHorizontal, Moon, Settings, Sun, UserCircle2, Users, Wifi, WifiOff, X, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { UserRole } from "@prisma/client";

import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { useChatTheme } from "@/hooks/use-chat-theme";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { MobileModuleIcon } from "@/components/layout/mobile-module-icon";
import { WhatsAppHealthBanner } from "@/components/layout/whatsapp-health-banner";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PushNavigateListener } from "@/components/pwa/push-navigate-listener";
import { PushPermissionPrompt } from "@/components/pwa/push-permission-prompt";
import { useMobileLayout } from "@/hooks/use-mobile-layout";
import { MOBILE_MODULES, type MobileModuleId } from "@/lib/mobile-layout";
import {
  computeHiddenSidebarRoutesFromAllowList,
  filterItemsByRole,
  SIDEBAR_GRANULAR_EXTRA_HREFS,
  type Viewer,
} from "@/lib/nav-visibility";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  /**
   * Roles que enxergam o item. Ausente = visivel pra todos os roles
   * autenticados. Super-admin bypass (ve tudo). Filtrado no render
   * via `filterItemsByRole` + viewer atual.
   */
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  /**
   * Marca de grupo visual: o item recebe um divisor sutil acima, pra
   * separar blocos (operacional vs. gestão). Afeta só o render, não
   * a semântica.
   */
  groupStart?: boolean;
  /**
   * Sub-itens exibidos em flyout lateral no hover/focus. Quando
   * presente, o item-pai vira um botão guarda-chuva: o `href` aponta
   * para o filho default (primeiro da lista) e o ícone fica `active`
   * sempre que QUALQUER filho estiver na rota atual.
   *
   * Limitação proposital: não suportamos aninhamento N níveis (só 1).
   * Se algum dia precisar de mais, vale repensar a forma da sidebar
   * — flyouts em 2+ níveis viram labirinto sem affordance clara.
   */
  children?: NavItem[];
}

/** Gestao = ADMIN + MANAGER. MEMBER so ve o operacional. */
const GESTAO: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

// Itens ocultos da sidebar mas ainda acessíveis via URL direta:
//  • /analytics (Visão Geral de Performance) — módulo não finalizado;
//    ainda não tem dados reais conectados.
//  • /developers (API Docs) — uso pontual de dev; acessível via
//    /developers ou link no hub de Configurações.
const navItems: NavItem[] = [
  // ─── Operacional ───
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  // "Pipeline" é o rótulo guarda-chuva na sidebar; a página tem 3 modos
  // (kanban="Funil", list="Lista", saleshub="Pipeline Ágil") que aparecem
  // como título dinâmico no header. A página lembra a ÚLTIMA visualização
  // escolhida (`pipeline-view-mode` no localStorage).
  { href: "/pipeline", label: "Pipeline", icon: Filter, requiredPermission: "pipeline:view" },
  { href: "/contacts", label: "Contatos", icon: Users, requiredPermission: "contact:view" },
  { href: "/companies", label: "Empresas", icon: Building2, requiredPermission: "company:view" },
  { href: "/inbox", label: "Inbox", icon: MessageSquare, requiredPermission: "conversation:view" },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare, badgeKey: "overdueTasks", requiredPermission: "task:view" },

  // ─── Gestão (ADMIN + MANAGER) ───
  // "Automação" agrupa Fluxos (/automations) + Agentes IA (/ai-agents)
  // num flyout lateral — economiza um slot vertical na sidebar e
  // reflete a relação semântica (ambos automatizam atendimento).
  // O href do pai aponta pro primeiro filho como rota default; o
  // active state se propaga quando qualquer filho está ativo.
  {
    href: "/automations",
    label: "Automação",
    icon: Zap,
    allowedRoles: GESTAO,
    requiredPermission: "automation:view",
    groupStart: true,
    children: [
      { href: "/automations", label: "Fluxos", icon: Zap, allowedRoles: GESTAO, requiredPermission: "automation:view" },
      { href: "/ai-agents", label: "Agentes IA", icon: Bot, allowedRoles: GESTAO, requiredPermission: "ai_agent:view" },
    ],
  },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone, allowedRoles: GESTAO, requiredPermission: "campaign:view" },
  { href: "/reports", label: "Relatórios", icon: FileBarChart, allowedRoles: GESTAO, requiredPermission: "report:view" },
];

const bottomItems: NavItem[] = [
  { href: "/settings", label: "Configurações", icon: Settings, requiredPermission: "settings:team" },
];

/** Hrefs considerados no allow list granular da sidebar (nav + bottom + extras). */
export function getSidebarAllowlistTrackedHrefs(): string[] {
  return [
    ...navItems.flatMap((n) => [n.href, ...(n.children?.map((c) => c.href) ?? [])]),
    ...bottomItems.map((n) => n.href),
    ...SIDEBAR_GRANULAR_EXTRA_HREFS,
  ];
}

type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

const STATUS_OPTIONS: { value: AgentOnlineStatus; label: string; icon: ComponentType<{ className?: string }>; dot: string; bg: string }[] = [
  { value: "ONLINE", label: "Online", icon: Wifi, dot: "bg-emerald-500", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
  { value: "AWAY", label: "Ausente", icon: Coffee, dot: "bg-amber-500", bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30" },
  { value: "OFFLINE", label: "Offline", icon: WifiOff, dot: "bg-slate-400", bg: "hover:bg-[var(--color-bg-subtle)] dark:hover:bg-slate-800/30" },
];

const STATUS_DOT_COLOR: Record<AgentOnlineStatus, string> = {
  ONLINE: "#10b981",
  AWAY: "#f59e0b",
  OFFLINE: "#94a3b8",
};

/** Tooltip da rail lateral via Radix Portal — não corta em overflow nem perde z-index. */
function SidebarRailTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={12} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
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
    <SidebarRailTooltip label={label}>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex size-10 items-center justify-center rounded-lg lumen-transition outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
          active
            ? "bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-fg)] font-semibold shadow-[var(--shadow-sm)]"
            : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-foreground",
        )}
      >
        <Icon className="relative size-[18px]" />
        {badge != null && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm ring-2 ring-sidebar">
            {badge > 99 ? "99" : badge}
          </span>
        )}
      </Link>
    </SidebarRailTooltip>
  );
}

/**
 * Item-pai que abre um flyout lateral com sub-itens no hover/focus.
 *
 * Decisão (CSS-only via group-hover/focus-within):
 *   Não usamos state React pra abrir/fechar — a abertura responde a
 *   `:hover` e `:focus-within` no container `group`. O label da rail
 *   lateral usa Radix Tooltip (Portal); o flyout permanece CSS-only.
 *   Vantagens:
 *     • Zero risco de "estado preso" se o componente desmontar mid-hover.
 *     • Acessível via teclado (Tab entra no link-pai → focus-within no
 *       container abre o flyout → Shift+Tab sai e fecha).
 *     • Esc fecha automaticamente se o foco sair (o navegador move o
 *       focus pro body).
 *
 * Active propagado: o ícone-pai herda o estado active de qualquer filho
 * que case com a rota atual — preserva a "memória visual" do agrupamento.
 *
 * Click no ícone-pai navega para o `href` default (primeiro filho ou
 * fallback) — mantém o comportamento dos outros itens da sidebar.
 */
function SidebarParentIcon({
  href,
  label,
  icon: Icon,
  items,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const isChildActive = items.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
  );
  const active = pathname === href || pathname.startsWith(`${href}/`) || isChildActive;

  return (
    <div className="group relative">
      <Link
        href={href}
        aria-label={label}
        aria-haspopup="menu"
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex size-10 items-center justify-center rounded-lg lumen-transition outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
          active
            ? "bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-fg)] font-semibold shadow-[var(--shadow-sm)]"
            : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-foreground",
        )}
      >
        <Icon className="relative size-[18px]" />
        {/* Indicador visual sutil de que o item tem submenu — ponto
            no canto inferior direito. Só aparece quando o item NÃO
            está active (pra não competir com o highlight branco). */}
        {!active && (
          <span
            aria-hidden="true"
            className="absolute bottom-1 right-1 size-1 rounded-full bg-white/30"
          />
        )}
      </Link>

      {/* Flyout — anchor wrapper.
          O wrapper externo permanece SEMPRE com pointer-events-auto e
          é descendente do `.group`. Isso resolve o "gap de morte" que
          ocorre quando o cursor sai do ícone e atravessa o pl-3 antes
          de chegar no menu: como o wrapper captura hit-testing, o
          `.group:hover` continua ativo durante a travessia.
          Apenas a opacity/translate do menu interno é animada. */}
      <div
        aria-hidden={!active ? undefined : true}
        className="absolute left-full top-1/2 z-50 -translate-y-1/2 pl-3"
      >
        <div
          role="menu"
          aria-label={`${label} — submenu`}
          className="pointer-events-none min-w-[200px] -translate-x-1 overflow-hidden rounded-xl border border-border bg-popover py-1 text-popover-foreground opacity-0 shadow-2xl transition-[opacity,transform] duration-150 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100"
        >
          <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {items.map((child) => {
            const ChildIcon = child.icon;
            const childActive =
              pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <Link
                key={child.href}
                href={child.href}
                role="menuitem"
                aria-current={childActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm lumen-transition outline-none focus-visible:bg-muted",
                  childActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <ChildIcon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
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
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl lumen-gradient shadow-lg">
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
                  "flex w-full items-center gap-3.5 rounded-xl px-4 py-4 text-left lumen-transition",
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

/**
 * Tipo mínimo consumido pela UI da sidebar. O endpoint /api/organization
 * devolve mais campos, mas pra renderizar o logo só precisamos disso.
 */
type OrgBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
};

/**
 * Renderiza a logo da organização no topo da sidebar.
 *
 * Três estados, em ordem de preferência:
 *   1. `logoUrl` salvo no onboarding → renderiza a imagem.
 *   2. `name` disponível → renderiza iniciais (ex: "DW" pra DNA Work)
 *      com gradiente EduIT no fallback.
 *   3. Sem dados ainda (carregando / não autenticado) → "E" (marca
 *      EduIT padrão) — mesmo comportamento antigo.
 *
 * Usa `size` pra reaproveitar no desktop (48px) e mobile (36px).
 */
function OrgLogo({
  org,
  size,
  textSize,
}: {
  org: OrgBranding | null;
  size: "sm" | "lg";
  textSize: string;
}) {
  // lg compactado de size-12 (48px) -> size-10 (40px) pra alinhar com a
  // densidade reduzida da sidebar (size-10 nos botoes) e ganhar
  // ~8px de altura no cabecalho da nav.
  const dimClass = size === "lg" ? "size-10" : "size-9";

  if (org?.logoUrl) {
    return (
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-white/20",
          dimClass,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- logo vem como data: URL (base64) ou URL externa; next/image não cabe. */}
        <img
          src={org.logoUrl}
          alt={org.name}
          className="h-full w-full object-contain p-1"
        />
      </span>
    );
  }

  if (org?.name) {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-white/20",
          dimClass,
        )}
      >
        <span className={cn("font-bold text-gradient", textSize)}>
          {getInitials(org.name)}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-white/20",
        dimClass,
      )}
    >
      <span className={cn("font-bold text-gradient", textSize)}>E</span>
    </span>
  );
}

function getPageTitle(pathname: string | null): string {
  if (!pathname || pathname === "/" || pathname === "/dashboard") return "Dashboard";
  // Match contra navItems (canonical) e bottomItems pra cobrir tudo.
  // Children têm prioridade sobre o pai — quando estamos em /ai-agents
  // queremos o título "Agentes IA", não "Automação".
  const all: NavItem[] = [...navItems, ...bottomItems];
  const flat = all.flatMap((item) => (item.children ? [...item.children, item] : [item]));
  for (const item of flat) {
    if (item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return "EduIT";
}

function MobileTopBar({
  badges,
  onAvatarClick,
  userId,
  avatarUrl,
  displayName,
  dotColor,
  agentStatus,
  org,
}: {
  badges: Record<string, number>;
  onAvatarClick: () => void;
  userId: string;
  avatarUrl: string | null | undefined;
  displayName: string;
  dotColor: string;
  agentStatus: AgentOnlineStatus;
  org: OrgBranding | null;
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  void badges;
  return (
    <header className="pt-safe sticky top-0 z-30 flex shrink-0 items-center justify-between bg-sidebar border-b border-sidebar-border px-4 pb-3 shadow-[var(--shadow-sm)] md:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          aria-label={org?.name ?? "Início"}
          className="flex shrink-0"
        >
          <OrgLogo org={org} size="sm" textSize="text-base" />
        </Link>
        <h1 className="font-display truncate text-[16px] font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      <button
        type="button"
        onClick={onAvatarClick}
        aria-label={`Conta: ${displayName} · ${STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label}`}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
      >
        <ChatAvatar
          user={{ id: userId, name: displayName, imageUrl: avatarUrl ?? null }}
          size={32}
          channel={null}
          hideCartoon
          className="ring-1 ring-border shadow-[var(--shadow-sm)]"
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[1.5px] border-sidebar"
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
      className="pb-safe sticky bottom-0 z-30 flex shrink-0 items-stretch border-t border-sidebar-border bg-sidebar px-2 pt-1.5 shadow-[0_-4px_16px_-4px_rgba(31,35,41,0.08)] md:hidden"
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
              active ? "text-primary" : "text-[var(--color-sidebar-muted)] active:bg-[var(--color-sidebar-hover)]",
            )}
          >
            <span className="relative">
              <MobileModuleIcon
                name={item.iconName}
                className={cn("size-[22px] transition-transform", active && "scale-110")}
                strokeWidth={active ? 2.5 : 2}
              />
              {badge > 0 && (
                <span className="absolute -right-2 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-md ring-2 ring-sidebar">
                  {badge > 99 ? "99" : badge}
                </span>
              )}
            </span>
            <span className={cn("text-[10px] font-semibold tracking-tight", active ? "text-primary" : "text-[var(--color-sidebar-muted)]")}>
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
  userId,
  displayName,
  email,
  avatarUrl,
  onLogout,
  visibleBottomItems,
}: {
  open: boolean;
  onClose: () => void;
  badges: Record<string, number>;
  agentStatus: AgentOnlineStatus;
  onStatusClick: () => void;
  userId: string;
  displayName: string;
  email: string | null | undefined;
  avatarUrl: string | null | undefined;
  onLogout: () => void;
  visibleBottomItems: NavItem[];
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
          <ChatAvatar
            user={{ id: userId, name: displayName, imageUrl: avatarUrl ?? null }}
            size={32}
            channel={null}
            hideCartoon
            className="shadow-[var(--shadow-sm)]"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-sm font-bold text-foreground">{displayName}</p>
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
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground active:bg-muted",
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
            {visibleBottomItems.map((item) => {
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
    <SidebarRailTooltip label={label}>
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative flex size-10 items-center justify-center rounded-lg text-sidebar-muted lumen-transition outline-none hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-primary/25"
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
            {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </SidebarRailTooltip>
  );
}

/** Evita reabrir o modal de status a cada refresh (F5) na mesma aba. */
const AGENT_STATUS_AUTO_PROMPT_SESSION_KEY = "crm:agent-status-auto-prompt";

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
  useChatTheme();

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

  // Branding da org (logo + nome) — vem do /api/organization e é
  // consumido pelo <OrgLogo> no topo da sidebar (desktop + mobile).
  // Invalidamos essa chave no hub de Configurações > Branding quando
  // o admin trocar a logo (via mutation.onSuccess(invalidate(["organization"]))).
  const { data: organization } = useQuery<OrgBranding | null>({
    queryKey: ["organization"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/organization"));
      if (!r.ok) return null;
      const json = (await r.json()) as OrgBranding | null;
      return json;
    },
    enabled: status === "authenticated",
    staleTime: 5 * 60_000,
  });
  const orgBranding: OrgBranding | null = organization ?? null;
  const badges: Record<string, number> = { overdueTasks: overdueData?.count ?? 0 };
  const { data: permissionsPanel } = useQuery<{
    permissionKeys: string[];
    role: UserRole | null;
    scopeGrants?: {
      sidebar?: { routes?: Partial<Record<"ADMIN" | "MANAGER" | "MEMBER", string[]>> };
    };
  }>({
    queryKey: ["settings-permissions-panel"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/settings/permissions"));
      if (!r.ok) return { permissionKeys: [], role: null };
      return r.json();
    },
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
  const roleFromSession = (session?.user as { role?: UserRole } | undefined)?.role ?? null;
  const sidebarAllowList =
    roleFromSession
      ? permissionsPanel?.scopeGrants?.sidebar?.routes?.[roleFromSession]
      : undefined;
  const hiddenRoutes = computeHiddenSidebarRoutesFromAllowList(
    getSidebarAllowlistTrackedHrefs(),
    sidebarAllowList,
  );

  // Visibilidade por role — filtra navItems/bottomItems antes do render.
  // Super-admin EduIT sempre ve tudo (bypass em filterItemsByRole).
  const viewer: Viewer = {
    role: roleFromSession,
    isSuperAdmin: Boolean(
      (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin,
    ),
    permissions: permissionsPanel?.permissionKeys ?? [],
    hiddenRoutes,
  };
  const visibleNavItems = filterItemsByRole(navItems, viewer);
  const visibleBottomItems = filterItemsByRole(bottomItems, viewer);

  const { data: myStatusData, isSuccess: myAgentStatusLoaded } = useQuery<{
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
  /** Só confiar em OFFLINE depois da API — evita modal full-screen “preso” no loading inicial. */
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
    if (status !== "authenticated" || !myUserId || !myAgentStatusLoaded) return;
    if (myStatusData?.status !== "OFFLINE") return;
    try {
      if (sessionStorage.getItem(AGENT_STATUS_AUTO_PROMPT_SESSION_KEY)) return;
    } catch {
      /* noop */
    }
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(AGENT_STATUS_AUTO_PROMPT_SESSION_KEY, "1");
      } catch {
        /* noop */
      }
      setStatusPopupOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, myUserId, myAgentStatusLoaded, myStatusData?.status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-pulse rounded-xl bg-primary/20" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const displayName = user?.name ?? "Usuário";
  const dotColor = STATUS_DOT_COLOR[agentStatus];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-subtle md:flex-row">
      <style>{`
        .kanban-scroll::-webkit-scrollbar { width: 3px; }
        .kanban-scroll::-webkit-scrollbar-track { background: transparent; }
        .kanban-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 99px; transition: background-color 0.2s; }
        .kanban-scroll:hover::-webkit-scrollbar-thumb { background-color: #d4d4d8; }
        .kanban-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; transition: scrollbar-color 0.2s; }
        .kanban-scroll:hover { scrollbar-color: #d4d4d8 transparent; }
      `}</style>
      {/* TopBar mobile only */}
      <MobileTopBar
        badges={badges}
        onAvatarClick={() => setMobileMoreOpen(true)}
        userId={myUserId ?? ""}
        avatarUrl={profile?.avatarUrl}
        displayName={displayName}
        dotColor={dotColor}
        agentStatus={agentStatus}
        org={orgBranding}
      />

      {/* Sidebar compactada: w-16 (era w-20), py-3 (era py-4), gap-1
          (era gap-1.5) e icones size-10 (era size-11). Reduz altura
          total ~120px e largura ~16px — chega a caber 13 itens em
          viewports de ~720-768px sem scroll, que era a queixa
          principal. */}
      <aside className="hidden w-16 shrink-0 flex-col items-center bg-sidebar border-r border-sidebar-border py-3 shadow-[var(--shadow-sm)] md:flex">
        <SidebarRailTooltip label={orgBranding?.name ?? "Início"}>
          <Link
            href="/dashboard"
            aria-label={orgBranding?.name ?? "Início"}
            className="relative mb-4 flex lumen-transition hover:scale-105"
          >
            <OrgLogo org={orgBranding} size="lg" textSize="text-base" />
          </Link>
        </SidebarRailTooltip>

        <nav
          className="scrollbar-none flex flex-1 flex-col items-center gap-1 overflow-y-auto py-0.5"
          aria-label="Navegação principal"
        >
          {visibleNavItems.map((item) => {
            // Filtra children por role aqui também — defesa em
            // profundidade: se um filho exigir role mais alto que o
            // pai, não vaza no flyout.
            const visibleChildren = item.children
              ? filterItemsByRole(item.children, viewer)
              : undefined;
            return (
              <div key={item.href} className="flex w-full flex-col items-center">
                {/* Divisor visual sutil entre blocos (operacional ↔ gestão). */}
                {item.groupStart && (
                  <span
                    aria-hidden="true"
                    className="my-1 h-px w-6 rounded-full bg-[var(--color-sidebar-active-bg)]"
                  />
                )}
                {visibleChildren && visibleChildren.length > 0 ? (
                  <SidebarParentIcon
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    items={visibleChildren}
                  />
                ) : (
                  <SidebarIcon
                    {...item}
                    badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                  />
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-1 border-t border-border pt-2">
          <SidebarRailTooltip
            label={STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label ?? "Status"}
          >
            <button
              type="button"
              onClick={() => setStatusPopupOpen(true)}
              className="relative flex size-10 items-center justify-center rounded-lg text-sidebar-muted lumen-transition outline-none hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-primary/25"
              aria-label={`Status: ${STATUS_OPTIONS.find((o) => o.value === agentStatus)?.label}`}
            >
              {agentStatus === "ONLINE" ? <Wifi className="size-[18px]" /> : agentStatus === "AWAY" ? <Coffee className="size-[18px]" /> : <WifiOff className="size-[18px]" />}
              <span
                className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full border-2 border-sidebar shadow-[var(--shadow-sm)]"
                style={{ backgroundColor: dotColor, boxShadow: agentStatus === "ONLINE" ? `0 0 6px ${dotColor}` : undefined }}
              />
            </button>
          </SidebarRailTooltip>

          {visibleBottomItems.map((item) => (
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
          <div className="relative mt-1" ref={accountMenuRef}>
            <SidebarRailTooltip label={displayName}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-label="Abrir menu da conta"
                className="relative block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
              >
                <ChatAvatar
                  user={{
                    id: myUserId ?? displayName,
                    name: displayName,
                    imageUrl: profile?.avatarUrl ?? null,
                  }}
                  size={32}
                  channel={null}
                  hideCartoon
                  className="cursor-pointer shadow-lg ring-1 ring-border lumen-transition hover:ring-4 hover:ring-primary/25"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex size-3 rounded-full border-2 border-sidebar shadow-[var(--shadow-sm)]"
                  style={{
                    backgroundColor: dotColor,
                    boxShadow:
                      agentStatus === "ONLINE" ? `0 0 6px ${dotColor}` : undefined,
                  }}
                />
              </button>
            </SidebarRailTooltip>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-0 left-full z-50 ml-4 w-[280px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-lg)]"
              >
                {/* ── Header do popover ── */}
                <div className="flex flex-col items-center gap-2 px-5 pt-6 pb-4">
                  <ChatAvatar
                    user={{
                      id: myUserId ?? displayName,
                      name: displayName,
                      imageUrl: profile?.avatarUrl ?? null,
                    }}
                    size={32}
                    channel={null}
                    hideCartoon
                    className="shadow-[var(--shadow-sm)] ring-4 ring-white"
                  />
                  <p className="font-display text-sm font-bold text-foreground">
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
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground lumen-transition hover:bg-muted"
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
                      try {
                        sessionStorage.removeItem(AGENT_STATUS_AUTO_PROMPT_SESSION_KEY);
                      } catch {
                        /* noop */
                      }
                      void signOut({ callbackUrl: "/login" });
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive lumen-transition hover:bg-destructive/10"
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
          shadow-[var(--shadow-lg)] no main reforça a separação navy/conteúdo. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col bg-background md:rounded-tl-[32px] md:shadow-[var(--shadow-lg)]",
            inboxHeightLocked
              ? "overflow-hidden px-3 pb-0 pt-3 sm:px-4 sm:pb-0 sm:pt-4 md:px-8 md:pb-0 md:pt-8"
              : "overflow-y-auto p-3 sm:p-4 md:p-8",
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
        userId={myUserId ?? ""}
        displayName={displayName}
        email={user?.email}
        avatarUrl={profile?.avatarUrl}
        onLogout={() => {
          try {
            sessionStorage.removeItem(AGENT_STATUS_AUTO_PROMPT_SESSION_KEY);
          } catch {
            /* noop */
          }
          void signOut({ callbackUrl: "/login" });
        }}
        visibleBottomItems={visibleBottomItems}
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
