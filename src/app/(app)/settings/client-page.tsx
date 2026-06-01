"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2 } from "lucide-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { cn } from "@/lib/utils";
import { SETTINGS_NAV, SETTINGS_PERSONAL, type SettingsNavIcon, type SettingsNavItem } from "@/lib/settings-nav";

/**
 * Hub de Configurações da v2 — exibe todos os grupos/itens como ADMIN
 * (sem filtragem de role), pois em preview o usuário mockado é admin.
 *
 * A estrutura de grupos/itens vem de `SETTINGS_NAV` (fonte única).
 * Para adicionar um novo item, edite `src/lib/settings-nav.ts`.
 */
export default function SettingsClientPageV2() {
  const pathname = usePathname();

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          title="Configurações"
          description="Organize canais, equipe, pipeline e integrações do seu workspace."
          icon={<Settings2 size={22} />}
        />

        <div className="flex flex-col gap-6 overflow-auto px-4 pb-6">
        {/* Atalhos pessoais */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SETTINGS_PERSONAL.map((item) => (
            <PersonalShortcut key={item.id} item={item} pathname={pathname} />
          ))}
        </section>

        {/* Grupos — todos visíveis (admin bypass) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_NAV.map((group) => {
            const GroupIcon = group.icon;
            return (
              <section
                key={group.id}
                className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
                aria-labelledby={`group-v2-${group.id}`}
              >
                <header className="flex items-start gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GroupIcon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id={`group-v2-${group.id}`}
                      className="text-sm font-semibold leading-tight text-foreground"
                    >
                      {group.label}
                    </h2>
                    {group.description ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                </header>

                <ul className="divide-y divide-border/50">
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

function SettingsRow({ item, pathname }: { item: SettingsNavItem; pathname: string }) {
  const Icon: SettingsNavIcon = item.icon;
  const active = item.href
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false;

  const body = (
    <span
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors",
        active ? "bg-primary/5" : item.href ? "hover:bg-muted/50" : "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "block truncate font-medium",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {item.label}
          </span>
          {item.eyebrow ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
              {item.eyebrow}
            </span>
          ) : null}
        </span>
        {item.description ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!item.href) {
    return <span aria-disabled className="block cursor-not-allowed">{body}</span>;
  }

  const isExternal = item.href.startsWith("http") || item.href.startsWith("mailto:");

  if (isExternal) {
    return (
      <a href={item.href} className="block" target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }

  return <Link href={item.href} className="block">{body}</Link>;
}

function PersonalShortcut({ item, pathname }: { item: SettingsNavItem; pathname: string }) {
  const Icon: SettingsNavIcon = item.icon;
  const active = item.href
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false;
  const isExternal = item.href?.startsWith("http") || item.href?.startsWith("mailto:");

  const body = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-colors",
        active ? "border-primary/40 bg-primary/5" : "hover:border-border hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
        {item.description ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!item.href) return <span className="opacity-60">{body}</span>;
  if (isExternal) return <a href={item.href} target="_blank" rel="noreferrer">{body}</a>;
  return <Link href={item.href}>{body}</Link>;
}
