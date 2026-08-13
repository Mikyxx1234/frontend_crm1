/*
 * Endpoint REST de usuários da org — usado pelo AssigneePopover
 * do DealDetailPanel (/pipeline/kanban-v2).
 *
 * URL idêntica à consumida pelo /inbox e /pipeline legados.
 */

import { fetchTeamUsers } from "@/features/shared/queries/team-users";

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

/** GET /api/users — delega no fetcher canônico (shape normalizado). */
export async function listTeamUsers(opts?: {
  includeAi?: boolean;
}): Promise<TeamUser[]> {
  return fetchTeamUsers<TeamUser>(opts);
}
