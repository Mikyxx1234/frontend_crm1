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

import type { Conversation, LastMessageType } from "@/components/crm/conversation-card";
import type { Message, FormField } from "@/components/crm/message-bubble";

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

/**
 * Tempo restante ate a janela de 24h da Meta/WhatsApp expirar.
 * Espelha a logica do legado (chat-window): backend e' source of truth,
 * mas para o CARD da lista nao temos `session.active` por conversa —
 * computamos a partir de `lastInboundAt`. Aceitamos divergencia de
 * minutos com o ChatArea (a Meta tem alguma folga).
 */
export function sessionRemainingFromInbound(
  lastInboundAt: string | null | undefined,
  windowHours = 24,
): { label: string | null; expired: boolean } {
  if (!lastInboundAt) return { label: null, expired: true };
  const d = new Date(lastInboundAt);
  if (Number.isNaN(d.getTime())) return { label: null, expired: true };
  const deadline = d.getTime() + windowHours * 3600_000;
  const ms = deadline - Date.now();
  if (ms <= 0) return { label: "Expirada", expired: true };
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 1) return { label: `${h}h ${m}min`, expired: false };
  return { label: `${m}min`, expired: false };
}

/**
 * Infere o tipo da ultima mensagem a partir do preview ou de pistas
 * comuns que o backend coloca em listagens (ex.: "[Áudio]", "📎 Doc.pdf").
 * Quando o backend evoluir e enviar `lastMessage.messageType`, usamos
 * direto. Por enquanto, regex resiliente — fallback "text".
 */
export function inferLastMessageType(
  preview: string | null | undefined,
  explicitType?: string | null,
): LastMessageType {
  if (explicitType) {
    const t = explicitType.toLowerCase();
    if (t === "image") return "image";
    if (t === "audio" || t === "voice") return "audio";
    if (t === "video") return "video";
    if (t === "document") return "document";
    if (t === "file") return "file";
    if (t === "template") return "template";
    if (t === "note") return "note";
    if (t === "location") return "location";
    if (t === "contact" || t === "contacts") return "contact";
  }
  const p = (preview ?? "").trim().toLowerCase();
  if (!p) return "text";
  if (/^\[?(áudio|audio|voz|voice)\]?/.test(p) || p.startsWith("🎵") || p.startsWith("🎤")) {
    return "audio";
  }
  if (/^\[?(imagem|foto|image|photo)\]?/.test(p) || p.startsWith("📷") || p.startsWith("🖼")) {
    return "image";
  }
  if (/^\[?(vídeo|video)\]?/.test(p) || p.startsWith("🎥") || p.startsWith("🎬")) {
    return "video";
  }
  if (
    /^\[?(documento|document|arquivo|pdf)\]?/.test(p) ||
    p.startsWith("📎") ||
    p.startsWith("📄")
  ) {
    return "document";
  }
  if (/^\[?(template|modelo)\]?/.test(p)) return "template";
  if (/^\[?(localiza|location|mapa)\]?/.test(p) || p.startsWith("📍")) {
    return "location";
  }
  if (/^\[?(contato|contact|vcard)\]?/.test(p)) return "contact";
  return "text";
}

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
  // Sessao da Meta (24h da ultima mensagem inbound do cliente).
  const sess = sessionRemainingFromInbound(row.lastInboundAt);
  // Primeira tag do contato — mostrada como pill ao lado do nome.
  // Filtra strings vazias/whitespace por defesa.
  const firstTagName = (row.tags ?? [])
    .map((t) => (t.name ?? "").trim())
    .find((n) => n.length > 0);
  // O backend pode enviar tanto `lastMessage` (forma futura, com
  // `preview`) quanto `lastMessagePreview` (forma atual, com `content`
  // + `messageType`). Preferimos o que tiver dado real; se nenhum
  // tiver, cai pra string vazia (mostra apenas o tipo, se conhecido).
  const previewText =
    row.lastMessage?.preview ??
    row.lastMessagePreview?.content ??
    "";
  const lastMessageType = inferLastMessageType(
    previewText,
    row.lastMessagePreview?.messageType ?? null,
  );
  const dir = String(
    row.lastMessage?.direction ?? row.lastMessagePreview?.direction ?? "",
  ).toLowerCase();
  const lastMessageDirection: "in" | "out" | undefined =
    dir === "out" || dir === "outbound"
      ? "out"
      : dir === "in" || dir === "inbound"
        ? "in"
        : undefined;

  return {
    id: row.id,
    name,
    initials: avatarInitials(name),
    avatarColor: colorFromName(name),
    status: deriveOnline(row.lastInboundAt),
    time: formatRelative(lastActivity),
    preview: previewText,
    assignee: row.assignedTo?.name,
    // O card novo nao tem mais contador. Mapeamos unread > 0 para o
    // marcador visual `urgent` (relogio vermelho) — preserva o sinal
    // de "atencao necessaria" sem badge numerico.
    urgent: !!(row.unreadCount && row.unreadCount > 0),
    active: options?.active,
    inactive: row.status !== "OPEN",
    // ── Novos campos visuais ──────────────────────────────────────
    tag: firstTagName ?? null,
    // Lista completa de tags com id/cor — usada pelo cluster de chips
    // do card (até 2 + indicador "+N") e pelo TagsPopover injetado
    // via slot. Filtra entradas sem nome (defesa).
    tags: (row.tags ?? [])
      .filter((t) => (t.name ?? "").trim().length > 0)
      .map((t) => ({ id: t.id, name: t.name, color: t.color ?? null })),
    assigneeId: row.assignedTo?.id ?? null,
    sessionExpiresIn: sess.label,
    sessionExpired: sess.expired,
    lastMessageType,
    lastMessageDirection,
    // Canal de origem — substitui o status dot pelo logo da plataforma
    // no canto inferior direito do avatar.
    channel: row.channel ?? null,
  };
}

/**
 * Detecta e parseia respostas de formulário Meta Flow.
 *
 * Formato REAL que o backend grava em dto.content:
 *
 *   📋 *Resposta do formulário* — _Nome do Flow_
 *
 *   *Rótulo do campo 1*
 *   ↳ Valor 1
 *
 *   *Rótulo do campo 2*
 *   ↳ Valor 2
 *
 * Cada campo ocupa DUAS linhas: a primeira com o rótulo em negrito,
 * a segunda começando com ↳ (ou ↓ / L) e o valor.
 * Retorna null se o conteúdo não corresponder ao padrão.
 */
function parseFormResponse(content: string): { title: string; fields: FormField[] } | null {
  // Mantém linhas em branco para navegação par-a-par; remove trailing spaces.
  const raw = content.split(/\r?\n/).map((l) => l.trim());
  if (!raw.length) return null;

  // Cabeçalho: aceita emoji 📋 opcional + marcadores *_ opcionais + " — _Flow_" opcional.
  const headerMatch = raw[0].match(
    /^[\u{1F4CB}\u{1F4CB}]?\s*[*_]*resposta\s+do\s+formul[aá]rio[*_]*(?:\s*[—–-]\s*[_*]*(.+?)[_*]*)?$/iu,
  );
  if (!headerMatch) return null;

  const title = (headerMatch[1] ?? "").replace(/[_*]/g, "").trim() || "Resposta do formulário";
  const fields: FormField[] = [];

  // Varre as linhas restantes procurando par: linha de rótulo + linha de valor.
  for (let i = 1; i < raw.length; i++) {
    const line = raw[i];
    if (!line) continue; // linha em branco entre campos — pula

    // Linha de rótulo: *Rótulo* ou _Rótulo_
    const labelMatch = line.match(/^[*_]+(.+?)[*_]+$/);
    if (labelMatch) {
      // Próxima linha não-vazia deve ser o valor (↳ / ↓ / L)
      let j = i + 1;
      while (j < raw.length && !raw[j]) j++; // pula blanks
      if (j < raw.length) {
        const valueMatch = raw[j].match(/^[↳↓L]\s*(.+)/);
        if (valueMatch) {
          fields.push({ label: labelMatch[1].trim(), value: valueMatch[1].trim() });
          i = j; // avança o cursor para após o valor
          continue;
        }
      }
    }

    // Fallback: tenta o formato antigo (rótulo e valor na mesma linha).
    const inlineMatch = line.match(/^[*_](.+?)[*_]\s*[↳↓L]\s*(.+)/);
    if (inlineMatch) {
      fields.push({ label: inlineMatch[1].trim(), value: inlineMatch[2].trim() });
    }
  }

  if (!fields.length) return null;
  return { title, fields };
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
  const isBot = dto.sender?.kind === "BOT";

  // Tenta parsear resposta de formulário Meta Flow (sempre inbound)
  const formParsed = isInbound ? parseFormResponse(dto.content ?? "") : null;

  return {
    id: dto.id,
    content: formParsed ? "" : (dto.content ?? ""),
    time: formatTime(dto.createdAt),
    type: isInbound ? "incoming" : "outgoing",
    senderInitials: isInbound ? avatarInitials(contactName) : undefined,
    isBot: isBot || undefined,
    formFields: formParsed?.fields,
    formTitle: formParsed?.title,
    messageType: dto.messageType ?? undefined,
    mediaUrl: dto.mediaUrl ?? dto.media?.url ?? undefined,
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

// ───────────────────────────────────────��─────────────────────────
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

  // Mapeia todos os deals vinculados ao contato com campos customizados
  const deals = (contact?.deals ?? []).map((d, i, arr) => ({
    id: d.id,
    title: d.title,
    value: d.value,
    stageName: d.stageName ?? null,
    productName: d.productName ?? null,
    stageCount: arr.length > 1 ? arr.length : 5,
    stageIndex: i,
    customFields: (d as { customFields?: { fieldId: string; label: string; value: string | null }[] }).customFields ?? [],
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
    deals,
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
