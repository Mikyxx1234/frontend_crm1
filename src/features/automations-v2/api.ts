/*
 * Fetchers e tipos da Fase 3 — Automações.
 *
 * Endpoints cabeados:
 *   GET /api/automations?active&search&page&perPage&triggerType
 *   GET /api/automations/:id
 *
 * O builder do ZIP é gráfico (ramificação x/y); o backend é LINEAR
 * (AutomationStep.position). Aqui o "builder" mostra os steps em
 * cadeia (visualização linear). Ramificação fica fora de escopo
 * até o schema evoluir.
 */

import { apiUrl } from "@/lib/api";
import { isPageMockMode } from "@/lib/page-mock-mode";
import { mockAutomationsPage } from "./mock-automations";

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

export interface AutomationListItemDto {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: unknown;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  stepCount: number;
  /** Tipos dos passos na ordem (vocabulário backend, ex.: "send_email"). */
  stepTypes?: string[];
  /**
   * Métricas reais agregadas pelo backend (buildAutomationListStats).
   * Opcionais porque o endpoint de detalhe (GET /api/automations/:id) não
   * as retorna — apenas a listagem (GET /api/automations).
   */
  runs?: number;
  runsToday?: number;
  successRate?: number;
  lastRunAt?: string | null;
}

export interface AutomationListPage {
  items: AutomationListItemDto[];
  total: number;
  page: number;
  perPage: number;
}

export interface AutomationStepDto {
  id: string;
  automationId: string;
  type: string;
  config: Record<string, unknown> | null;
  position: number;
}

export interface AutomationDetailDto extends AutomationListItemDto {
  steps: AutomationStepDto[];
}

export interface FetchAutomationsParams {
  active?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export function fetchAutomations(
  params: FetchAutomationsParams = {},
): Promise<AutomationListPage> {
  if (isPageMockMode()) {
    return Promise.resolve(mockAutomationsPage(params));
  }
  const sp = new URLSearchParams();
  if (params.active !== undefined) sp.set("active", String(params.active));
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  return getJson<AutomationListPage>(
    `/api/automations${qs ? `?${qs}` : ""}`,
    "Erro ao carregar automações.",
  );
}

export function fetchAutomation(id: string): Promise<AutomationDetailDto> {
  return getJson<AutomationDetailDto>(
    `/api/automations/${id}`,
    "Erro ao carregar automação.",
  );
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

export function toggleAutomationActive(id: string): Promise<AutomationListItemDto> {
  return sendJson<AutomationListItemDto>(
    `/api/automations/${id}/toggle`,
    "POST",
    undefined,
    "Erro ao alternar automação.",
  );
}

// ─────────────────────────────────────────────────────────────────
// CRUD + persistência de steps
// ─────────────────────────────────────────────────────────────────

export interface AutomationWriteBody {
  name?: string;
  description?: string | null;
  triggerType?: string;
  triggerConfig?: unknown;
  active?: boolean;
}

export interface AutomationStepInput {
  type: string;
  config?: Record<string, unknown> | null;
  position?: number;
}

export function createAutomation(body: AutomationWriteBody): Promise<AutomationDetailDto> {
  return sendJson<AutomationDetailDto>(
    "/api/automations",
    "POST",
    body,
    "Erro ao criar automação.",
  );
}

export function updateAutomation(
  id: string,
  body: AutomationWriteBody,
): Promise<AutomationDetailDto> {
  return sendJson<AutomationDetailDto>(
    `/api/automations/${id}`,
    "PATCH",
    body,
    "Erro ao atualizar automação.",
  );
}

export function deleteAutomation(id: string): Promise<{ ok: true }> {
  return sendJson<{ ok: true }>(
    `/api/automations/${id}`,
    "DELETE",
    undefined,
    "Erro ao excluir automação.",
  );
}

/**
 * Substitui a lista de steps de uma automação (ordem por `position`).
 * O backend é responsável por aceitar PUT /api/automations/:id/steps
 * com payload `{ steps: AutomationStepInput[] }`. Se o endpoint
 * ainda não existir, o erro será exibido via toast no client.
 */
export function saveAutomationSteps(
  id: string,
  steps: AutomationStepInput[],
): Promise<AutomationDetailDto> {
  const normalized = steps.map((s, i) => ({
    type: s.type,
    config: s.config ?? null,
    position: s.position ?? i,
  }));
  return sendJson<AutomationDetailDto>(
    `/api/automations/${id}/steps`,
    "PUT",
    { steps: normalized },
    "Erro ao salvar etapas.",
  );
}
