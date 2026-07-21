"use client";

/**
 * Sidebar mestre da tela de Configurações (layout master-detail).
 *
 * Fonte de dados: `SETTINGS_NAV` + `SETTINGS_PERSONAL` filtrados por
 * permissão via `filterSettingsNav`. Itens são achatados numa única lista
 * ordenada alfabeticamente — sem cabeçalhos de grupo, mais limpo.
 *
 * A sidebar é retrátil: o botão do header dispara `onClose`, e o layout
 * cuida da animação de largura via grid-template-columns. Este componente
 * também aplica translate/opacity próprios para casar com o movimento.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  IconAdjustments as Settings2,
  IconLayoutSidebarLeftCollapse,
} from "@tabler/icons-react";

import { PageSearchBar } from "@/components/crm/page-toolbar";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";
import { filterSettingsNav, type Viewer } from "@/lib/nav-visibility";
import {
  SETTINGS_NAV,
  SETTINGS_PERSONAL,
  type SettingsNavIcon,
  type SettingsNavItem,
} from "@/lib/settings-nav";

interface SettingsSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Oculta o botão de recolher (ex.: no hub mobile, onde não há o que recolher). */
  hideCollapse?: boolean;
}

export function SettingsSidebar({
  open,
  onClose,
  hideCollapse,
}: SettingsSidebarProps) {
  const pathname = usePathname();
  const { role, isSuperAdmin } = useUserRole();
  const { data: myPerms } = useMyPermissions();

  const viewer: Viewer = useMemo(
    () => ({
      role: role ?? undefined,
      isSuperAdmin,
      permissions: myPerms?.permissions ?? [],
    }),
    [role, isSuperAdmin, myPerms?.permissions],
  );

  // Achata todos os itens (pessoais + grupos, filtrados por permissão) numa
  // única lista alfabética. Sem cabeçalhos de grupo — layout mais limpo.
  const flatItems = useMemo(() => {
    const fromGroups = filterSettingsNav(SETTINGS_NAV, viewer).flatMap(
      (g) => g.items,
    );
    const all = [...SETTINGS_PERSONAL, ...fromGroups];
    // Ordena por label em pt-BR (ignora acentos/caixa).
    return all.sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
    );
  }, [viewer]);

  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  const items = useMemo(() => {
    if (!searching) return flatItems;
    return flatItems.filter((it) =>
      [it.label, it.description, it.eyebrow].some((p) =>
        p?.toLowerCase().includes(q),
      ),
    );
  }, [flatItems, searching, q]);

  return (
    <aside
      aria-label="Menu de configurações"
      aria-hidden={!open}
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-sm",
        "transition-[transform,opacity] duration-300 ease-out",
        open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
      )}
    >
      {/* Header do card */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-3 sm:px-4">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background: "var(--color-enterprise-bg)",
            color: "var(--brand-primary)",
          }}
        >
          <Settings2 className="size-[18px]" />
        </span>
        <h2
          className="flex-1 truncate font-display text-[15px] font-bold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Configurações
        </h2>
        {!hideCollapse && (
          <TooltipGlass label="Recolher menu" side="bottom">
            <button
              type="button"
              onClick={onClose}
              aria-label="Recolher menu de configurações"
              className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
            >
              <IconLayoutSidebarLeftCollapse size={16} />
            </button>
          </TooltipGlass>
        )}
      </div>

      {/* Busca */}
      <div className="shrink-0 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 sm:px-4">
        <PageSearchBar
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder="Buscar…"
          aria-label="Buscar em configurações"
        />
      </div>

      {/* Lista rolável — flat + alfabética */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 [-webkit-overflow-scrolling:touch] sm:px-2.5">
        {items.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <SidebarItem item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--glass-border)] px-3 py-4 text-center">
            <p
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Nenhum resultado
            </p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Tente outro termo.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── SidebarItem ─────────────────────────────────────────────────────── */

function SidebarItem({
  item,
  pathname,
}: {
  item: SettingsNavItem;
  pathname: string;
}) {
  const Icon: SettingsNavIcon = item.icon;
  const active = !!item.href && isRouteActive(pathname, item.href);

  const body = (
    <span
      className={cn(
        "group/item flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors duration-150",
        active
          ? "bg-[rgba(91,111,245,0.08)]"
          : item.href
            ? "hover:bg-[var(--glass-bg-overlay)]"
            : "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
        style={
          active
            ? {
                background: "var(--color-enterprise-bg)",
                color: "var(--brand-primary)",
              }
            : { color: "var(--text-muted)" }
        }
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className="block truncate text-[12.5px] font-medium leading-tight"
            style={{
              color: active
                ? "var(--brand-primary)"
                : "var(--text-primary)",
            }}
          >
            {item.label}
          </span>
          {item.eyebrow && (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide"
              style={{
                background: "var(--color-enterprise-bg)",
                color: "var(--brand-primary)",
                border: "1px solid rgba(91,111,245,0.25)",
              }}
            >
              {item.eyebrow}
            </span>
          )}
        </span>
      </span>
    </span>
  );

  if (!item.href) return <span className="block">{body}</span>;

  const isExternal =
    item.href.startsWith("http") || item.href.startsWith("mailto:");

  if (isExternal)
    return (
      <a href={item.href} className="block" target="_blank" rel="noreferrer">
        {body}
      </a>
    );

  return (
    <Link href={item.href} className="block">
      {body}
    </Link>
  );
}

function isRouteActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
