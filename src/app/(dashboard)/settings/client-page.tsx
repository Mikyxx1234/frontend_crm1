"use client";

import { apiUrl } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { Settings2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { UserRole } from "@/lib/prisma-enum-types";

import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { filterSettingsNav, type Viewer } from "@/lib/nav-visibility";
import {
  SETTINGS_NAV,
  SETTINGS_PERSONAL,
  type SettingsNavIcon,
  type SettingsNavItem,
} from "@/lib/settings-nav";

/**
 * Hub de ConfiguraÃ§Ãµes.
 *
 * A estrutura de grupos/itens vem de `SETTINGS_NAV` (fonte unica).
 * Essa pagina eh so renderizacao â€” zero logica de negocio. Pra
 * adicionar um novo item, edite `src/lib/settings-nav.ts`.
 *
 * Visibilidade:
 *  - `filterSettingsNav` oculta itens/grupos que o role atual nao
 *    pode ver. Super-admin bypass.
 *  - MEMBER so ve "Respostas rÃ¡pidas" e "NotificaÃ§Ãµes" + atalhos
 *    pessoais (perfil, suporte).
 */
export default function SettingsClientPage() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: permissionsPanel } = useQuery<{
    permissionKeys: string[];
    scopeGrants?: {
      sidebar?: { settingsItems?: Partial<Record<"ADMIN" | "MANAGER" | "MEMBER", string[]>> };
    };
  }>({
    queryKey: ["settings-permissions-panel"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/settings/permissions"));
      if (!r.ok) return { permissionKeys: [] };
      return r.json();
    },
  });
  const role = (session?.user as { role?: UserRole } | undefined)?.role ?? null;
  const settingsAllowList = role
    ? permissionsPanel?.scopeGrants?.sidebar?.settingsItems?.[role]
    : undefined;
  const hiddenSettingsItemIds =
    Array.isArray(settingsAllowList) && !settingsAllowList.includes("*")
      ? SETTINGS_NAV.flatMap((g) => g.items.map((i) => i.id)).filter((id) => {
          if (settingsAllowList.includes(id)) return false;
          if (
            id === "message-models" &&
            (settingsAllowList.includes("templates") || settingsAllowList.includes("whatsapp-templates"))
          ) {
            return false;
          }
          return true;
        })
      : [];

  const viewer: Viewer = useMemo(
    () => ({
      role,
      isSuperAdmin: Boolean(
        (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin,
      ),
      permissions: permissionsPanel?.permissionKeys ?? [],
      hiddenSettingsItemIds,
    }),
    [hiddenSettingsItemIds, permissionsPanel?.permissionKeys, role, session],
  );

  const groups = useMemo(() => filterSettingsNav(SETTINGS_NAV, viewer), [viewer]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          title="ConfiguraÃ§Ãµes"
          description="Organize canais, equipe, pipeline e integraÃ§Ãµes do seu workspace."
          icon={<Settings2 />}
        />
      </div>

      {/* Atalhos pessoais â€” topo, 2 cards compactos */}
      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SETTINGS_PERSONAL.map((item) => (
          <PersonalShortcut key={item.id} item={item} pathname={pathname} />
        ))}
      </section>

      {/* Grupos â€” cada grupo renderiza um card com header + lista */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section
              key={group.id}
              className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
              aria-labelledby={`group-${group.id}`}
            >
              <header className="flex items-start gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GroupIcon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <h2
                    id={`group-${group.id}`}
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

      {groups.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Seu perfil nÃ£o tem acesso a configuraÃ§Ãµes do workspace. PeÃ§a para
            um administrador ajustar suas permissÃµes.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SettingsRow({
  item,
  pathname,
}: {
  item: SettingsNavItem;
  pathname: string;
}) {
  const Icon: SettingsNavIcon = item.icon;
  const active = item.href
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false;

  const body = (
    <span
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors",
        active
          ? "bg-primary/5"
          : item.href
            ? "hover:bg-muted/50"
            : "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          active
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
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
    return (
      <span aria-disabled className="block cursor-not-allowed">
        {body}
      </span>
    );
  }

  const isExternal =
    item.href.startsWith("http") || item.href.startsWith("mailto:");

  if (isExternal) {
    return (
      <a href={item.href} className="block" target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }

  return (
    <Link href={item.href} className="block">
      {body}
    </Link>
  );
}

function PersonalShortcut({
  item,
  pathname,
}: {
  item: SettingsNavItem;
  pathname: string;
}) {
  const Icon: SettingsNavIcon = item.icon;
  const active = item.href
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false;
  const isExternal =
    item.href?.startsWith("http") || item.href?.startsWith("mailto:");

  const body = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-colors",
        active
          ? "border-primary/40 bg-primary/5"
          : "hover:border-border hover:bg-muted/40",
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
        <span className="block text-sm font-semibold text-foreground">
          {item.label}
        </span>
        {item.description ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!item.href) return <span className="opacity-60">{body}</span>;

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }

  return <Link href={item.href}>{body}</Link>;
}
