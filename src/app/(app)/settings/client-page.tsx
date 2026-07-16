"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { IconAdjustments as Settings2, IconChevronRight as ChevronRight, IconChevronDown as ChevronDown, IconSelector as ChevronsDownUp, IconSelector as ChevronsUpDown } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
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

export default function SettingsClientPageV2() {
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

  const settingsGroups = useMemo(
    () => filterSettingsNav(SETTINGS_NAV, viewer),
    [viewer],
  );

  // Estado de colapso por seção (apenas visual — não altera rotas/dados).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const allIds = settingsGroups.map((g) => g.id);
  const allCollapsed = collapsed.size >= allIds.length;

  const toggleGroup = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(allIds));

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        {/* Header fixo */}
        <PageHeader
          title="Configurações"
          description="Organize canais, equipe, pipeline e integrações do seu workspace."
          icon={<Settings2 size={22} />}
        />

        {/* Área scrollável */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto pb-8 pr-2">

          {/* Atalhos pessoais */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SETTINGS_PERSONAL.map((item) => (
              <PersonalShortcut key={item.id} item={item} pathname={pathname} />
            ))}
          </section>

          {/* Barra de seções + ação de expandir/recolher tudo */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-1 rounded-full"
                style={{ background: "var(--brand-primary)" }}
              />
              <h2
                className="font-display text-[13px] font-bold uppercase tracking-[0.08em]"
                style={{ color: "var(--text-muted)" }}
              >
                Seções
              </h2>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150"
              style={{
                borderColor: "var(--glass-border)",
                background: "var(--glass-bg-base)",
                color: "var(--text-muted)",
              }}
            >
              {allCollapsed ? (
                <ChevronsUpDown size={13} />
              ) : (
                <ChevronsDownUp size={13} />
              )}
              {allCollapsed ? "Expandir tudo" : "Recolher tudo"}
            </button>
          </div>

          {/* Grupos de configuração */}
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {settingsGroups.map((group) => {
              const GroupIcon = group.icon;
              const isCollapsed = collapsed.has(group.id);
              return (
                <section
                  key={group.id}
                  className={cn(
                    "group/section overflow-hidden rounded-[var(--radius-xl)] border bg-[var(--glass-bg-base)] backdrop-blur-sm transition-[border-color,box-shadow] duration-200",
                    isCollapsed
                      ? "border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]"
                      : "border-[rgba(91,111,245,0.30)] shadow-[var(--shadow-indigo-glow)]",
                  )}
                  aria-labelledby={`group-v2-${group.id}`}
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  {/* Header do grupo — clicável para colapsar. Destaque por
                      fundo tintado de marca (design system) quando aberto. */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`group-body-${group.id}`}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3.5 text-left transition-colors duration-200",
                      isCollapsed
                        ? "bg-[var(--glass-bg-panel)] hover:bg-[var(--glass-bg-strong)]"
                        : "bg-[var(--color-enterprise-bg)] hover:brightness-[1.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-all duration-200 group-hover/section:scale-105",
                        !isCollapsed && "shadow-[var(--shadow-indigo-glow)]",
                      )}
                      style={
                        isCollapsed
                          ? { background: "var(--color-enterprise-bg)", color: "var(--brand-primary)" }
                          : { background: "var(--brand-primary)", color: "#fff" }
                      }
                    >
                      <GroupIcon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          id={`group-v2-${group.id}`}
                          className="truncate font-display text-base font-bold leading-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {group.label}
                        </h3>
                        <span
                          className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                          style={{
                            background: "var(--glass-border-subtle)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {group.items.length}
                        </span>
                      </div>
                      {group.description && (
                        <p
                          className="mt-0.5 truncate text-[11px] leading-tight"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {group.description}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className="shrink-0 transition-transform duration-300"
                      style={{
                        color: "var(--text-muted)",
                        transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {/* Itens do grupo — colapsável com animação de altura */}
                  <div
                    id={`group-body-${group.id}`}
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <ul className="divide-y divide-[var(--glass-border-subtle)]">
                        {group.items.map((item) => (
                          <li key={item.id}>
                            <SettingsRow item={item} pathname={pathname} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── SettingsRow ──────────────────────────────────────────────────────── */

function SettingsRow({
  item,
  pathname,
}: {
  item: SettingsNavItem;
  pathname: string;
}) {
  const Icon: SettingsNavIcon = item.icon;
  const active =
    item.href
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : false;

  const body = (
    <span
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-2.5 transition-colors duration-150",
        active
          ? "bg-[rgba(91,111,245,0.08)]"
          : item.href
          ? "hover:bg-[var(--glass-bg-overlay)]"
          : "cursor-not-allowed opacity-50",
      )}
    >
      {/* Ícone */}
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150"
        style={
          active
            ? { background: "var(--color-enterprise-bg)", color: "var(--brand-primary)" }
            : { background: "var(--glass-border-subtle)", color: "var(--text-muted)" }
        }
      >
        <Icon className="size-3.5" />
      </span>

      {/* Texto */}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className="block truncate text-[13px] font-medium"
            style={{ color: active ? "var(--brand-primary)" : "var(--text-primary)" }}
          >
            {item.label}
          </span>
          {item.eyebrow && (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
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
        {item.description && (
          <span
            className="mt-px block truncate text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            {item.description}
          </span>
        )}
      </span>

      {/* Chevron */}
      {item.href && (
        <ChevronRight
          size={14}
          className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-40"
          style={{ color: "var(--text-muted)" }}
        />
      )}
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

/* ── PersonalShortcut ─────────────────────────────────────────────────── */

function PersonalShortcut({
  item,
  pathname,
}: {
  item: SettingsNavItem;
  pathname: string;
}) {
  const Icon: SettingsNavIcon = item.icon;
  const active =
    item.href
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : false;
  const isExternal =
    item.href?.startsWith("http") || item.href?.startsWith("mailto:");

  const body = (
    <span
      className="flex items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3.5 transition-all duration-150"
      style={{
        borderColor: active
          ? "rgba(91,111,245,0.40)"
          : "var(--glass-border)",
        background: active
          ? "rgba(91,111,245,0.07)"
          : "var(--glass-bg-base)",
        boxShadow: "var(--glass-shadow-sm)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] transition-colors duration-150"
        style={
          active
            ? { background: "var(--color-enterprise-bg)", color: "var(--brand-primary)" }
            : { background: "var(--glass-bg-panel)", color: "var(--text-muted)" }
        }
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-sm font-semibold"
          style={{ color: active ? "var(--brand-primary)" : "var(--text-primary)" }}
        >
          {item.label}
        </span>
        {item.description && (
          <span
            className="mt-0.5 block truncate text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            {item.description}
          </span>
        )}
      </span>
    </span>
  );

  if (!item.href) return <span className="opacity-60">{body}</span>;
  if (isExternal)
    return (
      <a href={item.href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  return <Link href={item.href}>{body}</Link>;
}
