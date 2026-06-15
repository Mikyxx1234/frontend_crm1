/**
 * Categorização (presentation-only) dos recursos de permissão.
 *
 * O backend (`PERMISSION_CATALOG`) permanece uma lista plana — o agrupamento
 * por tipo é puramente de UI, definido aqui e consumido pelo editor de
 * permissões. Recurso novo sem categoria cai no grupo "Outros" (fail-safe:
 * nunca some da tela).
 *
 * Os recursos de MENSAGERIA são editados numa seção dedicada em
 * `/settings/conversations` (não no editor de papel) — por isso ficam fora
 * dos grupos do editor principal.
 */

/** Recursos de conversas/mensageria, relocados para /settings/conversations. */
export const MESSAGING_RESOURCES = [
  "conversation",
  "channel",
  "template",
  "campaign",
] as const;

export function isMessagingResource(resource: string): boolean {
  return (MESSAGING_RESOURCES as readonly string[]).includes(resource);
}

interface CategoryDef {
  id: string;
  label: string;
  /** Recursos da categoria, na ordem de exibição. */
  resources: string[];
}

/**
 * Categorias do editor principal (sem os recursos de mensageria, que vivem
 * em /settings/conversations). `settings` e `nav` são tratados à parte pelo
 * editor (grade administrativa + navegação derivada).
 */
export const PERMISSION_CATEGORIES: CategoryDef[] = [
  {
    id: "crm",
    label: "Vendas & CRM",
    resources: ["pipeline", "deal", "contact", "company", "task", "report"],
  },
  {
    id: "messaging",
    label: "Mensageria & Automação",
    resources: ["automation", "ai_agent", "distribution"],
  },
  {
    id: "catalog",
    label: "Catálogo & Produtos",
    resources: ["product", "inventory", "catalog", "job_opening", "org_unit"],
  },
  {
    id: "data",
    label: "Tags & Segmentos",
    resources: ["tag", "segment"],
  },
];

export interface CategoryGroupResult<T> {
  id: string;
  label: string;
  resources: T[];
}

/**
 * Agrupa uma lista de recursos pelas categorias acima, preservando a ordem
 * das categorias e dos recursos dentro delas. Recursos não categorizados
 * caem num grupo final "Outros".
 */
export function groupResourcesByCategory<T extends { resource: string }>(
  resources: T[],
): CategoryGroupResult<T>[] {
  const byKey = new Map(resources.map((r) => [r.resource, r]));
  const used = new Set<string>();
  const groups: CategoryGroupResult<T>[] = [];

  for (const cat of PERMISSION_CATEGORIES) {
    const items: T[] = [];
    for (const key of cat.resources) {
      const r = byKey.get(key);
      if (r) {
        items.push(r);
        used.add(key);
      }
    }
    if (items.length > 0) {
      groups.push({ id: cat.id, label: cat.label, resources: items });
    }
  }

  const rest = resources.filter((r) => !used.has(r.resource));
  if (rest.length > 0) {
    groups.push({ id: "other", label: "Outros", resources: rest });
  }

  return groups;
}
