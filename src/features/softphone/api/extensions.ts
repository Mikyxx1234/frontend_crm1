import type {
  Api4ComIntegration,
  DialApi4ComContext,
  ListCallsFilters,
  ListCallsResponse,
  SipCredentials,
  SipExtension,
} from "./types";

const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listExtensions(): Promise<SipExtension[]> {
  const data = await fetchJson<{ extensions: SipExtension[] }>(`${BASE}/sip-extensions`);
  return data.extensions;
}

export async function getApi4ComIntegration(): Promise<Api4ComIntegration> {
  return fetchJson<Api4ComIntegration>(`${BASE}/call-provider-configs/api4com`);
}

export async function updateApi4ComIntegration(input: {
  serviceToken?: string | null;
  gateway?: string;
}): Promise<Api4ComIntegration> {
  return fetchJson<Api4ComIntegration>(`${BASE}/call-provider-configs/api4com`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getMyCredentials(): Promise<SipCredentials> {
  const data = await fetchJson<{ credentials: SipCredentials | null }>(
    `${BASE}/sip-extensions/me/credentials`,
  );
  if (!data.credentials) {
    throw new Error("Nenhum ramal SIP configurado para este usuário.");
  }
  return data.credentials;
}

/**
 * Variante pra queries de "feature gate" (widgets que só verificam se o
 * usuário tem ramal): 404 resolve `null` em vez de lançar. Sem isso o
 * React Query trata como erro (sempre stale) e refaz o 404 a cada
 * mount/navegação fria. O fluxo de conexão SIP (`use-softphone`)
 * continua usando `getMyCredentials` (que lança) — lá o erro importa.
 */
export async function getMyCredentialsOrNull(): Promise<SipCredentials | null> {
  const res = await fetch(`${BASE}/sip-extensions/me/credentials`);
  // 404 = backend antigo (pré 200-null); mantido p/ compat em rolling deploy.
  if (res.status === 404) return null;
  const body = (await res.json().catch(() => ({}))) as {
    credentials?: SipCredentials | null;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  const creds = body.credentials ?? null;
  if (!creds) return null;
  if (!creds.wsServer?.trim() || !creds.sipUri?.trim() || !creds.authUser?.trim()) {
    return null;
  }
  return creds;
}

export type ConnectApi4ComResponse = {
  extension: SipExtension;
  api4com: { domain: string; ramal: string; wsServer: string };
  webhook:
    | { configured: true }
    | {
        configured: false;
        webhookUrl: string;
        manualSetupRequired: true;
        reason: string;
      };
};

export async function connectApi4Com(
  email: string,
  password: string,
): Promise<ConnectApi4ComResponse> {
  return fetchJson<ConnectApi4ComResponse>(`${BASE}/sip-extensions/connect-api4com`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export type Api4ComStatus = {
  connected: boolean;
  email: string | null;
  ramal: string | null;
  domain: string | null;
  webhook: {
    configured: boolean;
    webhookUrl: string | null;
  };
};

export async function getApi4ComStatus(): Promise<Api4ComStatus> {
  return fetchJson<Api4ComStatus>(`${BASE}/sip-extensions/me/api4com-status`);
}

export async function disconnectApi4Com(): Promise<{ disconnected: true }> {
  return fetchJson<{ disconnected: true }>(`${BASE}/sip-extensions/me`, {
    method: "DELETE",
  });
}

export async function createExtension(data: {
  label: string;
  sipUri: string;
  authUser: string;
  authPassword: string;
  wsServer: string;
  stunServers?: string[];
}) {
  return fetchJson<{ extension: SipExtension }>(`${BASE}/sip-extensions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function dialApi4Com(phone: string, ctx?: DialApi4ComContext) {
  return fetchJson<{ ok: boolean; callId: string | null }>(
    `${BASE}/sip-extensions/dial-api4com`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, ...ctx }),
    },
  );
}

export async function syncCalls(): Promise<{
  ok: boolean;
  created: number;
  updated: number;
  reason?: string;
}> {
  return fetchJson(`${BASE}/calls/sync`, { method: "POST" });
}

export interface CallsStats {
  total: number;
  inbound: number;
  outbound: number;
  answered: number;
  completed: number;
}

export async function getCallsStats(
  filters: Pick<
    ListCallsFilters,
    "search" | "dateFrom" | "dateTo" | "extensionId" | "contactId"
  > = {},
): Promise<CallsStats> {
  const params = new URLSearchParams();
  if (filters.extensionId) params.set("extensionId", filters.extensionId);
  if (filters.contactId) params.set("contactId", filters.contactId);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return fetchJson<CallsStats>(`${BASE}/calls/stats?${params.toString()}`);
}

export async function listCalls(filters: ListCallsFilters = {}): Promise<ListCallsResponse> {
  const params = new URLSearchParams();
  if (filters.extensionId) params.set("extensionId", filters.extensionId);
  if (filters.direction) params.set("direction", filters.direction);
  if (filters.contactId) params.set("contactId", filters.contactId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDir) params.set("sortDir", filters.sortDir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("perPage", String(filters.perPage));

  return fetchJson<ListCallsResponse>(`${BASE}/calls?${params.toString()}`);
}
