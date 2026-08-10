/**
 * Categorização (presentation-only) dos recursos de permissão.
 *
 * O backend (`PERMISSION_CATALOG`) permanece uma lista plana — o agrupamento
 * por tema é puramente de UI, definido aqui e consumido pelo editor de
 * papéis e pela visão de permissões efetivas. Recurso novo sem categoria
 * cai no grupo "Outros" (fail-safe: nunca some da tela).
 *
 * `settings` e `nav` entram aqui para a visão efetiva; o editor de papel
 * filtra esses dois e trata-os em seções próprias.
 */

/** Recursos de conversas/mensageria (legado — útil p/ filtros pontuais). */
export const MESSAGING_RESOURCES = [
  "conversation",
  "channel",
  "template",
  "campaign",
  "inbox",
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
 * Temas do editor / visão efetiva. Ordem = ordem na tela.
 */
export const PERMISSION_CATEGORIES: CategoryDef[] = [
  {
    id: "crm",
    label: "Vendas & CRM",
    resources: ["pipeline", "deal", "contact", "company", "task", "report"],
  },
  {
    id: "inbox",
    label: "Inbox & Mensagens",
    resources: ["conversation", "inbox", "channel", "template", "campaign"],
  },
  {
    id: "automation",
    label: "Automação & Distribuição",
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
  {
    id: "admin",
    label: "Administração",
    resources: ["settings"],
  },
  {
    id: "nav",
    label: "Navegação",
    resources: ["nav"],
  },
];

/** Rótulos curtos dos recursos — para listas efetivas sem catálogo carregado. */
export const RESOURCE_LABELS: Record<string, string> = {
  pipeline: "Funis",
  deal: "Negócios",
  contact: "Contatos",
  company: "Empresas",
  task: "Tarefas",
  report: "Relatórios",
  conversation: "Conversas",
  inbox: "Filas da Inbox",
  channel: "Canais",
  template: "Templates",
  campaign: "Campanhas",
  automation: "Automações",
  ai_agent: "Agentes de IA",
  distribution: "Distribuição",
  product: "Produtos",
  inventory: "Inventário",
  catalog: "Catálogos",
  job_opening: "Vagas",
  org_unit: "Unidades",
  tag: "Tags",
  segment: "Segmentos",
  settings: "Configurações",
  nav: "Menu lateral",
  acesso: "Acesso",
};

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
