"use client";

/**
 * Sidebar mestre da tela de Configurações (layout master-detail).
 *
 * Fonte de dados: `SETTINGS_NAV` + `SETTINGS_PERSONAL` filtrados por
 * permissão via `filterSettingsNav`. Preserva a mesma UX de busca e
 * colapso do hub antigo (`settings/client-page.tsx`), com layout vertical
 * e denso para caber na coluna esquerda do layout.
 *
 * Fica dentro de um card glass — mesmos tokens (`--glass-*`, `--brand-primary`)
 * usados no hub anterior; nenhum estilo novo/inventado.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  IconAdjustments as Settings2,
  IconChevronDown as ChevronDown,
} from "@tabler/icons-react";

import { PageSearchBar } from "@/components/crm/page-toolbar";
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

export function SettingsSidebar() {
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

  const allGroups = useMemo(
    () => filterSettingsNav(SETTINGS_NAV, viewer),
    [viewer],
  );

  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  const matches = (...parts: (string | undefined)[]) =>
    parts.some((p) => p?.toLowerCase().includes(q));

  const personalItems = useMemo(
    () =>
      searching
        ? SETTINGS_PERSONAL.filter((i) => matches(i.label, i.description))
        : SETTINGS_PERSONAL,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searching, q],
  );

  const settingsGroups = useMemo(() => {
    if (!searching) return allGroups;
    return allGroups
      .map((group) => {
        if (matches(group.label, group.description)) return group;
        const items = group.items.filter((it) =>
          matches(it.label, it.description, it.eyebrow),
        );
        return items.length ? { ...group, items } : null;
      })
      .filter((g): g is (typeof allGroups)[number] => g !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGroups, searching, q]);

  const hasResults = personalItems.length > 0 || settingsGroups.length > 0;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <aside
      aria-label="Menu de configurações"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-sm"
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

      {/* Lista rolável */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 [-webkit-overflow-scrolling:touch] sm:px-2.5">
        {/* Atalhos pessoais */}
        {personalItems.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {personalItems.map((item) => (
              <li key={item.id}>
                <SidebarItem item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        )}

        {/* Divisor sutil entre atalhos e grupos */}
        {personalItems.length > 0 && settingsGroups.length > 0 && (
          <div className="my-2 h-px bg-[var(--glass-border-subtle)]" />
        )}

        {/* Grupos */}
        <div className="flex flex-col gap-1">
          {settingsGroups.map((group) => {
            const GroupIcon = group.icon;
            const isCollapsed = !searching && collapsed.has(group.id);
            return (
              <section key={group.id} aria-labelledby={`side-group-${group.id}`}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`side-group-body-${group.id}`}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-overlay)]"
                >
                  <GroupIcon
                    className="size-3.5 shrink-0"
                    // Ícone do grupo em tom muted (a coluna já é estreita).
                    style={{ color: "var(--text-muted)" }}
                  />
                  <span
                    id={`side-group-${group.id}`}
                    className="flex-1 truncate font-display text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group.label}
                  </span>
                  <ChevronDown
                    className="size-3.5 shrink-0 transition-transform duration-200"
                    style={{
                      color: "var(--text-muted)",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                <div
                  id={`side-group-body-${group.id}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <ul className="flex flex-col gap-0.5 pt-0.5">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <SidebarItem item={item} pathname={pathname} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {searching && !hasResults && (
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
  // Match sub-routes: /settings/channels/xyz também ativa "Canais".
  return pathname.startsWith(`${href}/`);
}
