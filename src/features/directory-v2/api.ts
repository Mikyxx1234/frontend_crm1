/*
 * Camada de API da Fase 2 — diretórios (contatos, empresas) e
 * atividades para o segmento `/v2/*`.
 *
 * Os endpoints batidos aqui já existiam:
 *   GET /api/contacts?search&page&perPage&sortBy&sortOrder
 *   GET /api/companies?search&page&perPage
 *   GET /api/activities?type&completed&page&perPage
 *
 * Toda chamada usa `getJson` para diferenciar "sessão expirada"
 * (corpo vazio do redirect /login) de "erro real do backend".
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

// ─────────────────────────────────────────────────────────────────
// Contatos
// ─────────────────────────────────────────────────────────────────

export interface ContactListItemDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  leadScore: number | null;
  lifecycleStage: string | null;
  createdAt: string;
  company: { id: string; name: string; domain: string | null } | null;
  // O backend (getContacts) ja achata as tags: `tags: c.tags.map((t) => t.tag)`,
  // entao a resposta vem como [{ id, name, color }], NAO [{ tag: {...} }].
  tags: { id: string; name: string; color: string | null }[];
}

export interface ContactListPage {
  items: ContactListItemDto[];
  total: number;
  page: number;
  perPage: number;
}

export interface FetchContactsParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export function fetchContacts(params: FetchContactsParams = {}): Promise<ContactListPage> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  return getJson<ContactListPage>(
    `/api/contacts${qs ? `?${qs}` : ""}`,
    "Erro ao carregar contatos.",
  );
}

// ─────────────────────────────────────────────────────────────────
// Empresas
// ─────────────────────────────────────────────────────────────────

export interface CompanyListItemDto {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  _count: { contacts: number };
}

export interface CompanyListPage {
  items: CompanyListItemDto[];
  total: number;
  page: number;
  perPage: number;
}

export interface FetchCompaniesParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export function fetchCompanies(params: FetchCompaniesParams = {}): Promise<CompanyListPage> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  return getJson<CompanyListPage>(
    `/api/companies${qs ? `?${qs}` : ""}`,
    "Erro ao carregar empresas.",
  );
}

// ─────────────────────────────────────────────────────────────────
// Atividades
// ─────────────────────────────────────────────────────────────────

export type ActivityTypeDto = "CALL" | "MEETING" | "EMAIL" | "TASK" | "OTHER";

export interface ActivityListItemDto {
  id: string;
  type: ActivityTypeDto;
  title: string;
  description: string | null;
  completed: boolean;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null; avatarUrl: string | null } | null;
  contact: { id: string; name: string; email: string | null } | null;
  deal: { id: string; title: string; stageId: string } | null;
}

export interface ActivityListPage {
  items: ActivityListItemDto[];
  total: number;
  page: number;
  perPage: number;
}

export interface FetchActivitiesParams {
  type?: ActivityTypeDto;
  completed?: boolean;
  page?: number;
  perPage?: number;
}

export function fetchActivities(
  params: FetchActivitiesParams = {},
): Promise<ActivityListPage> {
  const sp = new URLSearchParams();
  if (params.type) sp.set("type", params.type);
  if (params.completed !== undefined) sp.set("completed", String(params.completed));
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  return getJson<ActivityListPage>(
    `/api/activities${qs ? `?${qs}` : ""}`,
    "Erro ao carregar atividades.",
  );
}
