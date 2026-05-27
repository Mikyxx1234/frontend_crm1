/*
 * Adapters Inbox v2 — convertem os DTOs vindos do backend
 * (ConversationListRow, InboxMessageDto, ContactDetail, etc.) para
 * os tipos VISUAIS que os componentes do v0 (components/crm/*)
 * esperam (Conversation, Message, ContactAside.contact).
 *
 * Princípio: nunca mudar o DTO; a tradução acontece SEMPRE aqui.
 * Se o componente v0 mudar uma prop, é só atualizar a função
 * correspondente, sem espalhar mapping pelo código.
 */

import type { Conversation } from "@/components/crm/conversation-card";
import type { Message } from "@/components/crm/message-bubble";

import type {
  ContactDetail,
  ConversationListRow,
  InboxMessageDto,
} from "./api";

// ─────────────────────────────────────────────────────────────────
// Helpers compartilhados
// ─────────────────────────────────────────────────────────────────

/** 6 cores que o `ConversationCard` e `MessageBubble` aceitam. */
const CONV_COLORS = [
  "blue",
  "teal",
  "orange",
  "purple",
  "pink",
  "coral",
] as const satisfies readonly Conversation["avatarColor"][];

/** Hash determinístico de nome → cor. Mesmo nome sempre tem a mesma cor. */
export function colorFromName(name: string | null | undefined): Conversation["avatarColor"] {
  const safe = (name ?? "").trim();
  if (!safe) return "coral";
  let sum = 0;
  for (let i = 0; i < safe.length; i += 1) {
    sum += safe.charCodeAt(i);
  }
  return CONV_COLORS[sum % CONV_COLORS.length];
}

/** Iniciais (até 2 chars maiúsculas) — "Ana Silva" → "AS". */
export function avatarInitials(name: string | null | undefined): string {
  const safe = (name ?? "").trim();
  if (!safe) return "?";
  return safe
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** "Agora", "5min", "2h", "14:20", "ontem", "3d", "2sem", "10/03". */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const sameDay = isSameDay(date, new Date());
  if (sameDay) return `${hh}:${mm}`;
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 1) return "ontem";
  if (diffDay < 7) return `${diffDay}d`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}sem`;
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mo}`;
}

/** "HH:mm" — usado nos bubbles do chat. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Heurística: contato "online" se houve atividade nos últimos 5min. */
function deriveOnline(lastInboundAt: string | null | undefined): "online" | "offline" {
  if (!lastInboundAt) return "offline";
  const d = new Date(lastInboundAt);
  if (Number.isNaN(d.getTime())) return "offline";
  return Date.now() - d.getTime() < 5 * 60_000 ? "online" : "offline";
}

/**
 * Deriva o "badge" semantico a partir das tags do contato / estado da
 * conversa. A versao nova do `ConversationCard` (v0 ajustes-v3) NAO
 * exibe mais o badge no card — mas o tipo continua sendo retornado
 * porque o `ChatContactView` e o `toContactStatus` o usam para
 * o header do chat (Enterprise / Lead / Cliente).
 */
export type ConversationBadge = "enterprise" | "lead" | "success";

function deriveBadge(row: ConversationListRow): ConversationBadge | undefined {
  const tagNames = (row.tags ?? []).map((t) => (t.name ?? "").toLowerCase());
  if (tagNames.some((n) => n === "vip" || n.includes("enterprise"))) {
    return "enterprise";
  }
  if (row.status === "RESOLVED") return "success";
  if (tagNames.some((n) => n === "lead" || n.includes("lead"))) return "lead";
  return undefined;
}

// ─────────────────────────────────────────────────────────────────
// Adapters
// ─────────────────────────────────────────────────────────────────

/** ConversationListRow → Conversation (card da coluna esquerda). */
export function toConversationCard(
  row: ConversationListRow,
  options?: { active?: boolean },
): Conversation {
  const name = row.contact?.name?.trim() || "Sem nome";
  const lastActivity = row.lastMessageAt ?? row.lastInboundAt ?? null;
  return {
    id: row.id,
    name,
    initials: avatarInitials(name),
    avatarColor: colorFromName(name),
    status: deriveOnline(row.lastInboundAt),
    time: formatRelative(lastActivity),
    preview: row.lastMessage?.preview ?? "",
    assignee: row.assignedTo?.name,
    // O card novo nao tem mais contador. Mapeamos unread > 0 para o
    // marcador visual `urgent` (relogio vermelho) — preserva o sinal
    // de "atencao necessaria" sem badge numerico.
    urgent: !!(row.unreadCount && row.unreadCount > 0),
    active: options?.active,
    inactive: row.status !== "OPEN",
  };
}

/** InboxMessageDto → Message (bolha do chat). */
export function toMessageBubble(
  dto: InboxMessageDto,
  contactName: string,
): Message {
  // Backend serializa direction em minúsculas ("in" / "out" / "system").
  // Aceitamos também as variantes UPPER por defesa (caso outro endpoint
  // ou SSE futuro mude o casing — nunca regredir o lado dos balões).
  const dir = String(dto.direction ?? "").toLowerCase();
  const isInbound = dir === "in" || dir === "inbound";
  return {
    id: dto.id,
    content: dto.content ?? "",
    time: formatTime(dto.createdAt),
    type: isInbound ? "incoming" : "outgoing",
    senderInitials: isInbound ? avatarInitials(contactName) : undefined,
  };
}

/** Header do ChatArea (contact pill). */
export interface ChatContactView {
  name: string;
  initials: string;
  avatarColor: Conversation["avatarColor"];
  status: Conversation["status"];
  badge?: ConversationBadge;
  phone: string;
  contactId: string;
}

export function toChatContact(row: ConversationListRow): ChatContactView {
  const name = row.contact?.name?.trim() || "Sem nome";
  return {
    name,
    initials: avatarInitials(name),
    avatarColor: colorFromName(name),
    status: deriveOnline(row.lastInboundAt),
    badge: deriveBadge(row),
    phone: row.contact?.phone ?? "",
    contactId: row.contact?.id ?? row.id,
  };
}

// ─────────────────────────────────────────────────────────────────
// Stage pills (header do chat) — usa o pipeline real quando houver
// ─────────────────────────────────────────────────────────────────

export interface StagePillView {
  label: string;
  status: "done" | "active" | "pending";
}

/**
 * Deriva os pills de estágio a partir do board do pipeline padrão.
 * Marca como `done` todos os estágios anteriores ao current, `active`
 * o atual e `pending` os posteriores. Se o backend ainda não tiver
 * estágio na conversa, devolve array vazio.
 */
export function deriveStagePills(
  stages: { id: string; name: string }[],
  currentStageId: string | null,
): StagePillView[] {
  if (!stages.length) return [];
  if (!currentStageId) {
    return stages.map((s) => ({ label: s.name, status: "pending" }));
  }
  let foundCurrent = false;
  return stages.map((s) => {
    if (s.id === currentStageId) {
      foundCurrent = true;
      return { label: s.name, status: "active" };
    }
    return {
      label: s.name,
      status: (foundCurrent ? "pending" : "done") as "done" | "pending",
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Sidebar direito — ContactAside.contact
// ─────────────────────────────────────────────────────────────────

export interface ContactAsideView {
  name: string;
  initials: string;
  avatarColor: Conversation["avatarColor"];
  status: Conversation["status"];
  contactId: string;
  assignee?: string;
  financialStatus: "success" | "lead" | "enterprise";
  financialLabel: string;
  product: string;
  origin: string;
  formation: string;
  entry: string;
  phone: string;
  email: string;
  cpf: string;
  rg: string;
  cep: string;
  addressNumber: string;
  birthDate: string;
  createdAt: string;
  tag: string;
  note?: string;
  activities: { text: string; time: string; color?: string }[];
}

const FALLBACK_FIELD = "—";

function toFinancialStatus(
  row: ConversationListRow,
): { status: ContactAsideView["financialStatus"]; label: string } {
  const badge = deriveBadge(row);
  if (badge === "enterprise") return { status: "enterprise", label: "Enterprise" };
  if (badge === "success") return { status: "success", label: "Adimplente" };
  return { status: "lead", label: "Lead" };
}

function formatDateBr(iso: string | null | undefined): string {
  if (!iso) return FALLBACK_FIELD;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return FALLBACK_FIELD;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Mapeia o ContactDetail + ConversationListRow ativo para o shape
 * que o `<ContactAside>` espera.
 *
 * Muitos campos exibidos no v0 (CPF, RG, formação, etc.) podem
 * não estar presentes no payload atual do backend — mapeamos pra
 * "—" como fallback, sem quebrar o layout.
 */
export function toContactAside(
  contact: ContactDetail | undefined | null,
  row: ConversationListRow,
): ContactAsideView {
  const name = contact?.name ?? row.contact?.name ?? "Sem nome";
  const financial = toFinancialStatus(row);
  const tags = contact?.tags ?? row.tags ?? [];
  const firstDeal = contact?.deals?.[0];
  const activities = (contact?.activities ?? []).slice(0, 5).map((a) => ({
    text: a.title,
    time: formatRelative(a.completedAt ?? a.scheduledAt ?? null) || FALLBACK_FIELD,
    color:
      a.type === "CALL"
        ? "var(--color-success)"
        : a.type === "MEETING"
          ? "var(--brand-primary)"
          : undefined,
  }));

  return {
    name,
    initials: avatarInitials(name),
    avatarColor: colorFromName(name),
    status: deriveOnline(row.lastInboundAt),
    contactId: contact?.id ?? row.contact?.id ?? row.id,
    assignee: row.assignedTo?.name,
    financialStatus: financial.status,
    financialLabel: financial.label,
    product: firstDeal?.productName ?? FALLBACK_FIELD,
    origin: FALLBACK_FIELD,
    formation: FALLBACK_FIELD,
    entry: FALLBACK_FIELD,
    phone: contact?.phone ?? row.contact?.phone ?? FALLBACK_FIELD,
    email: contact?.email ?? row.contact?.email ?? FALLBACK_FIELD,
    cpf: contact?.cpf ?? FALLBACK_FIELD,
    rg: contact?.rg ?? FALLBACK_FIELD,
    cep: contact?.cep ?? FALLBACK_FIELD,
    addressNumber: contact?.addressNumber ?? FALLBACK_FIELD,
    birthDate: formatDateBr(contact?.birthDate),
    createdAt: formatDateBr(contact?.createdAt),
    tag: tags[0]?.name ?? FALLBACK_FIELD,
    note: contact?.notes ?? undefined,
    activities,
  };
}

// ─────────────────────────────────────────────────────────────────
// Session expirada? (alerta de 24h da WhatsApp Business)
// ─────────────────────────────────────────────────────────────────

const SESSION_WINDOW_HOURS = 24;

export function isSessionExpired(
  lastInboundAt: string | null | undefined,
  windowHours = SESSION_WINDOW_HOURS,
): boolean {
  if (!lastInboundAt) return true;
  const d = new Date(lastInboundAt);
  if (Number.isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() > windowHours * 60 * 60 * 1000;
}
