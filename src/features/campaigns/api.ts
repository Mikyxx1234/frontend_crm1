/*
 * Camada de API das Campanhas v2 (frontend). Bate nas rotas já existentes:
 *   GET   /api/campaigns?status&type&page&perPage
 *   GET   /api/campaigns/[id]
 *   GET   /api/campaigns/[id]/stats
 *   GET   /api/campaigns/[id]/recipients?status&page&perPage
 *   POST  /api/campaigns                          -> cria rascunho
 *   POST  /api/campaigns/[id]/{launch|pause|resume|cancel}
 *   POST  /api/campaigns/preview                  -> contagem + amostra
 *   GET   /api/channels | /api/segments | /api/meta/whatsapp/message-templates
 *   GET   /api/kanban/filter-options              -> tags/pipelines/responsáveis
 */

import { apiUrl } from "@/lib/api";

import type {
  CampaignAction,
  CampaignDetail,
  CampaignFilters,
  CampaignStats,
  CampaignsListResponse,
  ChannelRow,
  CreateCampaignBody,
  PreviewResponse,
  RecipientsResponse,
  SegmentRow,
  TemplateRow,
} from "./types";

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
    throw new Error("Sessão expirada ou backend indisponível. Recarregue e faça login.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Sessão não reconhecida pelo backend. Recarregue e faça login.");
  }
}

async function sendJson<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
  errLabel: string,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
  if (!text.trim()) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}

// ── Campanhas ──────────────────────────────────────────

export interface FetchCampaignsParams {
  status?: string;
  type?: string;
  page?: number;
  perPage?: number;
}

export function fetchCampaigns(
  params: FetchCampaignsParams = {},
): Promise<CampaignsListResponse> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.type) sp.set("type", params.type);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  return getJson<CampaignsListResponse>(
    `/api/campaigns${qs ? `?${qs}` : ""}`,
    "Erro ao carregar campanhas.",
  );
}

export function fetchCampaign(id: string): Promise<CampaignDetail> {
  return getJson<{ campaign: CampaignDetail }>(
    `/api/campaigns/${id}`,
    "Campanha não encontrada.",
  ).then((d) => d.campaign);
}

export function fetchCampaignStats(id: string): Promise<CampaignStats> {
  return getJson<CampaignStats>(
    `/api/campaigns/${id}/stats`,
    "Erro ao carregar estatísticas.",
  );
}

export interface FetchRecipientsParams {
  status?: string;
  page?: number;
  perPage?: number;
}

export function fetchRecipients(
  id: string,
  params: FetchRecipientsParams = {},
): Promise<RecipientsResponse> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.page) sp.set("page", String(params.page));
  sp.set("perPage", String(params.perPage ?? 20));
  return getJson<RecipientsResponse>(
    `/api/campaigns/${id}/recipients?${sp.toString()}`,
    "Erro ao carregar destinatários.",
  );
}

export function createCampaign(
  body: CreateCampaignBody,
): Promise<{ campaign: { id: string } }> {
  return sendJson<{ campaign: { id: string } }>(
    "/api/campaigns",
    "POST",
    body,
    "Erro ao criar campanha.",
  );
}

export function runCampaignAction(
  id: string,
  action: CampaignAction,
): Promise<{ message?: string; status?: string }> {
  return sendJson(
    `/api/campaigns/${id}/${action}`,
    "POST",
    {},
    "Erro ao executar ação na campanha.",
  );
}

export function previewAudience(
  filters: CampaignFilters,
): Promise<PreviewResponse> {
  return sendJson<PreviewResponse>(
    "/api/campaigns/preview",
    "POST",
    { filters },
    "Erro ao pré-visualizar audiência.",
  );
}

// ── Recursos auxiliares (canais, segmentos, templates, opções) ──

export function fetchChannels(): Promise<ChannelRow[]> {
  return getJson<{ channels?: ChannelRow[] }>(
    "/api/channels",
    "Erro ao carregar canais.",
  ).then((d) => d.channels ?? []);
}

export function fetchSegments(): Promise<SegmentRow[]> {
  return getJson<{ segments?: SegmentRow[] }>(
    "/api/segments",
    "Erro ao carregar segmentos.",
  ).then((d) => d.segments ?? []);
}

export function fetchTemplates(): Promise<TemplateRow[]> {
  // Templates aprovados vem direto da WABA via Graph (message_templates).
  // A resposta da Meta tem o formato { data: [ { name, status, language, ... } ] }.
  return getJson<{ templates?: TemplateRow[]; data?: TemplateRow[] }>(
    "/api/meta/whatsapp/message-templates",
    "Erro ao carregar templates.",
  ).then((d) => d.templates ?? d.data ?? []);
}

export interface AudienceFilterOptions {
  tags: { id: string; name: string; color: string }[];
  pipelines: { id: string; name: string; stages: { id: string; name: string }[] }[];
  users: { id: string; name: string }[];
}

export function fetchAudienceOptions(): Promise<AudienceFilterOptions> {
  return getJson<{
    tags?: AudienceFilterOptions["tags"];
    pipelines?: AudienceFilterOptions["pipelines"];
    users?: AudienceFilterOptions["users"];
  }>("/api/kanban/filter-options", "Erro ao carregar opções de filtro.").then(
    (d) => ({
      tags: d.tags ?? [],
      pipelines: d.pipelines ?? [],
      users: d.users ?? [],
    }),
  );
}
