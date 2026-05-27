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
  avatarUrl?: string | null;
}

/** GET /api/users — lista todos os usuários da organização. */
export async function listTeamUsers(): Promise<TeamUser[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) throw new Error("Erro ao carregar usuarios");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.users ?? []);
}
