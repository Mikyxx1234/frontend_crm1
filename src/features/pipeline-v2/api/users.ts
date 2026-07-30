/*
 * Endpoint REST de usuários da org — usado pelo AssigneePopover
 * do DealDetailPanel (/pipeline/kanban-v2).
 *
 * URL idêntica à consumida pelo /inbox e /pipeline legados.
 */

import { apiUrl } from "@/lib/api";

export interface TeamUser {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  /** HUMAN | AI — presente quando includeAi=1. */
  type?: string | null;
  avatarUrl?: string | null;
  /** Presença de USO do CRM (aba aberta) — separada do status da Distribuição. */
  systemOnline?: boolean;
  lastSeenAt?: string | null;
}

/** GET /api/users — lista usuários da organização. */
export async function listTeamUsers(opts?: {
  includeAi?: boolean;
}): Promise<TeamUser[]> {
  const q = opts?.includeAi ? "?includeAi=1" : "";
  const res = await fetch(apiUrl(`/api/users${q}`));
  if (!res.ok) throw new Error("Erro ao carregar usuarios");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.users ?? []);
}
