/*
 * Tipos compartilhados pela camada de API do /inbox-v2.
 *
 * Espelham os DTOs do backend conforme documentado em
 * `frontend/docs/inbox-api-contract.md`. Sao tipos PROVISORIOS:
 * conforme o backend evoluir, a unica fonte de verdade do shape
 * continua sendo o backend — esses tipos sao mantidos em paridade
 * para o frontend tipar corretamente.
 */

export type InboxTab =
  | "todos"
  | "entrada"
  | "esperando"
  | "respondidas"
  | "automacao"
  | "finalizados"
  | "erro";

export type ConversationStatus = "OPEN" | "RESOLVED" | "PENDING" | "SNOOZED";

export type Channel =
  | "whatsapp"
  | "meta"
  | "instagram"
  | "email"
  | "webchat"
  | "telegram"
  | string;

/**
 * Direção da mensagem conforme retornado pelo backend.
 *
 * Backend (`src/app/api/conversations/[id]/messages/route.ts`) serializa
 * em minúsculas: `"in" | "out" | "system"`. Esses valores são o
 * contrato real — qualquer adapter deve comparar contra `"in"` /
 * `"out"`, NUNCA contra `"INBOUND" / "OUTBOUND"` (não existe na resposta).
 */
export type MessageDirection = "in" | "out" | "system";

export type MessageStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export interface ConversationListRow {
  id: string;
  channel: Channel;
  status: ConversationStatus;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  lastInboundAt: string | null;
  lastMessageAt?: string | null;
  lastMessage?: {
    preview: string;
    direction: MessageDirection;
    status?: MessageStatus;
  } | null;
  unreadCount?: number;
  tags?: { id: string; name: string; color: string | null }[];
  hasError?: boolean;
  pinnedNoteId?: string | null;
}

export interface ConversationListResponse {
  items: ConversationListRow[];
  total?: number;
  page?: number;
  perPage?: number;
}

export interface TabCounts {
  todos: number;
  entrada: number;
  esperando: number;
  respondidas: number;
  automacao: number;
  finalizados: number;
  erro: number;
}

export interface InboxFilters {
  ownerId?: string;
  channel?: string;
  stageId?: string;
  tagIds?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReactionDto {
  emoji: string;
  count: number;
  byMe: boolean;
  users?: { id: string; name: string }[];
}

export interface InboxMessageDto {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  content: string;
  messageType?: "text" | "note" | "image" | "audio" | "video" | "file" | "template" | string;
  private?: boolean;
  status?: MessageStatus;
  createdAt: string;
  readAt?: string | null;
  replyToId?: string | null;
  reactions?: ReactionDto[];
  media?: {
    url: string;
    mimeType?: string;
    fileName?: string;
    duration?: number;
    transcript?: string | null;
  } | null;
  sender?: {
    id: string;
    name: string;
    kind: "AGENT" | "CONTACT" | "BOT" | "SYSTEM";
  } | null;
  metaError?: string | null;
}

export interface SessionInfo {
  lastInboundAt: string | null;
  active: boolean;
  expiresAt: string | null;
}

export interface MessagesResponse {
  messages: InboxMessageDto[];
  pinnedNoteId: string | null;
  channelProvider: string | null;
  session?: SessionInfo;
}
