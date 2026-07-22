export type SupportTicketStatus = "OPEN" | "PENDING" | "RESOLVED";

export type SupportAuthorType = "requester" | "agent" | "system";

export interface SupportUserLite {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface SupportTicket {
  id: string;
  number: number;
  category: string;
  description: string;
  status: SupportTicketStatus;
  requesterId: string;
  assignedToId: string | null;
  departmentId: string | null;
  lastMessageAt: string;
  requesterUnread: number;
  agentUnread: number;
  createdAt: string;
  resolvedAt: string | null;
  requester: SupportUserLite;
  assignedTo: SupportUserLite | null;
  viewerIsAgent?: boolean;
  viewerIsRequester?: boolean;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorType: SupportAuthorType;
  content: string;
  createdAt: string;
  author: SupportUserLite | null;
}

export interface SupportMeta {
  supportConfigured: boolean;
  department: { id: string; name: string } | null;
  isAgent: boolean;
}

export type SupportScope = "mine" | "assigned" | "queue" | "all";

/** Categorias de problema oferecidas no formulário de abertura. */
export const SUPPORT_CATEGORIES: { value: string; label: string }[] = [
  { value: "duvida", label: "Dúvida" },
  { value: "bug", label: "Problema / Bug" },
  { value: "acesso", label: "Acesso / Login" },
  { value: "financeiro", label: "Financeiro" },
  { value: "solicitacao", label: "Solicitação" },
  { value: "outro", label: "Outro" },
];

export function categoryLabel(value: string): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
