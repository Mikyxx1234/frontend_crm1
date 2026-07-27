import { apiUrl } from "@/lib/api";

import type {
  SystemUsageSessionsResponse,
  SystemUsageSummaryResponse,
} from "./types";

export async function fetchSystemUsageSummary(
  from: string,
  to: string,
): Promise<SystemUsageSummaryResponse> {
  const qs = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/logs/system-usage?${qs}`), {
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Acesso restrito a administradores/gestores.");
    }
    throw new Error("Falha ao carregar o resumo de uso do sistema.");
  }
  return (await res.json()) as SystemUsageSummaryResponse;
}

export async function fetchSystemUsageSessions(
  userId: string,
  from: string,
  to: string,
  cursor?: string | null,
): Promise<SystemUsageSessionsResponse> {
  const qs = new URLSearchParams({ from, to });
  if (cursor) qs.set("cursor", cursor);
  const res = await fetch(
    apiUrl(`/api/logs/system-usage/${encodeURIComponent(userId)}/sessions?${qs}`),
    { credentials: "include" },
  );
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Acesso restrito a administradores/gestores.");
    }
    throw new Error("Falha ao carregar sessões do usuário.");
  }
  return (await res.json()) as SystemUsageSessionsResponse;
}
