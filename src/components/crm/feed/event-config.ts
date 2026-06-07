/**
 * Configuracao visual e descritor de eventos do Activity Log (Kommo-grade).
 *
 * Generalizado do `timeline-panel.tsx` (que era deal-only) — agora cobre
 * eventos de DEAL, CONTACT, CONVERSATION, MESSAGE, ACTIVITY, NOTE, TAG.
 *
 * Para adicionar um novo tipo de evento:
 *   1. Adicionar entrada em EVENT_CONFIG (icone + cores + label canonico)
 *   2. Adicionar caso em eventDescription() para o detalhe (old → new)
 * Tipos nao mapeados caem em FALLBACK_CONFIG e geram descricao vazia.
 */

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Edit3,
  MessageSquare,
  MessageSquarePlus,
  Package,
  Phone,
  PhoneMissed,
  Send,
  StickyNote,
  Tag,
  Trash2,
  Trophy,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Workflow,
  XCircle,
  RefreshCw,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export type EventVisualConfig = {
  Icon: LucideIcon;
  ring: string;
  bg: string;
  label: string;
};

export const EVENT_CONFIG: Record<string, EventVisualConfig> = {
  // ── Deal ─────────────────────────────────────────────────────────
  CREATED: {
    Icon: RefreshCw,
    ring: "ring-blue-500/30 text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: "Negócio criado",
  },
  STAGE_CHANGED: {
    Icon: ArrowRight,
    ring: "ring-indigo-500/30 text-indigo-700",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    label: "Etapa alterada",
  },
  STATUS_CHANGED: {
    Icon: Trophy,
    ring: "ring-emerald-500/30 text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "Status alterado",
  },
  OWNER_CHANGED: {
    Icon: UserCog,
    ring: "ring-violet-500/30 text-violet-700",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    label: "Responsável alterado",
  },
  FIELD_UPDATED: {
    Icon: Edit3,
    ring: "ring-sky-500/30 text-sky-700",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    label: "Campo atualizado",
  },
  DEAL_DELETED: {
    Icon: Trash2,
    ring: "ring-red-500/30 text-red-700",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: "Negócio excluído",
  },
  CUSTOM_FIELD_UPDATED: {
    Icon: Edit3,
    ring: "ring-amber-500/30 text-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    label: "Campo personalizado atualizado",
  },

  // ── Tags / Produtos ──────────────────────────────────────────────
  TAG_ADDED: {
    Icon: Tag,
    ring: "ring-pink-500/30 text-pink-700",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    label: "Tag adicionada",
  },
  TAG_REMOVED: {
    Icon: XCircle,
    ring: "ring-rose-500/30 text-rose-700",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    label: "Tag removida",
  },
  PRODUCT_ADDED: {
    Icon: Package,
    ring: "ring-teal-500/30 text-teal-700",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    label: "Produto adicionado",
  },
  PRODUCT_REMOVED: {
    Icon: Package,
    ring: "ring-orange-500/30 text-orange-700",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    label: "Produto removido",
  },
  PRODUCT_UPDATED: {
    Icon: Package,
    ring: "ring-cyan-500/30 text-cyan-700",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    label: "Produto atualizado",
  },

  // ── Notas / Atividades ───────────────────────────────────────────
  NOTE_ADDED: {
    Icon: StickyNote,
    ring: "ring-yellow-500/30 text-yellow-700",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    label: "Nota adicionada",
  },
  NOTE_UPDATED: {
    Icon: Edit3,
    ring: "ring-yellow-500/30 text-yellow-700",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    label: "Nota atualizada",
  },
  NOTE_DELETED: {
    Icon: Trash2,
    ring: "ring-red-500/30 text-red-700",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: "Nota excluída",
  },
  ACTIVITY_ADDED: {
    Icon: CalendarCheck,
    ring: "ring-lime-500/30 text-lime-700",
    bg: "bg-lime-50 dark:bg-lime-950/40",
    label: "Tarefa criada",
  },
  ACTIVITY_COMPLETED: {
    Icon: CalendarCheck,
    ring: "ring-green-500/30 text-green-700",
    bg: "bg-green-50 dark:bg-green-950/40",
    label: "Tarefa concluída",
  },
  ACTIVITY_UPDATED: {
    Icon: Edit3,
    ring: "ring-lime-500/30 text-lime-700",
    bg: "bg-lime-50 dark:bg-lime-950/40",
    label: "Tarefa atualizada",
  },
  ACTIVITY_DUE_CHANGED: {
    Icon: Clock,
    ring: "ring-amber-500/30 text-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    label: "Prazo da tarefa alterado",
  },
  ACTIVITY_DESCRIPTION_CHANGED: {
    Icon: Edit3,
    ring: "ring-lime-500/30 text-lime-700",
    bg: "bg-lime-50 dark:bg-lime-950/40",
    label: "Descrição da tarefa alterada",
  },
  ACTIVITY_RENAMED: {
    Icon: Edit3,
    ring: "ring-lime-500/30 text-lime-700",
    bg: "bg-lime-50 dark:bg-lime-950/40",
    label: "Tarefa renomeada",
  },
  ACTIVITY_DELETED: {
    Icon: Trash2,
    ring: "ring-red-500/30 text-red-700",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: "Tarefa excluída",
  },

  // ── Vinculo de contato ───────────────────────────────────────────
  CONTACT_LINKED: {
    Icon: UserPlus,
    ring: "ring-blue-500/30 text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: "Contato vinculado",
  },
  CONTACT_UNLINKED: {
    Icon: UserMinus,
    ring: "ring-slate-500/30 text-foreground",
    bg: "bg-[var(--color-bg-subtle)] dark:bg-slate-900/40",
    label: "Contato desvinculado",
  },
  CONTACT_CREATED: {
    Icon: Users,
    ring: "ring-blue-500/30 text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: "Contato criado",
  },
  CONTACT_DELETED: {
    Icon: Trash2,
    ring: "ring-red-500/30 text-red-700",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: "Contato excluído",
  },
  CONTACT_FIELD_CHANGED: {
    Icon: Edit3,
    ring: "ring-sky-500/30 text-sky-700",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    label: "Campo do contato alterado",
  },
  CONTACT_TAG_ADDED: {
    Icon: Tag,
    ring: "ring-pink-500/30 text-pink-700",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    label: "Tag adicionada ao contato",
  },
  CONTACT_TAG_REMOVED: {
    Icon: XCircle,
    ring: "ring-rose-500/30 text-rose-700",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    label: "Tag removida do contato",
  },
  CONTACT_OWNER_CHANGED: {
    Icon: UserCog,
    ring: "ring-violet-500/30 text-violet-700",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    label: "Responsável do contato",
  },

  // ── Conversa / Mensagem ──────────────────────────────────────────
  CONVERSATION_CREATED: {
    Icon: MessageSquarePlus,
    ring: "ring-blue-500/30 text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: "Conversa criada",
  },
  CONVERSATION_STATUS_CHANGED: {
    Icon: CheckCircle2,
    ring: "ring-emerald-500/30 text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "Status da conversa",
  },
  CONVERSATION_CLOSED: {
    Icon: CheckCircle2,
    ring: "ring-emerald-500/30 text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "Conversa encerrada",
  },
  CONVERSATION_REOPENED: {
    Icon: RotateCcw,
    ring: "ring-amber-500/30 text-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    label: "Conversa reaberta",
  },
  ASSIGNEE_CHANGED: {
    Icon: UserCheck,
    ring: "ring-violet-500/30 text-violet-700",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    label: "Responsável da conversa",
  },
  MESSAGE_SENT: {
    Icon: Send,
    ring: "ring-emerald-500/30 text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "Mensagem enviada",
  },
  MESSAGE_RECEIVED: {
    Icon: MessageSquare,
    ring: "ring-blue-500/30 text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: "Mensagem recebida",
  },

  // ── Chamadas ─────────────────────────────────────────────────────
  CALL_COMPLETED: {
    Icon: Phone,
    ring: "ring-emerald-500/30 text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "Chamada atendida",
  },
  CALL_MISSED: {
    Icon: PhoneMissed,
    ring: "ring-red-500/30 text-red-700",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: "Chamada perdida",
  },

  // ── Mensagens agendadas ──────────────────────────────────────────
  SCHEDULED_MESSAGE_CREATED: {
    Icon: Clock,
    ring: "ring-blue-500/30 text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: "Mensagem agendada",
  },
  SCHEDULED_MESSAGE_SENT: {
    Icon: Send,
    ring: "ring-emerald-500/30 text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: "Mensagem agendada enviada",
  },
  SCHEDULED_MESSAGE_CANCELLED: {
    Icon: XCircle,
    ring: "ring-amber-500/30 text-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    label: "Mensagem agendada cancelada",
  },
  SCHEDULED_MESSAGE_FAILED: {
    Icon: AlertTriangle,
    ring: "ring-red-500/30 text-red-700",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: "Falha no envio agendado",
  },

  // ── Automacao / IA ───────────────────────────────────────────────
  AUTOMATION_EXECUTED: {
    Icon: Workflow,
    ring: "ring-purple-500/30 text-purple-700",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    label: "Automação executada",
  },
  AI_AGENT_ACTION: {
    Icon: Bot,
    ring: "ring-fuchsia-500/30 text-fuchsia-700",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    label: "Ação do agente IA",
  },
};

export const FALLBACK_CONFIG: EventVisualConfig = {
  Icon: RotateCcw,
  ring: "ring-gray-400/30 text-gray-600",
  bg: "bg-gray-50 dark:bg-gray-900/40",
  label: "Evento",
};

/**
 * Evento canonico do feed/timeline. Usado por FeedRow, FeedDayHeader e
 * pelo deal-timeline (apontando para o mesmo endpoint).
 */
export type FeedEvent = {
  id: string;
  type: string;
  /// Timestamp ISO. `occurredAt` no log novo, `createdAt` no antigo
  /// (mantemos ambos disponiveis na transformacao do caller).
  occurredAt: string;
  meta: Record<string, unknown>;

  entityType?: string;
  entityId?: string;
  entityLabel?: string | null;

  dealId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;

  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;

  actorType?: "HUMAN" | "AI" | "AUTOMATION" | "INTEGRATION" | "SYSTEM";
  actorUserId?: string | null;
  actorLabel?: string | null;
  actorSublabel?: string | null;
  actorRef?: string | null;
  actorUser?: { id: string; name: string | null; avatarUrl: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};
const CONV_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  RESOLVED: "Resolvida",
  PENDING: "Pendente",
  SNOOZED: "Adiada",
};
const FIELD_LABEL: Record<string, string> = {
  title: "Título",
  value: "Valor",
  expectedClose: "Fechamento previsto",
};

/// Descricao textual do evento (linha 2 do FeedRow), no formato
/// "antigo → novo" / "rotulo do alvo" / "preview" conforme o tipo.
export function eventDescription(ev: FeedEvent): string {
  const m = ev.meta ?? {};

  // Atalho universal: se o evento tiver field/oldValue/newValue
  // populados (log novo), renderiza um diff generico no fallback.
  const genericDiff = (): string | null => {
    if (ev.field && (ev.oldValue || ev.newValue)) {
      const label = FIELD_LABEL[ev.field] ?? ev.field;
      return `${label}: ${ev.oldValue ?? "vazio"} → ${ev.newValue ?? "vazio"}`;
    }
    return null;
  };

  switch (ev.type) {
    case "STAGE_CHANGED": {
      const from = (m.from as { name?: string })?.name ?? ev.oldValue ?? "?";
      const to = (m.to as { name?: string })?.name ?? ev.newValue ?? "?";
      return `${from} → ${to}`;
    }
    case "STATUS_CHANGED": {
      const from = STATUS_LABEL[m.from as string] ?? (m.from as string) ?? ev.oldValue ?? "?";
      const to = STATUS_LABEL[m.to as string] ?? (m.to as string) ?? ev.newValue ?? "?";
      const reason = m.lostReason ? ` — ${m.lostReason}` : "";
      return `${from} → ${to}${reason}`;
    }
    case "OWNER_CHANGED":
    case "CONTACT_OWNER_CHANGED":
    case "ASSIGNEE_CHANGED": {
      const from = (m.from as { name?: string })?.name ?? ev.oldValue ?? "Nenhum";
      const to =
        (m.to as { name?: string })?.name ??
        (m.to as { id?: string })?.id ??
        ev.newValue ??
        "Nenhum";
      return `${from} → ${to}`;
    }
    case "FIELD_UPDATED":
    case "CONTACT_FIELD_CHANGED": {
      const label =
        FIELD_LABEL[(m.field as string) ?? ev.field ?? ""] ??
        (m.field as string) ??
        ev.field ??
        "Campo";
      const from = m.from ? String(m.from) : ev.oldValue ?? "vazio";
      const to = m.to ? String(m.to) : ev.newValue ?? "vazio";
      return `${label}: ${from} → ${to}`;
    }
    case "CUSTOM_FIELD_UPDATED": {
      const label = String(m.fieldLabel ?? ev.field ?? "?");
      const from = m.from ? String(m.from) : ev.oldValue ?? "vazio";
      const to = m.to ? String(m.to) : ev.newValue ?? "vazio";
      return `${label}: ${from} → ${to}`;
    }
    case "TAG_ADDED":
    case "TAG_REMOVED":
    case "CONTACT_TAG_ADDED":
    case "CONTACT_TAG_REMOVED":
      return String(m.tagName ?? ev.newValue ?? ev.oldValue ?? "");
    case "PRODUCT_ADDED":
    case "PRODUCT_REMOVED":
    case "PRODUCT_UPDATED":
      return String(m.productName ?? "");
    case "NOTE_ADDED":
    case "NOTE_UPDATED":
    case "NOTE_DELETED":
      return String(m.preview ?? "");
    case "ACTIVITY_ADDED":
    case "ACTIVITY_DELETED":
    case "ACTIVITY_RENAMED":
      return String(m.title ?? ev.newValue ?? "");
    case "ACTIVITY_COMPLETED": {
      const title = String(m.title ?? "");
      const result = m.result ? ` — ${String(m.result)}` : "";
      return `${title}${result}`;
    }
    case "ACTIVITY_DESCRIPTION_CHANGED":
      return String(m.title ?? "");
    case "ACTIVITY_DUE_CHANGED": {
      const title = String(m.title ?? "");
      const fmt = (v?: string | null) =>
        v ? format(parseISO(v), "dd/MM 'às' HH:mm", { locale: ptBR }) : "sem prazo";
      return `${title}: ${fmt(ev.oldValue)} → ${fmt(ev.newValue)}`;
    }
    case "ACTIVITY_UPDATED": {
      const title = String(m.title ?? "");
      const fields = Array.isArray(m.fields) ? (m.fields as string[]).join(", ") : "";
      return fields ? `${title} — alterado: ${fields}` : title;
    }
    case "CONTACT_LINKED": {
      const to = (m.to as { name?: string })?.name ?? "";
      const from = (m.from as { name?: string })?.name;
      return from ? `${from} → ${to}` : to;
    }
    case "CONTACT_UNLINKED": {
      const from = (m.from as { name?: string })?.name ?? "";
      return from;
    }
    case "CONTACT_CREATED":
      return String(m.preview ?? m.source ?? "");
    case "CONTACT_DELETED":
    case "DEAL_DELETED":
      return String(ev.entityLabel ?? m.name ?? m.title ?? "");
    case "CALL_COMPLETED":
    case "CALL_MISSED": {
      const initiatedBy =
        m.initiatedBy === "contact" ? "Cliente ligou" : "Empresa ligou";
      const dur = Number(m.durationSec ?? 0);
      if (dur > 0) {
        const mm = Math.floor(dur / 60);
        const ss = dur % 60;
        const durStr = mm > 0 ? `${mm}m${ss.toString().padStart(2, "0")}s` : `${ss}s`;
        const rec = m.recordingUrl ? " • gravação" : "";
        return `${initiatedBy} • ${durStr}${rec}`;
      }
      return initiatedBy;
    }
    case "MESSAGE_SENT":
    case "MESSAGE_RECEIVED": {
      const preview = String(m.preview ?? "").trim();
      if (preview) {
        return preview.length > 140 ? `${preview.slice(0, 140)}…` : preview;
      }
      if (m.hasMedia) return "[anexo]";
      return "";
    }
    case "CONVERSATION_CREATED":
      return String(m.channel ?? "");
    case "CONVERSATION_CLOSED":
    case "CONVERSATION_REOPENED":
    case "CONVERSATION_STATUS_CHANGED": {
      const from = CONV_STATUS_LABEL[String(m.from)] ?? String(m.from ?? "");
      const to = CONV_STATUS_LABEL[String(m.to)] ?? String(m.to ?? "");
      return from && to ? `${from} → ${to}` : to || from;
    }
    case "AUTOMATION_EXECUTED": {
      const name = String(m.automationName ?? "Automação");
      const evt = m.event ? ` • ${m.event}` : "";
      const st = m.status === "COMPLETED_WITH_ERRORS" ? " (com erros)" : "";
      return `${name}${evt}${st}`;
    }
    case "AI_AGENT_ACTION": {
      const actionMap: Record<string, string> = {
        created_deal: "criou negócio",
        moved_stage: "moveu estágio",
        added_tag: "adicionou tag",
        transferred_to_human: "transferiu para humano",
      };
      const action = actionMap[String(m.action ?? "")] ?? String(m.action ?? "");
      const extra = m.stageName
        ? ` → ${m.stageName}`
        : m.tagName
          ? `: ${m.tagName}`
          : m.title
            ? `: ${m.title}`
            : m.reason
              ? ` — ${m.reason}`
              : "";
      return `${action}${extra}`;
    }
    case "SCHEDULED_MESSAGE_CREATED": {
      const preview = String(m.preview ?? "").trim();
      const when = m.scheduledAt
        ? format(parseISO(String(m.scheduledAt)), "dd/MM 'às' HH:mm", { locale: ptBR })
        : "";
      const suffix = m.hasFallbackTemplate ? " (com template de fallback)" : "";
      const shortPreview = preview
        ? ` — "${preview.length > 80 ? preview.slice(0, 80) + "…" : preview}"`
        : m.hasMedia
          ? " — anexo"
          : "";
      return `Para ${when}${shortPreview}${suffix}`;
    }
    case "SCHEDULED_MESSAGE_SENT":
      return m.viaFallbackTemplate
        ? "Enviada via template (sessão 24h expirada)"
        : "Enviada automaticamente";
    case "SCHEDULED_MESSAGE_CANCELLED": {
      const reasonMap: Record<string, string> = {
        client_reply: "cliente respondeu",
        agent_reply: "agente respondeu",
        manual: "cancelado manualmente",
        conversation_closed: "conversa encerrada",
      };
      return reasonMap[String(m.reason ?? "")] ?? String(m.reason ?? "");
    }
    case "SCHEDULED_MESSAGE_FAILED":
      return String(m.reason ?? "Erro desconhecido");
    default:
      return genericDiff() ?? "";
  }
}

/// Label de exibicao do ator (com fallback razoavel).
export function actorDisplay(ev: FeedEvent): {
  label: string;
  sublabel: string | null;
  type: "HUMAN" | "AI" | "AUTOMATION" | "INTEGRATION" | "SYSTEM";
} {
  const type = ev.actorType ?? "SYSTEM";
  const label =
    ev.actorLabel ??
    ev.actorUser?.name ??
    (type === "AI"
      ? "IA"
      : type === "AUTOMATION"
        ? "Automação"
        : type === "INTEGRATION"
          ? "Integração"
          : type === "SYSTEM"
            ? "Sistema"
            : "Usuário");
  return { label, sublabel: ev.actorSublabel ?? null, type };
}
