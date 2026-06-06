/**
 * Catalogo oficial dos blocos de analise do dashboard comercial — frontend.
 *
 * Fonte de verdade para RENDER (titulo, descricao) e ORDEM PADRAO. As `key`s
 * precisam ser identicas as do catalogo do backend
 * (`backend/src/lib/dashboard-blocks-catalog.ts`), que valida/persiste.
 *
 * A `key` e estavel e nunca deve mudar — e gravada na preferencia do usuario.
 */

export interface DashboardBlockCatalogItem {
  key: string;
  title: string;
  description: string;
  /** Bloco essencial: pode ser reordenado, mas nao ocultado. */
  locked: boolean;
}

/** Ordem do array = ordem padrao dos blocos. */
export const DASHBOARD_BLOCKS_CATALOG: readonly DashboardBlockCatalogItem[] = [
  {
    key: "summary",
    title: "Indicadores",
    description: "Cards principais de KPIs do período.",
    locked: true,
  },
  {
    key: "funnel",
    title: "Funil por etapa",
    description: "Volume, valor, ganhos e conversão por etapa.",
    locked: false,
  },
  {
    key: "dailyEvolution",
    title: "Evolução diária",
    description: "Novos, ganhos e perdidos ao longo do período.",
    locked: false,
  },
  {
    key: "bySource",
    title: "Negócios por origem",
    description: "Distribuição e conversão por canal de aquisição.",
    locked: false,
  },
  {
    key: "byOwner",
    title: "Ranking de consultores",
    description: "Desempenho por responsável.",
    locked: false,
  },
  {
    key: "byTag",
    title: "Performance por tags",
    description: "Conversão e valor ganho por tag.",
    locked: false,
  },
  {
    key: "lossReasons",
    title: "Motivos de perda",
    description: "Por que os negócios foram perdidos.",
    locked: false,
  },
  {
    key: "stalled",
    title: "Leads parados por etapa",
    description: "Negócios abertos sem movimentação.",
    locked: false,
  },
] as const;

export const DASHBOARD_BLOCK_KEYS: ReadonlySet<string> = new Set(
  DASHBOARD_BLOCKS_CATALOG.map((b) => b.key),
);

export function getDashboardBlock(
  key: string,
): DashboardBlockCatalogItem | undefined {
  return DASHBOARD_BLOCKS_CATALOG.find((b) => b.key === key);
}

/** Preferencia persistida por bloco (espelha o backend). */
export interface DashboardBlockPreference {
  key: string;
  enabled: boolean;
  order: number;
}

/** Bloco do catalogo enriquecido com o estado da preferencia do usuario. */
export interface ResolvedDashboardBlock extends DashboardBlockCatalogItem {
  enabled: boolean;
  order: number;
}

/**
 * Mescla a preferencia do usuario com o catalogo:
 *  - mantem a ordem salva para blocos conhecidos;
 *  - anexa, ao final, blocos do catalogo ainda nao salvos (enabled = true);
 *  - ignora keys que nao existem mais no catalogo;
 *  - forca blocos `locked` a ficarem enabled.
 *
 * Retorna TODOS os blocos do catalogo (inclusive ocultos) em ordem.
 */
export function resolveDashboardBlocks(
  pref: DashboardBlockPreference[] | undefined | null,
): ResolvedDashboardBlock[] {
  const saved = Array.isArray(pref) ? pref : [];
  const savedMap = new Map<string, DashboardBlockPreference>();
  for (const it of saved) {
    if (!it || typeof it.key !== "string") continue;
    if (!DASHBOARD_BLOCK_KEYS.has(it.key)) continue;
    if (savedMap.has(it.key)) continue;
    savedMap.set(it.key, it);
  }

  const orderedKeys = [...savedMap.values()]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((it) => it.key);

  for (const block of DASHBOARD_BLOCKS_CATALOG) {
    if (!orderedKeys.includes(block.key)) orderedKeys.push(block.key);
  }

  return orderedKeys.map((key, idx) => {
    const block = getDashboardBlock(key)!;
    const savedItem = savedMap.get(key);
    return {
      ...block,
      enabled: block.locked ? true : (savedItem?.enabled ?? true),
      order: idx + 1,
    };
  });
}

/** Preferencia padrao (catalogo, todos habilitados) — para "Restaurar padrão". */
export function defaultDashboardPreference(): DashboardBlockPreference[] {
  return DASHBOARD_BLOCKS_CATALOG.map((block, idx) => ({
    key: block.key,
    enabled: true,
    order: idx + 1,
  }));
}
