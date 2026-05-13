/**
 * Dashboard store (v2) — grade 2D customizável estilo Kommo.
 *
 * Modelo:
 *   - `layout`: Record<WidgetId, GridItem>    → posição/tamanho no grid
 *   - `visibleWidgets`: Set<WidgetId>         → quais widgets aparecem
 *   - `preset`: nome do layout aplicado       → "default" | "comercial" | ...
 *   - `filters`, `period`, `comparison`       → iguais ao v1
 *
 * Grade: 12 colunas (padrão react-grid-layout), rowHeight configurável
 * pelo consumidor. Cada widget declara seus defaults em `WIDGET_REGISTRY`
 * (x, y, w, h, minW, minH) — se o store não tem posição salva, usa ali.
 *
 * Persistência: dupla camada — localStorage pra load instantâneo
 * (evita flash) + banco via `/api/dashboard/layout` pra sincronizar
 * entre dispositivos. O banco é fonte da verdade; localStorage é
 * apenas cache local.
 */

import { create } from "zustand";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "year"
  | "custom";

export type ComparisonMode =
  | "off"
  | "previous_period"
  | "previous_month"
  | "custom";

/**
 * Catálogo de widgets disponíveis. IDs são strings literais usadas
 * como `data-grid` keys no react-grid-layout.
 *
 * Grupos:
 *   - Vendas: revenue, conversion, funnel, stageRanking, losses, pipeline, sources
 *   - Atendimento: queueByChannel, slaBreaches, avgResponseTime, messageVolume,
 *                  conversationsByStatus, channelHealth
 *   - Equipe: agentsOnline, team, activities
 */
export type WidgetId =
  // Vendas
  | "revenue"
  | "conversion"
  | "funnel"
  | "stageRanking"
  | "losses"
  | "pipeline"
  | "sources"
  // Atendimento
  | "queueByChannel"
  | "slaBreaches"
  | "avgResponseTime"
  | "messageVolume"
  | "conversationsByStatus"
  | "channelHealth"
  // Equipe
  | "agentsOnline"
  | "team"
  | "activities";

export type WidgetCategory = "sales" | "service" | "team";

export type GridItem = {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
};

export type WidgetDescriptor = {
  id: WidgetId;
  label: string;
  description: string;
  category: WidgetCategory;
  defaults: Omit<GridItem, "i">;
};

export type DashboardPresetId =
  | "default"
  | "comercial"
  | "atendimento"
  | "equipe"
  | "monitor"
  | "custom";

export type DashboardFilters = {
  pipelineId: string | null;
  ownerId: string | null;
  source: string | null;
  status: "ALL" | "OPEN" | "WON" | "LOST";
};

export type DashboardState = {
  periodPreset: PeriodPreset;
  from: string;
  to: string;
  comparisonMode: ComparisonMode;
  compFrom: string;
  compTo: string;
  filters: DashboardFilters;
  layout: Record<WidgetId, GridItem>;
  visibleWidgets: Set<WidgetId>;
  preset: DashboardPresetId;
  /** Nome do layout ativo (última carga do backend), pra saber qual PUT fazer. */
  activeLayoutName: string;
  /** Indica mudanças não salvas no backend. */
  dirty: boolean;
};

export type DashboardActions = {
  setPeriod: (preset: PeriodPreset, customFrom?: string, customTo?: string) => void;
  setComparison: (mode: ComparisonMode, customFrom?: string, customTo?: string) => void;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  /** Atualiza posições após um drag/resize do react-grid-layout. */
  applyGridLayout: (items: GridItem[]) => void;
  toggleWidget: (id: WidgetId) => void;
  applyPreset: (preset: DashboardPresetId) => void;
  resetLayout: () => void;
  /** Marca estado como salvo (após PUT bem-sucedido no backend). */
  markSaved: () => void;
  /** Hidrata layout vindo do backend, sem marcar dirty. */
  hydrate: (data: {
    layout: Record<WidgetId, GridItem>;
    visibleWidgets: WidgetId[];
    preset: DashboardPresetId;
    activeLayoutName?: string;
  }) => void;
};

// ── Catálogo de widgets ───────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDescriptor> = {
  // ── Vendas ──
  revenue: {
    id: "revenue",
    label: "Receita",
    description: "Valor total fechado no período, com comparativo.",
    category: "sales",
    defaults: { x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
  },
  conversion: {
    id: "conversion",
    label: "Taxa de conversão",
    description: "% de leads que viraram negócios ganhos.",
    category: "sales",
    defaults: { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    description: "Valor total em aberto por etapa.",
    category: "sales",
    defaults: { x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
  },
  funnel: {
    id: "funnel",
    label: "Funil de vendas",
    description: "Distribuição dos deals por etapa do funil.",
    category: "sales",
    defaults: { x: 0, y: 4, w: 12, h: 6, minW: 6, minH: 4 },
  },
  stageRanking: {
    id: "stageRanking",
    label: "Ranking por etapa",
    description: "Usuários mais produtivos por etapa.",
    category: "sales",
    defaults: { x: 0, y: 10, w: 12, h: 6, minW: 6, minH: 4 },
  },
  losses: {
    id: "losses",
    label: "Perdas",
    description: "Motivos de perda com volume e valor.",
    category: "sales",
    defaults: { x: 0, y: 16, w: 6, h: 5, minW: 4, minH: 4 },
  },
  sources: {
    id: "sources",
    label: "Fontes de leads",
    description: "Top origens de onde os leads chegam.",
    category: "sales",
    defaults: { x: 6, y: 16, w: 6, h: 5, minW: 4, minH: 4 },
  },

  // ── Atendimento ──
  queueByChannel: {
    id: "queueByChannel",
    label: "Fila por canal",
    description: "Conversas em OPEN/PENDING por canal (WhatsApp/Email/...).",
    category: "service",
    defaults: { x: 0, y: 0, w: 6, h: 5, minW: 4, minH: 3 },
  },
  slaBreaches: {
    id: "slaBreaches",
    label: "SLA vencendo",
    description: "Conversas sem resposta acima do limite definido.",
    category: "service",
    defaults: { x: 6, y: 0, w: 6, h: 5, minW: 4, minH: 3 },
  },
  avgResponseTime: {
    id: "avgResponseTime",
    label: "Tempo médio de resposta",
    description: "TMR por agente e no total do período.",
    category: "service",
    defaults: { x: 0, y: 5, w: 6, h: 5, minW: 4, minH: 3 },
  },
  messageVolume: {
    id: "messageVolume",
    label: "Volume de mensagens",
    description: "Mensagens in/out por dia no período.",
    category: "service",
    defaults: { x: 6, y: 5, w: 6, h: 5, minW: 4, minH: 3 },
  },
  conversationsByStatus: {
    id: "conversationsByStatus",
    label: "Conversas por status",
    description: "Quantidade em OPEN / PENDING / SNOOZED / RESOLVED.",
    category: "service",
    defaults: { x: 0, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
  },
  channelHealth: {
    id: "channelHealth",
    label: "Saúde dos canais",
    description: "Status atual dos canais (WhatsApp Cloud, Baileys, e-mail).",
    category: "service",
    defaults: { x: 6, y: 10, w: 6, h: 4, minW: 4, minH: 3 },
  },

  // ── Equipe ──
  agentsOnline: {
    id: "agentsOnline",
    label: "Agentes online",
    description: "Quem está online / ausente / offline agora.",
    category: "team",
    defaults: { x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
  },
  team: {
    id: "team",
    label: "Desempenho da equipe",
    description: "Ranking por deals/receita/conversão no período.",
    category: "team",
    defaults: { x: 0, y: 22, w: 12, h: 6, minW: 6, minH: 4 },
  },
  activities: {
    id: "activities",
    label: "Atividades",
    description: "Tarefas e compromissos da equipe.",
    category: "team",
    defaults: { x: 6, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
  },
};

export const ALL_WIDGETS: WidgetId[] = Object.keys(WIDGET_REGISTRY) as WidgetId[];

export const WIDGET_LABELS: Record<WidgetId, string> = Object.fromEntries(
  ALL_WIDGETS.map((id) => [id, WIDGET_REGISTRY[id].label] as const),
) as Record<WidgetId, string>;

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  sales: "Vendas",
  service: "Atendimento",
  team: "Equipe",
};

// ── Presets (layouts pré-definidos) ───────────────────────────────────

type PresetDef = {
  id: DashboardPresetId;
  label: string;
  description: string;
  widgets: WidgetId[];
};

export const DASHBOARD_PRESETS: Record<Exclude<DashboardPresetId, "custom">, PresetDef> = {
  default: {
    id: "default",
    label: "Padrão",
    description: "Visão equilibrada com vendas, atendimento e equipe.",
    widgets: [
      "revenue", "conversion", "pipeline",
      "queueByChannel", "agentsOnline",
      "funnel",
      "activities",
    ],
  },
  comercial: {
    id: "comercial",
    label: "Comercial",
    description: "Foco em receita, funil e ranking de vendas.",
    widgets: [
      "revenue", "conversion", "pipeline",
      "funnel",
      "stageRanking",
      "losses", "sources",
      "team",
    ],
  },
  atendimento: {
    id: "atendimento",
    label: "Atendimento",
    description: "Foco em filas, SLA, TMR e saúde dos canais.",
    widgets: [
      "queueByChannel", "slaBreaches",
      "avgResponseTime", "messageVolume",
      "conversationsByStatus", "channelHealth",
    ],
  },
  equipe: {
    id: "equipe",
    label: "Equipe",
    description: "Presença em tempo real, atividades e produtividade.",
    widgets: [
      "agentsOnline", "activities",
      "avgResponseTime",
      "team",
    ],
  },
  monitor: {
    id: "monitor",
    label: "Monitor (TV Wall)",
    description: "Visão densa de supervisão em tempo real.",
    widgets: [
      "queueByChannel", "slaBreaches", "agentsOnline",
      "avgResponseTime", "messageVolume", "channelHealth",
      "conversationsByStatus",
      "revenue", "conversion",
    ],
  },
};

// ── Helpers de layout ─────────────────────────────────────────────────

/**
 * Monta um Record<WidgetId, GridItem> a partir de uma lista de IDs,
 * usando os defaults do REGISTRY. Preserva coesão visual: cada widget
 * vai pra sua posição padrão. Widgets fora da lista não aparecem.
 *
 * Nota: pra evitar sobreposição quando mixamos widgets de categorias
 * diferentes (cada um tem `x/y` assumindo "sua tela"), fazemos um
 * packing simples — empilha verticalmente respeitando as larguras
 * declaradas. Isso evita que `revenue(x=0,y=0,w=6)` e
 * `queueByChannel(x=0,y=0,w=6)` colidam quando entram juntos.
 */
function layoutFromWidgets(widgets: WidgetId[]): Record<WidgetId, GridItem> {
  const result: Record<string, GridItem> = {};
  const cols = 12;
  // Cursor de "próxima linha livre" por coluna.
  const rowTops = new Array(cols).fill(0) as number[];

  for (const id of widgets) {
    const def = WIDGET_REGISTRY[id];
    if (!def) continue;
    const w = Math.min(cols, def.defaults.w);
    const h = def.defaults.h;

    let bestX = 0;
    let bestY = Number.POSITIVE_INFINITY;
    for (let x = 0; x <= cols - w; x++) {
      let y = 0;
      for (let c = x; c < x + w; c++) y = Math.max(y, rowTops[c] ?? 0);
      if (y < bestY) {
        bestY = y;
        bestX = x;
      }
    }
    const finalY = bestY === Number.POSITIVE_INFINITY ? 0 : bestY;
    for (let c = bestX; c < bestX + w; c++) rowTops[c] = finalY + h;

    result[id] = {
      i: id,
      x: bestX,
      y: finalY,
      w,
      h,
      minW: def.defaults.minW,
      minH: def.defaults.minH,
      maxW: def.defaults.maxW,
      maxH: def.defaults.maxH,
    };
  }

  return result as Record<WidgetId, GridItem>;
}

function presetToState(presetId: Exclude<DashboardPresetId, "custom">): {
  layout: Record<WidgetId, GridItem>;
  visibleWidgets: Set<WidgetId>;
} {
  const def = DASHBOARD_PRESETS[presetId];
  return {
    layout: layoutFromWidgets(def.widgets),
    visibleWidgets: new Set(def.widgets),
  };
}

// ── Período e comparação ──────────────────────────────────────────────

function computePeriod(preset: PeriodPreset, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
    }
    case "7d":
      return { from: startOfDay(subDays(now, 6)).toISOString(), to: endOfDay(now).toISOString() };
    case "30d":
      return { from: startOfDay(subDays(now, 29)).toISOString(), to: endOfDay(now).toISOString() };
    case "month":
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    case "year":
      return { from: startOfYear(now).toISOString(), to: endOfYear(now).toISOString() };
    case "custom":
      return {
        from: customFrom ?? startOfDay(subDays(now, 29)).toISOString(),
        to: customTo ?? endOfDay(now).toISOString(),
      };
  }
}

function computeComparison(
  mode: ComparisonMode,
  from: string,
  to: string,
  customCompFrom?: string,
  customCompTo?: string,
) {
  if (mode === "off") return { compFrom: "", compTo: "" };
  if (mode === "custom") return { compFrom: customCompFrom ?? "", compTo: customCompTo ?? "" };
  const fromD = new Date(from);
  const toD = new Date(to);
  const diffMs = toD.getTime() - fromD.getTime();
  if (mode === "previous_period") {
    const prevTo = new Date(fromD.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - diffMs);
    return { compFrom: prevFrom.toISOString(), compTo: prevTo.toISOString() };
  }
  return {
    compFrom: subMonths(fromD, 1).toISOString(),
    compTo: subMonths(toD, 1).toISOString(),
  };
}

// ── Persistência local (cache imediato) ───────────────────────────────

const STORAGE_KEY = "dashboard-layout-v2";

type PersistedShape = {
  layout: Record<string, GridItem>;
  visibleWidgets: string[];
  preset: DashboardPresetId;
  activeLayoutName: string;
};

function saveLocal(state: DashboardState) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedShape = {
      layout: state.layout,
      visibleWidgets: [...state.visibleWidgets],
      preset: state.preset,
      activeLayoutName: state.activeLayoutName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

function loadLocal(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedShape;
  } catch {
    return null;
  }
}

// ── Store ─────────────────────────────────────────────────────────────

const initialPeriod = computePeriod("30d");
const initialComp = computeComparison("previous_period", initialPeriod.from, initialPeriod.to);
const initialPresetState = presetToState("default");

export const useDashboardStore = create<DashboardState & DashboardActions>()((set, get) => ({
  periodPreset: "30d",
  ...initialPeriod,
  comparisonMode: "previous_period",
  ...initialComp,
  filters: {
    pipelineId: null,
    ownerId: null,
    source: null,
    status: "ALL",
  },
  layout: initialPresetState.layout,
  visibleWidgets: initialPresetState.visibleWidgets,
  preset: "default",
  activeLayoutName: "Padrão",
  dirty: false,

  setPeriod: (preset, customFrom, customTo) => {
    const period = computePeriod(preset, customFrom, customTo);
    const { comparisonMode } = get();
    const comp = computeComparison(comparisonMode, period.from, period.to);
    set({ periodPreset: preset, ...period, ...comp });
  },

  setComparison: (mode, customFrom, customTo) => {
    const { from, to } = get();
    const comp = computeComparison(mode, from, to, customFrom, customTo);
    set({ comparisonMode: mode, ...comp });
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }));
  },

  applyGridLayout: (items) => {
    set((s) => {
      const next: Record<WidgetId, GridItem> = { ...s.layout };
      for (const it of items) {
        const prev = next[it.i];
        if (!prev) continue;
        next[it.i] = { ...prev, x: it.x, y: it.y, w: it.w, h: it.h };
      }
      const updated: DashboardState = { ...s, layout: next, dirty: true, preset: s.preset === "custom" ? "custom" : s.preset };
      saveLocal(updated);
      return { layout: next, dirty: true };
    });
  },

  toggleWidget: (id) => {
    set((s) => {
      const next = new Set(s.visibleWidgets);
      let layout = { ...s.layout };
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!layout[id]) {
          const def = WIDGET_REGISTRY[id];
          if (def) {
            const maxY = Math.max(
              0,
              ...Object.values(layout).map((g) => g.y + g.h),
            );
            layout = {
              ...layout,
              [id]: {
                i: id,
                x: def.defaults.x,
                y: maxY,
                w: def.defaults.w,
                h: def.defaults.h,
                minW: def.defaults.minW,
                minH: def.defaults.minH,
              },
            };
          }
        }
      }
      const updated: DashboardState = {
        ...s,
        visibleWidgets: next,
        layout,
        dirty: true,
        preset: "custom",
      };
      saveLocal(updated);
      return { visibleWidgets: next, layout, dirty: true, preset: "custom" };
    });
  },

  applyPreset: (presetId) => {
    if (presetId === "custom") return;
    const def = DASHBOARD_PRESETS[presetId];
    if (!def) return;
    const { layout, visibleWidgets } = presetToState(presetId);
    set((s) => {
      const updated: DashboardState = {
        ...s,
        layout,
        visibleWidgets,
        preset: presetId,
        dirty: true,
      };
      saveLocal(updated);
      return { layout, visibleWidgets, preset: presetId, dirty: true };
    });
  },

  resetLayout: () => {
    const { layout, visibleWidgets } = presetToState("default");
    set((s) => {
      const updated: DashboardState = {
        ...s,
        layout,
        visibleWidgets,
        preset: "default",
        dirty: true,
      };
      saveLocal(updated);
      return { layout, visibleWidgets, preset: "default", dirty: true };
    });
  },

  markSaved: () => set({ dirty: false }),

  hydrate: ({ layout, visibleWidgets, preset, activeLayoutName }) => {
    set((s) => {
      const next: DashboardState = {
        ...s,
        layout,
        visibleWidgets: new Set(visibleWidgets),
        preset,
        activeLayoutName: activeLayoutName ?? s.activeLayoutName,
        dirty: false,
      };
      saveLocal(next);
      return {
        layout,
        visibleWidgets: new Set(visibleWidgets),
        preset,
        activeLayoutName: activeLayoutName ?? s.activeLayoutName,
        dirty: false,
      };
    });
  },
}));

/**
 * Hidrata o store com o que estiver salvo em localStorage. Chame cedo
 * no componente raiz pra evitar flash do layout default. Depois o
 * client deve fazer um GET /api/dashboard/layout e chamar `hydrate`
 * novamente com o dado do banco (fonte da verdade).
 */
export function initDashboardLayout() {
  const local = loadLocal();
  if (!local) return;
  const visible = new Set<WidgetId>(local.visibleWidgets as WidgetId[]);
  // Sanitiza: remove ids que não existem mais no catálogo (schema drift).
  for (const id of Array.from(visible)) {
    if (!WIDGET_REGISTRY[id]) visible.delete(id);
  }
  const layout = Object.fromEntries(
    Object.entries(local.layout).filter(([id]) => WIDGET_REGISTRY[id as WidgetId]),
  ) as Record<WidgetId, GridItem>;
  useDashboardStore.setState({
    layout,
    visibleWidgets: visible,
    preset: local.preset ?? "custom",
    activeLayoutName: local.activeLayoutName ?? "Padrão",
    dirty: false,
  });
}
