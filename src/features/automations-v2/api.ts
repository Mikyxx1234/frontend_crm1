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
