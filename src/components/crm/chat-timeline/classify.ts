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
  if (
    /status|tabulad|encerrad|reabert|resolvid/.test(t)
  ) {
    return "status";
  }
  if (/\btags?\b/.test(t)) return "tag";
  if (/entrou|entrada/.test(t)) return "entrada";
  if (/saiu|sa[ií]da/.test(t)) return "saida";
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
    return {
      kind: "event",
      action:
        parseEventActionFromMessageType(mt) ??
        inferEventActionFromText(input.content),
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
