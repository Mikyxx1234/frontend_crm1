/*
 * Camada de API da Distribuição Inteligente (frontend).
 *
 * Endpoints (backend, todos gateados por widget `smart_distribution`):
 *   GET   /api/distribution/responsibles            -> { responsibles }
 *   PATCH /api/distribution/responsibles/[userId]   -> { responsible }
 *   POST  /api/distribution/simulate                -> DistributionResult
 *   POST  /api/distribution/execute                 -> DistributionResult
 *   POST  /api/agents/[userId]/status               -> presença online/offline
 */

import { apiUrl } from "@/lib/api";
import { isPageMockMode } from "@/lib/page-mock-mode";

import type {
  AgentOnlineStatus,
  DistributionResult,
  PendingResponse,
  ResponsiblesResponse,
  RetryResult,
  UpdateResponsibleInput,
} from "./types";
import {
  MOCK_DISTRIBUTION_PENDING,
  MOCK_DISTRIBUTION_RESPONSIBLES,
} from "./mock";

async function getJson<T>(path: string, errLabel: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  const text = await res.text();
  if (!res.ok) {
    let message = errLabel;
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      /* corpo nao-JSON */
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
      /* corpo nao-JSON */
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

export function fetchResponsibles(): Promise<ResponsiblesResponse> {
  if (isPageMockMode()) {
    return Promise.resolve(MOCK_DISTRIBUTION_RESPONSIBLES);
  }
  return getJson<ResponsiblesResponse>(
    "/api/distribution/responsibles",
    "Erro ao carregar responsáveis.",
  );
}

export function updateResponsible(
  userId: string,
  input: UpdateResponsibleInput,
): Promise<{ responsible: unknown }> {
  return sendJson(
    `/api/distribution/responsibles/${userId}`,
    "PATCH",
    input,
    "Erro ao atualizar responsável.",
  );
}

export function simulateDistribution(): Promise<DistributionResult> {
  return sendJson<DistributionResult>(
    "/api/distribution/simulate",
    "POST",
    {},
    "Erro ao simular distribuição.",
  );
}

export function setAgentStatus(
  userId: string,
  status: AgentOnlineStatus,
): Promise<void> {
  return sendJson<void>(
    `/api/agents/${userId}/status`,
    "PUT",
    { status },
    "Erro ao alterar status.",
  );
}

export function fetchPending(): Promise<PendingResponse> {
  if (isPageMockMode()) {
    return Promise.resolve(MOCK_DISTRIBUTION_PENDING);
  }
  return getJson<PendingResponse>(
    "/api/distribution/pending",
    "Erro ao carregar a fila de espera.",
  );
}

export function retryPending(): Promise<RetryResult> {
  return sendJson<RetryResult>(
    "/api/distribution/pending/retry",
    "POST",
    {},
    "Erro ao reprocessar a fila de espera.",
  );
}

export interface DistributionSettings {
  respectDepartment: boolean;
}

export function fetchDistributionSettings(): Promise<DistributionSettings> {
  return getJson<DistributionSettings>(
    "/api/distribution/settings",
    "Erro ao carregar configurações de distribuição.",
  );
}

export function updateDistributionSettings(
  input: DistributionSettings,
): Promise<DistributionSettings> {
  return sendJson<DistributionSettings>(
    "/api/distribution/settings",
    "PUT",
    input,
    "Erro ao salvar configurações de distribuição.",
  );
}
