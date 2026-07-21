"use client";

/**
 * Landing do hub /settings — renderiza dentro do painel direito do layout
 * master-detail. NavRailV2 e a sidebar de configurações são providos pelo
 * `settings/layout.tsx`; aqui só entra o conteúdo de boas-vindas.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { IconAdjustments as Settings2 } from "@tabler/icons-react";

import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useUserRole } from "@/hooks/use-user-role";
import { filterSettingsNav, type Viewer } from "@/lib/nav-visibility";
import {
  SETTINGS_NAV,
  SETTINGS_PERSONAL,
  type SettingsNavIcon,
  type SettingsNavItem,
} from "@/lib/settings-nav";

import { SettingsV2Shell } from "./_v2-shell";

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

  const allGroups = useMemo(
    () => filterSettingsNav(SETTINGS_NAV, viewer),
    [viewer],
  );

  return (
    <SettingsV2Shell
      title="Configurações"
      description="Selecione uma seção na lista à esquerda para começar."
      icon={<Settings2 size={22} />}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        {/* Atalhos pessoais em bento */}
        {SETTINGS_PERSONAL.length > 0 && (
          <section aria-labelledby="landing-personal">
            <h2
              id="landing-personal"
              className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Pessoais
            </h2>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {SETTINGS_PERSONAL.map((item) => (
                <PersonalShortcut key={item.id} item={item} pathname={pathname} />
              ))}
            </div>
          </section>
        )}

        {/* Grupos como bento — atalho visual para as seções */}
        {allGroups.length > 0 && (
          <section aria-labelledby="landing-groups">
            <h2
              id="landing-groups"
              className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Workspace
            </h2>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {allGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SettingsV2Shell>
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
      className="flex min-w-0 items-center gap-3 rounded-[var(--radius-xl)] border px-3 py-3 transition-all duration-150 sm:px-4 sm:py-3.5"
      style={{
        borderColor: active
          ? "rgba(91,111,245,0.40)"
          : "var(--glass-border)",
        background: active ? "rgba(91,111,245,0.07)" : "var(--glass-bg-base)",
        boxShadow: "var(--glass-shadow-sm)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] transition-colors"
        style={
          active
            ? {
                background: "var(--color-enterprise-bg)",
                color: "var(--brand-primary)",
              }
            : {
                background: "var(--glass-bg-panel)",
                color: "var(--text-muted)",
              }
        }
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-sm font-semibold"
          style={{
            color: active ? "var(--brand-primary)" : "var(--text-primary)",
          }}
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

/* ── GroupCard ────────────────────────────────────────────────────────── */

function GroupCard({
  group,
}: {
  group: (typeof SETTINGS_NAV)[number];
}) {
  const GroupIcon = group.icon;
  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-sm"
    >
      <header className="flex items-center gap-2.5 border-b border-[var(--glass-border-subtle)] px-3.5 py-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background: "var(--color-enterprise-bg)",
            color: "var(--brand-primary)",
          }}
        >
          <GroupIcon className="size-[16px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-display text-[13.5px] font-bold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {group.label}
          </h3>
          {group.description && (
            <p
              className="mt-0.5 truncate text-[11px] leading-tight"
              style={{ color: "var(--text-muted)" }}
            >
              {group.description}
            </p>
          )}
        </div>
        <span
          className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
          style={{
            background: "var(--glass-border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          {group.items.length}
        </span>
      </header>
      <ul className="flex flex-col divide-y divide-[var(--glass-border-subtle)]">
        {group.items.slice(0, 4).map((item) => (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="block px-3.5 py-2 text-[12.5px] transition-colors hover:bg-[var(--glass-bg-overlay)]"
                style={{ color: "var(--text-primary)" }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="block cursor-not-allowed px-3.5 py-2 text-[12.5px] opacity-60"
                style={{ color: "var(--text-primary)" }}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
        {group.items.length > 4 && (
          <li>
            <span
              className="block px-3.5 py-2 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              +{group.items.length - 4} outras…
            </span>
          </li>
        )}
      </ul>
    </article>
  );
}
