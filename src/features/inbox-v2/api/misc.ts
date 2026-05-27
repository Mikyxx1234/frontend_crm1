/*
 * Endpoints auxiliares: tags, atividades, templates, quick replies,
 * canais, pipelines, board, contatos, agentes, status, etc.
 *
 * Cada funcao corresponde a uma linha das tabelas 2.1, 2.4, 2.5, 2.6
 * do contrato Fase 1.
 */

import { apiUrl } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────
// Pipelines / Board (usados no dialog "Novo negocio" do /inbox)
// ─────────────────────────────────────────────────────────────────

export interface PipelineListItem {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface BoardStage {
  id: string;
  name: string;
  color?: string | null;
}

/** GET /api/pipelines */
export async function listPipelines(): Promise<PipelineListItem[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar pipelines",
    );
  }
  return Array.isArray(data) ? data : data.pipelines ?? data.items ?? [];
}

/** GET /api/pipelines/:id/board?status=OPEN */
export async function getPipelineBoard(pipelineId: string): Promise<BoardStage[]> {
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/board?status=OPEN`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar estagios",
    );
  }
  return Array.isArray(data) ? data : data.stages ?? [];
}

// ─────────────────────────────────────────────────────────────────
// Permissoes / Capacidade / Agentes
// ─────────────────────────────────────────────────────────────────

/** GET /api/settings/permissions */
export async function getPermissions(): Promise<{ scopeGrants?: unknown }> {
  const res = await fetch(apiUrl("/api/settings/permissions"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao carregar permissoes",
    );
  }
  return data as { scopeGrants?: unknown };
}

export type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

/** GET /api/agents/:userId/status */
export async function getAgentStatus(userId: string): Promise<{ status: AgentOnlineStatus }> {
  const res = await fetch(apiUrl(`/api/agents/${userId}/status`));
  return res.json() as Promise<{ status: AgentOnlineStatus }>;
}

/** POST /api/agents/:id/status */
export async function setAgentStatus(
  userId: string,
  status: AgentOnlineStatus,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/agents/${userId}/status`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar status");
}

export interface AgentCapacity {
  activeConversations: number;
  maxConcurrent: number;
  loadPct: number;
  tone: "healthy" | "busy" | "overloaded";
}

/** GET /api/inbox/agent-capacity */
export async function getAgentCapacity(): Promise<AgentCapacity> {
  const res = await fetch(apiUrl("/api/inbox/agent-capacity"));
  if (!res.ok) throw new Error("Erro ao carregar capacidade");
  return res.json() as Promise<AgentCapacity>;
}

// ─────────────────────────────────────────────────────────────────
// Self-assign / Users
// ─────────────────────────────────────────────────────────────────

export interface SelfAssignResponse {
  settings: Record<string, boolean>;
  self: { role: string | null; canSelfAssign: boolean };
}

/** GET /api/settings/self-assign */
export async function getSelfAssignCapability(): Promise<SelfAssignResponse> {
  const res = await fetch(apiUrl("/api/settings/self-assign"));
  if (!res.ok) throw new Error("Erro ao carregar permissoes self-assign");
  return res.json() as Promise<SelfAssignResponse>;
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
}

/** GET /api/users */
export async function listUsers(): Promise<TeamUser[]> {
  const res = await fetch(apiUrl("/api/users"));
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(
      typeof (data as { message?: unknown })?.message === "string"
        ? (data as { message: string }).message
        : "Erro ao carregar equipe",
    );
  }
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────────
// Contato (sidebar direito)
// ─────────────────────────────────────────────────────────────────

export interface ContactDetail {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  cpf?: string | null;
  rg?: string | null;
  cep?: string | null;
  addressNumber?: string | null;
  birthDate?: string | null;
  createdAt?: string | null;
  tags?: { id: string; name: string; color: string | null }[];
  notes?: string | null;
  deals?: {
    id: string;
    title: string;
    value: number;
    stageId: string;
    stageName?: string | null;
    productName?: string | null;
  }[];
  activities?: {
    id: string;
    type: string;
    title: string;
    scheduledAt?: string | null;
    completedAt?: string | null;
  }[];
}

/** GET /api/contacts/:id */
export async function getContact(contactId: string): Promise<ContactDetail> {
  const res = await fetch(apiUrl(`/api/contacts/${contactId}`));
  if (!res.ok) throw new Error("Erro ao carregar contato");
  return res.json() as Promise<ContactDetail>;
}

/** PATCH /api/contacts/:id */
export async function updateContact(
  contactId: string,
  patch: Partial<ContactDetail>,
): Promise<ContactDetail> {
  const res = await fetch(apiUrl(`/api/contacts/${contactId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao atualizar contato",
    );
  }
  return data as ContactDetail;
}

// ─────────────────────────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

/** GET /api/tags */
export async function listTags(): Promise<Tag[]> {
  const res = await fetch(apiUrl("/api/tags"));
  if (!res.ok) throw new Error("Erro ao carregar tags");
  const data = await res.json();
  return Array.isArray(data) ? data : data.tags ?? [];
}

/** POST /api/tags */
export async function createTag(payload: {
  name: string;
  color?: string;
}): Promise<Tag> {
  const res = await fetch(apiUrl("/api/tags"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Erro ao criar tag",
    );
  }
  return data as Tag;
}

/** POST /api/conversations/:id/tags */
export async function setConversationTags(
  conversationId: string,
  tagIds: string[],
): Promise<void> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/tags`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagIds }),
  });
  if (!res.ok) throw new Error("Erro ao atualizar tags");
}

// ─────────────────────────────────────────────────────────────────
// Quick replies / Templates / Channels
// ─────────────────────────────────────────────────────────────────

export interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
}

/** GET /api/quick-replies */
export async function listQuickReplies(): Promise<QuickReply[]> {
  const res = await fetch(apiUrl("/api/quick-replies"));
  if (!res.ok) throw new Error("Erro ao carregar respostas rapidas");
  const data = await res.json();
  return Array.isArray(data) ? data : data.items ?? [];
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  category?: string;
  body?: string;
  language?: string;
}

/** GET /api/whatsapp-template-configs/agent-enabled */
export async function listAgentEnabledTemplates(): Promise<WhatsappTemplate[]> {
  const res = await fetch(apiUrl("/api/whatsapp-template-configs/agent-enabled"));
  if (!res.ok) throw new Error("Erro ao carregar templates");
  const data = await res.json();
  return Array.isArray(data) ? data : data.items ?? [];
}

export interface ChannelConfig {
  id: string;
  name: string;
  kind: string;
}

/** GET /api/channels */
export async function listChannels(): Promise<ChannelConfig[]> {
  const res = await fetch(apiUrl("/api/channels"));
  if (!res.ok) throw new Error("Erro ao carregar canais");
  const data = await res.json();
  return Array.isArray(data) ? data : data.items ?? [];
}

// ─────────────────────────────────────────────────────────────────
// Atividades / Inbox stats
// ─────────────────────────────────────────────────────────────────

export interface ActivityPayload {
  type: "CALL" | "MEETING" | "TASK" | "OTHER" | string;
  title: string;
  contactId?: string;
  conversationId?: string;
  dealId?: string;
  scheduledAt?: string;
}

/** POST /api/activities */
export async function createActivity(payload: ActivityPayload): Promise<void> {
  const res = await fetch(apiUrl("/api/activities"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erro ao criar atividade");
}

/** GET /api/inbox/daily-stats */
export async function getDailyStats(): Promise<{
  resolved: number;
  responded: number;
  pending: number;
  total: number;
}> {
  const res = await fetch(apiUrl("/api/inbox/daily-stats"));
  if (!res.ok) {
    return { resolved: 0, responded: 0, pending: 0, total: 0 };
  }
  return res.json();
}
