"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2, ChevronRight } from "lucide-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { cn } from "@/lib/utils";
import {
  SETTINGS_NAV,
  SETTINGS_PERSONAL,
  type SettingsNavIcon,
  type SettingsNavItem,
} from "@/lib/settings-nav";

export default function SettingsClientPageV2() {
  const pathname = usePathname();

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] overflow-hidden">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col overflow-hidden">
        {/* Header fixo */}
        <PageHeader
          title="Configurações"
          description="Organize canais, equipe, pipeline e integrações do seu workspace."
          icon={<Settings2 size={22} />}
        />

        {/* Área scrollável */}
        <div className="flex flex-col gap-6 overflow-auto px-6 py-5 pb-8">

          {/* Atalhos pessoais */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SETTINGS_PERSONAL.map((item) => (
              <PersonalShortcut key={item.id} item={item} pathname={pathname} />
            ))}
          </section>

          {/* Grupos de configuração */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SETTINGS_NAV.map((group) => {
              const GroupIcon = group.icon;
              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-sm"
                  aria-labelledby={`group-v2-${group.id}`}
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  {/* Header do grupo */}
                  <header className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)] px-4 py-3">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                      style={{
                        background: "var(--color-enterprise-bg)",
                        color: "var(--brand-primary)",
                      }}
                    >
                      <GroupIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id={`group-v2-${group.id}`}
                        className="text-[13px] font-semibold leading-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {group.label}
                      </h2>
                      {group.description && (
                        <p
                          className="mt-0.5 text-[11px] leading-tight"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {group.description}
                        </p>
                      )}
                    </div>
                  </header>

                  {/* Itens do grupo */}
                  <ul className="divide-y divide-[var(--glass-border-subtle)]">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <SettingsRow item={item} pathname={pathname} />
                      </li>
                    ))}
                  </ul>
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
