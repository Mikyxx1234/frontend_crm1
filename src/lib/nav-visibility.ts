import { UserRole } from "@/lib/prisma-enum-types";

import type { SettingsNavGroup } from "./settings-nav";

/**
 * Regras de visibilidade do menu — funcao pura, sem dependencias de
 * React/Next, serve tanto no cliente quanto no server.
 *
 * Regra de ouro:
 *  - Super-admin (EduIT) e ADMIN da org enxergam TUDO — bypass total.
 *  - Item com `requiredPermission`: a permission MANDA. Se a role
 *    (customizada ou preset) concede a chave, o item aparece —
 *    independente do enum legado `User.role`. Sem a chave, some.
 *  - Item SEM `requiredPermission`: cai no filtro legado por
 *    `allowedRoles` (ausente = visivel pra todos).
 *
 * Por que permission > allowedRoles: roles customizadas (RBAC granular)
 * precisam conseguir liberar/bloquear itens sem depender do enum legado
 * ADMIN/MANAGER/MEMBER — senao um user MEMBER com role customizada que
 * concede `settings:channels` nunca veria o item.
 */

export type Viewer = {
  role: UserRole | null | undefined;
  isSuperAdmin: boolean;
  permissions?: ReadonlySet<string> | string[] | null;
  hiddenRoutes?: string[];
  hiddenSettingsItemIds?: string[];
};

export function canSeeItem(
  item: { allowedRoles?: UserRole[]; requiredPermission?: string; href?: string | null; id?: string },
  viewer: Viewer,
): boolean {
  if (viewer.isSuperAdmin) return true;
  if (viewer.role === UserRole.ADMIN) return true;
  if (item.requiredPermission) {
    const perms =
      viewer.permissions instanceof Set
        ? viewer.permissions
        : new Set(viewer.permissions ?? []);
    if (perms.has("*") || perms.has(item.requiredPermission)) return true;
    // Wildcard de recurso ("settings:*" cobre "settings:channels").
    const colonIdx = item.requiredPermission.indexOf(":");
    if (colonIdx > 0) {
      return perms.has(`${item.requiredPermission.slice(0, colonIdx)}:*`);
    }
    return false;
  }
  if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
  if (!viewer.role) return false;
  return item.allowedRoles.includes(viewer.role);
}

/**
 * Filtra grupos do settings nav. Grupos ficam de fora se nenhum
 * dos itens for visivel — evita categoria vazia na sidebar.
 */
export function filterSettingsNav(
  groups: SettingsNavGroup[],
  viewer: Viewer,
): SettingsNavGroup[] {
  const hidden = new Set(viewer.hiddenSettingsItemIds ?? []);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !hidden.has(item.id) && canSeeItem(item, viewer)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Filtro generico pra itens da sidebar principal (dashboard-shell) —
 * mesma semantica, sem noção de grupo.
 */
export function filterItemsByRole<T extends { allowedRoles?: UserRole[] }>(
  items: T[],
  viewer: Viewer,
): T[] {
  const hiddenRoutes = viewer.hiddenRoutes ?? [];
  return items.filter((item) => {
    const asRecord = item as unknown as { href?: string; id?: string; requiredPermission?: string };
    if (asRecord.href && hiddenRoutes.includes(asRecord.href)) return false;
    return canSeeItem(
      item as unknown as { allowedRoles?: UserRole[]; requiredPermission?: string; href?: string | null; id?: string },
      viewer,
    );
  });
}

/**
 * Defaults recomendados pra sidebar principal. Hoje usamos so na
 * sidebar vertical do dashboard-shell — expostos aqui pra que outros
 * consumidores (mobile bottom nav, cmdk palette) possam reaproveitar.
 *
 * Regra geral: MEMBER nao vê configuracoes nem ferramentas
 * administrativas. Ve so o que opera no dia a dia.
 */
export const SIDEBAR_ROLE_MATRIX: Record<string, UserRole[] | undefined> = {
  // Operacional — todos
  "/old/dashboard": undefined,
  "/old/pipeline": undefined,
  "/old/inbox": undefined,
  "/old/tasks": undefined,
  "/old/contacts": undefined,
  "/old/companies": undefined,
  // Gestao
  "/old/automations": [UserRole.ADMIN, UserRole.MANAGER],
  "/old/ai-agents": [UserRole.ADMIN, UserRole.MANAGER],
  "/old/campaigns": [UserRole.ADMIN, UserRole.MANAGER],
  "/old/analytics": [UserRole.ADMIN, UserRole.MANAGER],
  "/old/analytics/inbox": [UserRole.ADMIN, UserRole.MANAGER],
  "/old/reports": [UserRole.ADMIN, UserRole.MANAGER],
  // Developer area — so ADMIN
  "/old/developers": [UserRole.ADMIN],
  // Settings — todos enxergam, conteudo interno eh filtrado por grupo
  "/old/settings": undefined,
};

/**
 * Rotas fora do rail da sidebar mas ainda sujeitas ao allow list granular
 * (`scopeGrants.sidebar.routes`). Usado junto com hrefs de nav/bottom.
 */
export const SIDEBAR_GRANULAR_EXTRA_HREFS = ["/old/analytics/inbox"] as const;

export function computeHiddenSidebarRoutesFromAllowList(
  trackedHrefs: readonly string[],
  sidebarAllowList: string[] | undefined,
): string[] {
  // Lista vazia = SEM restrição (mostra tudo), alinhado à semântica do
  // backend em `roleRuleAllows` (`ids.length === 0 → return true`). Sem
  // este guard, um `parseScopeGrants` que normaliza rotas ausentes para
  // `[]` esconderia TODAS as rotas — inclusive para admin, já que o
  // filtro de hiddenRoutes roda antes do bypass de admin.
  if (
    !Array.isArray(sidebarAllowList) ||
    sidebarAllowList.length === 0 ||
    sidebarAllowList.includes("*")
  ) {
    return [];
  }
  return trackedHrefs.filter((href) => !sidebarAllowList.includes(href));
}
