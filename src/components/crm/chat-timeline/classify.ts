import {
  formatHumanEventActorName,
  isGenericHumanEventActor,
} from "./event-actor";
import type {
  ClassifiedTimelineItem,
  ConversationEventAction,
  TimelineClassifyInput,
} from "./types";

const EVENT_TYPE_PREFIX = "event:";

const SYSTEM_ACTORS = new Set([
  "agente ia",
  "sistema",
  "automação",
  "automacao",
]);

const DRAFT_TYPES = new Set(["ai_draft"]);

export function isEventMessageType(
  messageType: string | null | undefined,
): boolean {
  if (!messageType) return false;
  const mt = messageType.toLowerCase();
  return mt === "event" || mt.startsWith(EVENT_TYPE_PREFIX);
}

export function parseEventActionFromMessageType(
  messageType: string | null | undefined,
): ConversationEventAction | undefined {
  if (!messageType) return undefined;
  const mt = messageType.toLowerCase();
  if (!mt.startsWith(EVENT_TYPE_PREFIX)) return undefined;
  const raw = mt.slice(EVENT_TYPE_PREFIX.length);
  return isConversationEventAction(raw) ? raw : undefined;
}

export function isConversationEventAction(
  value: string,
): value is ConversationEventAction {
  return (
    value === "distribuicao" ||
    value === "transferencia" ||
    value === "status" ||
    value === "tabulacao" ||
    value === "tag" ||
    value === "entrada" ||
    value === "saida" ||
    value === "ia" ||
    value === "template"
  );
}

function normalizeActor(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

function isSystemActor(input: TimelineClassifyInput): boolean {
  const author = (input.authorType ?? "").toLowerCase();
  if (author === "system" || author === "bot") return true;
  return SYSTEM_ACTORS.has(normalizeActor(input.senderName));
}

/** Encurta eventos de fila legados no display (texto já persistido). */
export function normalizeQueueEventText(text: string): string {
  let t = text
    .replace(/\s*\([A-Z][A-Z0-9]*(_[A-Z0-9]+)+\)/g, "")
    .replace(/\s+[A-Z][A-Z0-9]*(_[A-Z0-9]+)+(?=\s|$)/g, "")
    .replace(/^Conversa enfileirada para\s+/i, "Enfileirada em ")
    .replace(/aguardando consultor elegível/gi, "sem consultor elegível")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[—–-]\s*$/g, "")
    .trim();
  if (/^aguardando consultor/i.test(t) || /^sem consultor elegível$/i.test(t)) {
    return "Enfileirada — sem consultor elegível";
  }
  return t;
}

const LEAVE_EVENT_RE = /^(.+?)\s+(saiu|entrou|removida)\s+da conversa$/i;

/**
 * Encurta o nome no texto e, se o ator não for a pessoa do texto,
 * troca "saiu" por "removida" (A removeu B).
 */
export function normalizeConversationEventText(
  text: string,
  actor?: string | null,
): string {
  const queued = normalizeQueueEventText(text);
  const m = queued.match(LEAVE_EVENT_RE);
  if (!m) return queued;
  const who = formatHumanEventActorName(m[1]) || m[1].trim();
  const verb = m[2].toLowerCase();
  if (verb === "entrou") return `${who} entrou na conversa`;
  if (verb === "removida") return `${who} removida da conversa`;
  const actorShort = formatHumanEventActorName(actor);
  const actorNorm = (actorShort || actor || "").trim().toLowerCase();
  if (
    actorNorm &&
    actorNorm !== who.toLowerCase() &&
    !isGenericHumanEventActor(actor)
  ) {
    return `${who} removida da conversa`;
  }
  return `${who} saiu da conversa`;
}

export function inferEventActionFromText(
  content: string | null | undefined,
): ConversationEventAction {
  const t = (content ?? "").toLowerCase();
  if (
    /distribu[ií]d|enfileirad|atribu[ií]d/.test(t)
  ) {
    return "distribuicao";
  }
  if (/transfer/.test(t)) return "transferencia";
  if (/tabulad/.test(t)) return "tabulacao";
  if (
    /status|encerrad|reabert|resolvid/.test(t)
  ) {
    return "status";
  }
  if (/\btags?\b/.test(t)) return "tag";
  if (/entrou|entrada/.test(t)) return "entrada";
  if (/saiu|sa[ií]da|removid/.test(t)) return "saida";
  if (/iniciada por template/.test(t)) return "template";
  return "ia";
}

/**
 * Separa ITEM da timeline do chat:
 *   - event  = log automático (sistema / agente IA), inclusive legado
 *              gravado como nota (`messageType=note` + autor sistema/IA)
 *   - note   = anotação manual humana
 *   - message = o restante
 */
export function classifyTimelineItem(
  input: TimelineClassifyInput,
): ClassifiedTimelineItem {
  const mt = (input.messageType ?? "").toLowerCase();
  if (DRAFT_TYPES.has(mt) || mt === "ticket-separator" || mt === "sip_call") {
    return { kind: "message" };
  }

  if (isEventMessageType(mt)) {
    const inferred = inferEventActionFromText(input.content);
    return {
      kind: "event",
      // Legado: tabulação era gravada como event:status
      action:
        inferred === "tabulacao"
          ? "tabulacao"
          : parseEventActionFromMessageType(mt) ?? inferred,
    };
  }

  const isPrivate =
    input.isPrivate === true ||
    input.private === true ||
    mt === "note";

  if (isPrivate && isSystemActor(input)) {
    return {
      kind: "event",
      action: inferEventActionFromText(input.content),
    };
  }

  if (isPrivate) {
    return { kind: "note" };
  }

  return { kind: "message" };
}
