import {
  IconBolt,
  IconBuilding,
  IconChecklist,
  IconClipboardList,
  IconFilter,
  IconLayoutDashboard,
  IconLayoutGrid,
  IconMessageCircle,
  IconRoute,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

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
  },
  {
    key: "pipeline",
    title: "Pipeline",
    href: "/pipeline",
    icon: IconFilter,
    description: "Funil de vendas e oportunidades.",
    locked: false,
  },
  {
    key: "contacts",
    title: "Contatos",
    href: "/contacts",
    icon: IconUsers,
    description: "Sua base de contatos e leads.",
    locked: false,
  },
  {
    key: "companies",
    title: "Empresas",
    href: "/companies",
    icon: IconBuilding,
    description: "Organizações vinculadas aos contatos.",
    locked: false,
  },
  {
    key: "inbox",
    title: "Inbox",
    href: "/inbox",
    icon: IconMessageCircle,
    description: "Central de conversas e atendimento.",
    locked: false,
  },
  {
    key: "activities",
    title: "Atividades",
    href: "/activities",
    icon: IconChecklist,
    description: "Tarefas, follow-ups e agenda.",
    locked: false,
  },
  {
    key: "automations",
    title: "Automações",
    href: "/automations",
    icon: IconBolt,
    description: "Fluxos automáticos e gatilhos.",
    locked: false,
  },
  {
    key: "distribution",
    title: "Distribuição",
    href: "/widgets/distribution",
    icon: IconRoute,
    description: "Distribuição inteligente de leads entre consultores.",
    locked: false,
  },
  {
    key: "logs",
    title: "Logs",
    href: "/logs",
    icon: IconClipboardList,
    description: "Feed unificado de atividades e eventos.",
    locked: false,
  },
  {
    key: "widgets",
    title: "Widgets",
    href: "/widgets",
    icon: IconLayoutGrid,
    description: "Central de extensões da organização.",
    locked: false,
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
 * `availableKeys` (vindo do backend, gating por permission + widgets ativos):
 *  quando fornecido, itens fora desse conjunto sao ignorados — nem entram nas
 *  prefs salvas, nem sao auto-anexados. Quando omitido, considera o catalogo
 *  inteiro (compatibilidade / preview).
 *
 * Retorna TODOS os itens disponiveis do catalogo (inclusive desabilitados) em
 * ordem — util para a tela de personalizacao. Para a sidebar real, filtre por
 * `enabled` (ver `toNavItems`).
 */
export function resolveSidebarItems(
  pref: SidebarItemPreference[] | undefined | null,
  availableKeys?: ReadonlySet<string> | string[] | null,
): ResolvedSidebarItem[] {
  const available =
    availableKeys == null
      ? null
      : availableKeys instanceof Set
        ? availableKeys
        : new Set(availableKeys);
  const isAvailable = (key: string) =>
    SIDEBAR_CATALOG_KEYS.has(key) && (available === null || available.has(key));

  const saved = Array.isArray(pref) ? pref : [];
  const savedMap = new Map<string, SidebarItemPreference>();
  for (const it of saved) {
    if (!it || typeof it.key !== "string") continue;
    if (!isAvailable(it.key)) continue;
    if (savedMap.has(it.key)) continue;
    savedMap.set(it.key, it);
  }

  const orderedKeys = [...savedMap.values()]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((it) => it.key);

  for (const item of SIDEBAR_CATALOG) {
    if (isAvailable(item.key) && !orderedKeys.includes(item.key)) {
      orderedKeys.push(item.key);
    }
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
  availableKeys?: ReadonlySet<string> | string[] | null,
): ResolvedSidebarItem[] {
  return resolveSidebarItems(pref, availableKeys).filter((i) => i.enabled);
}

/** Preferencia padrao (catalogo, todos habilitados) — para "Restaurar padrão". */
export function defaultSidebarPreference(): SidebarItemPreference[] {
  return SIDEBAR_CATALOG.map((item, idx) => ({
    key: item.key,
    enabled: true,
    order: idx + 1,
  }));
}
