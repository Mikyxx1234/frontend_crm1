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
  /**
   * Forma atual retornada pelo backend (services/conversations.ts).
   * Mantemos `lastMessage` acima como fallback semântico (caso o
   * backend padronize no futuro), e tratamos ambos no adapter.
   */
  lastMessagePreview?: {
    content: string;
    messageType: string;
    mediaUrl: string | null;
    direction: string;
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
  /**
   * Ordenação e janela são aplicadas CLIENT-SIDE no /inbox-v2 (não vão
   * para o backend). `sortBy` aceita "lastInboundAt" (padrão) ou
   * "unreadCount"; `windowState` filtra a janela de 24h da Meta/WhatsApp.
   */
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  windowState?: "open" | "closed";
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
  // Backend serializa como `isPrivate` (Prisma). Mantemos `private` como
  // alias por compat com chamadas legadas — adapter consulta os dois.
  isPrivate?: boolean;
  private?: boolean;
  status?: MessageStatus;
  createdAt: string;
  readAt?: string | null;
  replyToId?: string | null;
  reactions?: ReactionDto[];
  /** Campo plano enviado diretamente pelo backend (ex: "/uploads/audio.ogg"). */
  mediaUrl?: string | null;
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
  /**
   * Nome do autor da mensagem out (agente ou "Automação"). O backend NÃO
   * envia o objeto `sender` acima — esse campo plano é a única chave de
   * autoria que o GET /messages serializa hoje. Convenção do
   * automation-executor: bot grava `senderName === "Automação"`.
   */
  senderName?: string | null;
  /** Status bruto de envio (string livre do backend: sent/delivered/read/failed). */
  sendStatus?: string | null;
  /**
   * Texto do erro de envio (traduzido do Meta quando disponível). O GET de
   * mensagens serializa como `sendError`; o POST imediato usa `metaError`.
   * Consumir os dois no adapter (`sendError ?? metaError`).
   */
  sendError?: string | null;
  metaError?: string | null;
  /**
   * Conexão (Channel) por onde ESTA mensagem trafegou. Permite distinguir,
   * na mesma conversa, mensagens de contas distintas do mesmo canal (ex.: dois
   * WhatsApps da org). `null` = histórica/sem vínculo → o frontend trata como
   * "herda a conexão anterior" (sem marcador de troca). Resolver o label via
   * `MessagesResponse.channels[channelId]`.
   */
  channelId?: string | null;
}

/** Resumo de uma conexão (Channel) — mesmo shape do ConnectionRefDto do backend. */
export interface ConnectionRef {
  id: string;
  name: string;
  type: string;
  phoneNumber: string | null;
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
  /** Conexão ATUAL da conversa (último canal usado). Null se sem canal. */
  channel?: ConnectionRef | null;
  /** Mapa id→conexão de todos os canais referenciados (msgs + atual). */
  channels?: Record<string, ConnectionRef>;
  /**
   * Pode responder nesta conversa? Derivado de `channel.send` do
   * scope-grants (backend é fonte de verdade — POST messages aplica o mesmo
   * enforcement). Default `true` quando o backend não envia o campo (compat
   * com clients/backends antigos). Quando `false`, o composer deve entrar
   * em modo leitura com aviso de "sem permissão pra enviar".
   */
  canReply?: boolean;
  session?: SessionInfo;
}
