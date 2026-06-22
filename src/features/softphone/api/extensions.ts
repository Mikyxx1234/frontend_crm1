import type {
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

export async function getMyCredentials(): Promise<SipCredentials> {
  const data = await fetchJson<{ credentials: SipCredentials }>(
    `${BASE}/sip-extensions/me/credentials`,
  );
  return data.credentials;
}

export async function connectApi4Com(email: string, password: string) {
  return fetchJson<{ extension: SipExtension; api4com: { domain: string; ramal: string; wsServer: string } }>(
    `${BASE}/sip-extensions/connect-api4com`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
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

export async function listCalls(filters: ListCallsFilters = {}): Promise<ListCallsResponse> {
  const params = new URLSearchParams();
  if (filters.extensionId) params.set("extensionId", filters.extensionId);
  if (filters.direction) params.set("direction", filters.direction);
  if (filters.contactId) params.set("contactId", filters.contactId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("perPage", String(filters.perPage));

  return fetchJson<ListCallsResponse>(`${BASE}/calls?${params.toString()}`);
}
