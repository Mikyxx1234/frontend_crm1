import {
  IconBolt,
  IconBuilding,
  IconChecklist,
  IconClipboardList,
  IconFilter,
  IconLayoutDashboard,
  IconMessageCircle,
  IconPlugConnected,
  IconRoute,
  IconSend,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

import type { AppUserRole } from "@/lib/auth-types";

/**
 * Catalogo oficial dos itens customizaveis da sidebar (nav rail) — frontend.
 *
 * Fonte de verdade para RENDER (titulo, href, icone, descricao) e ORDEM
 * PADRAO. As `key`s precisam ser identicas as do catalogo do backend
 * (`backend/src/lib/sidebar-catalog.ts`), que cuida da validacao/persistencia.
 *
 * A `key` e estavel e nunca deve mudar — ela e gravada na preferencia do
 * usuario. NUNCA use `title`/`href` como identificador.
 */

export interface SidebarCatalogItem {
  key: string;
  title: string;
  href: string;
  icon: Icon;
  description: string;
  /** Item essencial: pode ser reordenado, mas nao ocultado. */
  locked: boolean;
  /**
   * Papéis que podem ver este item. Ausente = visível para todos.
   * Super-admin sempre vê tudo (ver `filterNavItemsByRole`).
   *
   * NOTA: agora é só o "1º filtro" (gross). O 2º filtro é o
   * `requiredPermission` (granular por role customizada) — ver
   * `filterNavItemsByPermissions` mais abaixo.
   */
  allowedRoles?: readonly AppUserRole[];
  /**
   * Permission key canônica (`nav:<key>`) que o usuário precisa ter
   * para ver este item na sidebar. Espelha o catálogo backend em
   * `src/lib/authz/permissions.ts` (resource `nav`).
   *
   * Semântica: fail-closed — se a role não tem essa chave (nem `*` /
   * `nav:*`), o item fica oculto. ADMIN preset (`["*"]`) e super-admin
   * sempre passam.
   *
   * Por que duplicar com `allowedRoles`? `allowedRoles` é um default
   * estático de produto (ex.: "automations só pra gestão"); a
   * permission é o override por role customizada via /settings/permissions.
   * Os dois rodam juntos — basta UM esconder o item.
   */
  requiredPermission?: string;
}

/** Ordem do array = ordem padrao da sidebar. */
export const SIDEBAR_CATALOG: readonly SidebarCatalogItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: IconLayoutDashboard,
    description: "Visão geral de negócios e atendimento.",
    locked: true,
    requiredPermission: "nav:dashboard",
  },
  {
    key: "pipeline",
    title: "Pipeline",
    href: "/pipeline",
    icon: IconFilter,
    description: "Funil de vendas e oportunidades.",
    locked: false,
    requiredPermission: "nav:pipeline",
  },
  {
    key: "contacts",
    title: "Contatos",
    href: "/contacts",
    icon: IconUsers,
    description: "Sua base de contatos e leads.",
    locked: false,
    requiredPermission: "nav:contacts",
  },
  {
    key: "companies",
    title: "Empresas",
    href: "/companies",
    icon: IconBuilding,
    description: "Organizações vinculadas aos contatos.",
    locked: false,
    requiredPermission: "nav:companies",
  },
  {
    key: "inbox",
    title: "Inbox",
    href: "/inbox",
    icon: IconMessageCircle,
    description: "Central de conversas e atendimento.",
    locked: false,
    requiredPermission: "nav:inbox",
  },
  {
    key: "activities",
    title: "Atividades",
    href: "/activities",
    icon: IconChecklist,
    description: "Tarefas, follow-ups e agenda.",
    locked: false,
    requiredPermission: "nav:activities",
  },
  {
    key: "automations",
    title: "Automações",
    href: "/automations",
    icon: IconBolt,
    description: "Fluxos automáticos e gatilhos.",
    locked: false,
    allowedRoles: ["ADMIN", "MANAGER"],
    requiredPermission: "nav:automations",
  },
  {
    key: "campaigns",
    title: "Campanhas",
    href: "/campaigns",
    icon: IconSend,
    description: "Disparos em massa via WhatsApp com rastreamento.",
    locked: false,
    requiredPermission: "nav:campaigns",
  },
  {
    key: "distribution",
    title: "Distribuição",
    href: "/widgets/distribution",
    icon: IconRoute,
    description: "Distribuição inteligente de leads entre consultores.",
    locked: false,
    allowedRoles: ["ADMIN", "MANAGER"],
    requiredPermission: "nav:distribution",
  },
  {
    key: "logs",
    title: "Logs",
    href: "/logs",
    icon: IconClipboardList,
    description: "Feed unificado de atividades e eventos.",
    locked: false,
    allowedRoles: ["ADMIN", "MANAGER"],
    requiredPermission: "nav:logs",
  },
  {
    key: "widgets",
    title: "Widgets",
    href: "/widgets",
    icon: IconPlugConnected,
    description: "Central de extensões da organização.",
    locked: false,
    requiredPermission: "nav:widgets",
  },
] as const;

export const SIDEBAR_CATALOG_KEYS: ReadonlySet<string> = new Set(
  SIDEBAR_CATALOG.map((i) => i.key),
);

export function getSidebarCatalogItem(key: string): SidebarCatalogItem | undefined {
  return SIDEBAR_CATALOG.find((i) => i.key === key);
}

/** Preferencia persistida por item (espelha o backend). */
export interface SidebarItemPreference {
  key: string;
  enabled: boolean;
  order: number;
}

/** Item do catalogo enriquecido com o estado da preferencia do usuario. */
export interface ResolvedSidebarItem extends SidebarCatalogItem {
  enabled: boolean;
  order: number;
}

/**
 * Mescla a preferencia do usuario com o catalogo, aplicando as regras:
 *  - mantem a ordem salva para itens conhecidos;
 *  - anexa, ao final, itens do catalogo ainda nao salvos (enabled = true);
 *  - ignora keys que nao existem mais no catalogo;
 *  - forca itens `locked` a ficarem enabled.
 *
 * Retorna TODOS os itens do catalogo (inclusive desabilitados) em ordem —
 * util para a tela de personalizacao. Para a sidebar real, filtre por
 * `enabled` (ver `toNavItems`).
 */
export function resolveSidebarItems(
  pref: SidebarItemPreference[] | undefined | null,
): ResolvedSidebarItem[] {
  const saved = Array.isArray(pref) ? pref : [];
  const savedMap = new Map<string, SidebarItemPreference>();
  for (const it of saved) {
    if (!it || typeof it.key !== "string") continue;
    if (!SIDEBAR_CATALOG_KEYS.has(it.key)) continue;
    if (savedMap.has(it.key)) continue;
    savedMap.set(it.key, it);
  }

  const orderedKeys = [...savedMap.values()]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((it) => it.key);

  for (const item of SIDEBAR_CATALOG) {
    if (!orderedKeys.includes(item.key)) orderedKeys.push(item.key);
  }

  return orderedKeys.map((key, idx) => {
    const item = getSidebarCatalogItem(key)!;
    const savedItem = savedMap.get(key);
    return {
      ...item,
      enabled: item.locked ? true : (savedItem?.enabled ?? true),
      order: idx + 1,
    };
  });
}

/** Apenas os itens visiveis (enabled) em ordem — para renderizar a nav. */
export function toNavItems(
  pref: SidebarItemPreference[] | undefined | null,
): ResolvedSidebarItem[] {
  return resolveSidebarItems(pref).filter((i) => i.enabled);
}

/**
 * Filtra itens da nav por papel do usuário. Itens sem `allowedRoles` são
 * visíveis para todos; itens restritos só aparecem para os papéis listados.
 * Super-admin (EduIT) sempre vê tudo. Enquanto o papel ainda não resolveu
 * (`role == null`), itens restritos ficam ocultos para não vazar acesso.
 */
export function filterNavItemsByRole<T extends SidebarCatalogItem>(
  items: T[],
  viewer: { role: AppUserRole | null; isSuperAdmin?: boolean },
): T[] {
  if (viewer.isSuperAdmin) return items;
  return items.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return viewer.role != null && item.allowedRoles.includes(viewer.role);
  });
}

/**
 * 2º filtro: aplica `requiredPermission` (granular por role customizada).
 *
 * Semântica:
 *  - Super-admin EduIT bypassa tudo (visualiza todos os itens).
 *  - `permissions === undefined` (ainda carregando): mantém os itens
 *    intocados — o `filterNavItemsByRole` já é defensivo o suficiente
 *    pro 1º render, e esconder aqui faria a sidebar "piscar" enquanto
 *    o GET de effective-permissions chega.
 *  - Item sem `requiredPermission`: sempre passa (legado / locked).
 *  - Item com `requiredPermission`: passa se o array contém `*` ou a
 *    chave exata. Wildcard `nav:*` também passa (paridade com a
 *    semântica do `can()` backend).
 *
 * Combine com `filterNavItemsByRole` em série — qualquer um dos dois
 * pode esconder o item (fail-closed agregado).
 */
export function filterNavItemsByPermissions<T extends SidebarCatalogItem>(
  items: T[],
  viewer: { isSuperAdmin?: boolean; permissions?: readonly string[] },
): T[] {
  if (viewer.isSuperAdmin) return items;
  const perms = viewer.permissions;
  if (perms === undefined) return items;
  if (perms.includes("*")) return items;
  const permSet = new Set(perms);
  return items.filter((item) => {
    if (!item.requiredPermission) return true;
    if (permSet.has(item.requiredPermission)) return true;
    // Suporte a wildcard por resource (ex.: `nav:*`).
    const [resource] = item.requiredPermission.split(":");
    if (resource && permSet.has(`${resource}:*`)) return true;
    return false;
  });
}

/** Preferencia padrao (catalogo, todos habilitados) — para "Restaurar padrão". */
export function defaultSidebarPreference(): SidebarItemPreference[] {
  return SIDEBAR_CATALOG.map((item, idx) => ({
    key: item.key,
    enabled: true,
    order: idx + 1,
  }));
}
