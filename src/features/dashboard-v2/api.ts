/*
 * API client do Dashboard V2 (dois níveis: Negócios e Atendimento).
 * Consome os endpoints novos /api/analytics/deals-overview e
 * /api/analytics/service-overview, além de /api/pipelines para o filtro.
 */

import { apiUrl } from "@/lib/api";

// ── Período ────────────────────────────────────────────────────────

export interface DashboardPeriod {
  from: string; // ISO
  to: string; // ISO
}

// ── Negócios ───────────────────────────────────────────────────────

export interface DealStageFlow {
  id: string;
  name: string;
  color: string;
  count: number;
  value: number;
  entered: number;
  exited: number;
  lost: number;
  won: number;
}

export interface DealsOverview {
  stages: DealStageFlow[];
  summary: {
    totalValue: number;
    totalDeals: number;
    winRate: number;
    avgTicket: number;
    deltas: { winRate: number; avgTicket: number };
  };
}

// ── Atendimento ────────────────────────────────────────────────────

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

export interface ServiceOverview {
  summary: {
    total: { value: string; delta: number };
    firstResponse: { value: string; delta: number };
    resolutionTime: { value: string; delta: number };
    resolutionRate: { value: string; delta: number };
  };
  volumeByDay: { day: string; recebidas: number; enviadas: number }[];
  responseTimeSeries: { hour: string; resposta: number; primeira: number }[];
  byConnection: DonutDatum[];
  byAttendant: DonutDatum[];
  byPlatform: {
    rows: Record<string, number | string>[];
    platforms: { key: string; label: string; color: string }[];
  };
  heatmap: {
    cells: { x: number; y: number; value: number }[];
    xLabels: string[];
    yLabels: string[];
  };
  attendantRanking: {
    id: string;
    name: string;
    attended: number;
    avgResponse: string;
    resolution: number;
  }[];
}

export interface PipelineOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

// ── Fetchers ───────────────────────────────────────────────────────

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Faz o GET e devolve o JSON. Trata o caso (comum neste backend) de
 * resposta 200 com corpo VAZIO quando a sessão não chega — converte num
 * erro legível em vez de devolver `{}` (que estouraria nos componentes).
 */
async function getJson<T>(path: string, errLabel: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  const text = await res.text();
  if (!res.ok) {
    let message = errLabel;
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(message);
  }
  if (!text.trim()) {
    throw new Error("Sessão expirada ou backend indisponível. Recarregue e faça login novamente.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // Resposta não-JSON (ex.: HTML da página de login após redirect do
    // middleware quando a sessão não é reconhecida pelo backend).
    throw new Error("Sessão não reconhecida pelo backend. Recarregue e faça login novamente.");
  }
}

export async function fetchDealsOverview(params: {
  period: DashboardPeriod;
  pipelineId?: string;
  ownerId?: string;
}): Promise<DealsOverview> {
  const qs = buildQuery({
    from: params.period.from,
    to: params.period.to,
    pipelineId: params.pipelineId,
    ownerId: params.ownerId,
  });
  return getJson<DealsOverview>(`/api/analytics/deals-overview${qs}`, "Erro ao carregar negócios");
}

export async function fetchServiceOverview(params: {
  period: DashboardPeriod;
}): Promise<ServiceOverview> {
  const qs = buildQuery({ from: params.period.from, to: params.period.to });
  return getJson<ServiceOverview>(`/api/analytics/service-overview${qs}`, "Erro ao carregar atendimento");
}

export async function fetchPipelines(): Promise<PipelineOption[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  const data = await res.json().catch(() => []);
  if (!res.ok) return [];
  const list = Array.isArray(data) ? data : data.pipelines ?? data.items ?? [];
  return list as PipelineOption[];
}
