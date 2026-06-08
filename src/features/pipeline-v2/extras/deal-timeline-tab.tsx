"use client";

/*
 * Tab "Timeline" do DealDetailPanel — linha do tempo visual de eventos do deal.
 * GET /api/deals/:id/timeline.
 *
 * Design: linha vertical à esquerda com badges de ícone coloridos,
 * agrupamento por data, descrições humanizadas e avatar do ator.
 */

import {
  IconAlertCircle,
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconCheckbox,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconMessageCircle,
  IconNote,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSend,
  IconTag,
  IconTrendingUp,
  IconTrophy,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";

import { useDealTimeline } from "@/features/pipeline-v2/hooks";
import type { DealTimelineEvent } from "@/features/pipeline-v2/api";

/* ─── Tipos ──────────────────────────────────────────────────── */

interface EventMeta {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
}

/* ─── Metadados por tipo ─────────────────────────────────────── */

const TYPE_META: Record<string, EventMeta> = {
  // Deal
  CREATED:                     { label: "Negócio criado",        icon: IconPlus,          color: "#5b6ff5", bg: "#eff0fe" },
  DEAL_CREATED:                { label: "Negócio criado",        icon: IconPlus,          color: "#5b6ff5", bg: "#eff0fe" },
  STAGE_CHANGED:               { label: "Etapa alterada",        icon: IconTrendingUp,    color: "#8b5cf6", bg: "#f5f3ff" },
  STATUS_CHANGED:              { label: "Status alterado",       icon: IconRefresh,       color: "#a78bfa", bg: "#f3f0ff" },
  WON:                         { label: "Negócio ganho",         icon: IconTrophy,        color: "#10b981", bg: "#ecfdf5" },
  DEAL_WON:                    { label: "Negócio ganho",         icon: IconTrophy,        color: "#10b981", bg: "#ecfdf5" },
  LOST:                        { label: "Negócio perdido",       icon: IconCircleX,       color: "#ef4444", bg: "#fef2f2" },
  DEAL_LOST:                   { label: "Negócio perdido",       icon: IconCircleX,       color: "#ef4444", bg: "#fef2f2" },
  // Responsável
  ASSIGNED:                    { label: "Responsável alterado",  icon: IconUserCheck,     color: "#3b82f6", bg: "#eff6ff" },
  OWNER_CHANGED:               { label: "Responsável alterado",  icon: IconUserCheck,     color: "#3b82f6", bg: "#eff6ff" },
  ASSIGNEE_CHANGED:            { label: "Responsável alterado",  icon: IconUserCheck,     color: "#3b82f6", bg: "#eff6ff" },
  // Campos
  FIELD_UPDATED:               { label: "Campo atualizado",      icon: IconPencil,        color: "#6b7280", bg: "#f3f4f6" },
  CUSTOM_FIELD_UPDATED:        { label: "Campo personalizado",   icon: IconPencil,        color: "#6b7280", bg: "#f3f4f6" },
  // Notas
  NOTE_ADDED:                  { label: "Nota adicionada",       icon: IconNote,          color: "#f59e0b", bg: "#fffbeb" },
  // Mensagens
  MESSAGE_RECEIVED:            { label: "Mensagem recebida",     icon: IconMessageCircle, color: "#10b981", bg: "#ecfdf5" },
  MESSAGE_SENT:                { label: "Mensagem enviada",      icon: IconSend,          color: "#3b82f6", bg: "#eff6ff" },
  // Atividades
  ACTIVITY_COMPLETED:          { label: "Atividade concluída",   icon: IconCheckbox,      color: "#10b981", bg: "#ecfdf5" },
  ACTIVITY_CREATED:            { label: "Atividade criada",      icon: IconCheckbox,      color: "#6b7280", bg: "#f3f4f6" },
  // Tags
  TAG_ADDED:                   { label: "Tag adicionada",        icon: IconTag,           color: "#8b5cf6", bg: "#f5f3ff" },
  TAG_REMOVED:                 { label: "Tag removida",          icon: IconX,             color: "#ef4444", bg: "#fef2f2" },
  // Conversa
  CONVERSATION_OPENED:         { label: "Conversa iniciada",     icon: IconMessageCircle, color: "#3b82f6", bg: "#eff6ff" },
  CONVERSATION_CLOSED:         { label: "Conversa encerrada",    icon: IconCircleCheck,   color: "#10b981", bg: "#ecfdf5" },
  CONVERSATION_STATUS_CHANGED: { label: "Conversa atualizada",   icon: IconRefresh,       color: "#64748b", bg: "#f1f5f9" },
  // Contato
  CONTACT_CREATED:             { label: "Contato criado",        icon: IconUserCheck,     color: "#5b6ff5", bg: "#eff0fe" },
  // Automação / IA
  AUTOMATION_EXECUTED:         { label: "Automação executada",   icon: IconBolt,          color: "#f59e0b", bg: "#fffbeb" },
  AI_AGENT_ACTION:             { label: "Ação do agente IA",     icon: IconBolt,          color: "#a78bfa", bg: "#f5f3ff" },
};

/** Normaliza o tipo: converte espaços em underscores (formato legado dealEvent). */
function normalizeType(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

function getMeta(type: string): EventMeta {
  return (
    TYPE_META[type] ??
    TYPE_META[normalizeType(type)] ?? {
      // Fallback elegante: Title Case em PT
      label: normalizeType(type)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: IconClock,
      color: "#9ca3af",
      bg: "#f9fafb",
    }
  );
}

/* ─── Helpers de data ────────────────────────────────────────── */

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateKey(iso) === dateKey(today.toISOString())) return "Hoje";
  if (dateKey(iso) === dateKey(yesterday.toISOString())) return "Ontem";

  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays <= 6) return "Esta semana";
  if (diffDays <= 13) return "Semana passada";

  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7)  return `há ${d} dias`;
  return fmtDateTime(iso);
}

/* ─── Avatares ───────────────────────────────────────────────── */

const AVATAR_COLORS = [
  "#5b6ff5", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#3b82f6", "#ef4444",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/* ─── Helpers de meta ────────────────────────────────────────── */

/**
 * Extrai string de um valor de meta que pode ser string | {name?, id?} | unknown.
 * Evita "Objects are not valid as a React child".
 */
function metaStr(v: unknown, fallback = "?"): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v || fallback;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.name === "string" && o.name) return o.name;
    if (typeof o.label === "string" && o.label) return o.label;
    if (typeof o.id === "string") return o.id;
  }
  return fallback;
}

/* ─── Descrição humanizada do evento ────────────────────────── */

function EventDescription({ ev }: { ev: DealTimelineEvent }) {
  const meta = ev.meta ?? {};

  /* STAGE_CHANGED — from → to com pills coloridas */
  if (ev.type === "STAGE_CHANGED") {
    const fromName = metaStr(meta.from);
    const toName   = metaStr(meta.to);
    return (
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#e5e7eb", color: "#374151" }}>
          {fromName}
        </span>
        <IconArrowRight size={12} className="shrink-0 text-[#9ca3af]" />
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#eff0fe", color: "#5b6ff5" }}>
          {toName}
        </span>
      </div>
    );
  }

  /* STATUS_CHANGED */
  if (ev.type === "STATUS_CHANGED") {
    const STATUS_LABELS: Record<string, string> = {
      OPEN: "Aberto", WON: "Ganho", LOST: "Perdido",
    };
    const fromRaw   = metaStr(meta.from);
    const toRaw     = metaStr(meta.to);
    const fromLabel = STATUS_LABELS[fromRaw] ?? fromRaw;
    const toLabel   = STATUS_LABELS[toRaw]   ?? toRaw;
    return (
      <div className="mt-1 flex items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#e5e7eb", color: "#374151" }}>
          {fromLabel}
        </span>
        <IconArrowRight size={12} className="shrink-0 text-[#9ca3af]" />
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#eff0fe", color: "#5b6ff5" }}>
          {toLabel}
        </span>
      </div>
    );
  }

  /* FIELD_UPDATED / CUSTOM_FIELD_UPDATED */
  if (ev.type === "FIELD_UPDATED" || ev.type === "CUSTOM_FIELD_UPDATED") {
    // Backend grava "from"/"to"; alguns eventos legados usam "oldValue"/"newValue"
    const oldV = metaStr(meta.from ?? meta.oldValue ?? meta.previous, "");
    const newV = metaStr(meta.to   ?? meta.newValue ?? meta.value,    "");
    // Se não tem nenhum valor para mostrar, omite a descrição
    if (!oldV && !newV) return null;
    return (
      <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#6b7280]">
        {oldV !== "" ? (
          <>
            <span className="rounded px-1.5 py-0.5 text-[11px] font-medium line-through opacity-60"
              style={{ background: "#f3f4f6", color: "#374151" }}>
              {oldV || "—"}
            </span>
            <span className="text-[#9ca3af]">→</span>
          </>
        ) : null}
        <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: "#eff0fe", color: "#5b6ff5" }}>
          {newV || "—"}
        </span>
      </div>
    );
  }

  /* NOTE_ADDED — preview do conteúdo */
  if (ev.type === "NOTE_ADDED") {
    const preview = metaStr(meta.preview, "");
    if (!preview) return null;
    return (
      <div className="mt-1 line-clamp-2 rounded-md border-l-2 pl-2.5 text-[11.5px] italic text-[#6b7280]"
        style={{ borderColor: "#f59e0b" }}>
        "{preview}"
      </div>
    );
  }

  /* TAG_ADDED / TAG_REMOVED */
  if (ev.type === "TAG_ADDED" || ev.type === "TAG_REMOVED") {
    const tagName  = metaStr(meta.tagName, "");
    const tagColor = typeof meta.tagColor === "string" ? meta.tagColor : undefined;
    if (!tagName) return null;
    return (
      <div className="mt-1">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `${tagColor ?? "#8b5cf6"}22`, color: tagColor ?? "#8b5cf6" }}>
          #{tagName}
        </span>
      </div>
    );
  }

  /* LOST — motivo */
  if (ev.type === "LOST" || ev.type === "DEAL_LOST") {
    const reason = metaStr(meta.lostReason, "");
    if (!reason) return null;
    return (
      <div className="mt-1 text-[11.5px] text-[#ef4444]">Motivo: {reason}</div>
    );
  }

  /* ASSIGNED / OWNER_CHANGED / ASSIGNEE_CHANGED */
  const isAssignee = ["ASSIGNED", "OWNER_CHANGED", "ASSIGNEE_CHANGED"].includes(normalizeType(ev.type));
  if (isAssignee) {
    const to = metaStr(meta.to ?? meta.newAssignee ?? meta.assignee, "");
    if (!to) return null;
    return <div className="mt-1 text-[11.5px] text-[#6b7280]">Para: <span className="font-semibold text-[#374151]">{to}</span></div>;
  }

  /* CONVERSATION_STATUS_CHANGED */
  const isConvStatus = normalizeType(ev.type) === "CONVERSATION_STATUS_CHANGED";
  if (isConvStatus) {
    const STATUS_LABELS: Record<string, string> = {
      OPEN: "Aberta", RESOLVED: "Resolvida", PENDING: "Pendente",
      SNOOZED: "Adiada", CLOSED: "Fechada",
    };
    const fromRaw = metaStr(meta.from ?? meta.oldStatus, "");
    const toRaw   = metaStr(meta.to   ?? meta.newStatus, "");
    if (!fromRaw && !toRaw) return null;
    return (
      <div className="mt-1 flex items-center gap-1.5">
        {fromRaw && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#e5e7eb", color: "#374151" }}>
            {STATUS_LABELS[fromRaw] ?? fromRaw}
          </span>
        )}
        {fromRaw && toRaw && <IconArrowRight size={12} className="shrink-0 text-[#9ca3af]" />}
        {toRaw && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#eff0fe", color: "#5b6ff5" }}>
            {STATUS_LABELS[toRaw] ?? toRaw}
          </span>
        )}
      </div>
    );
  }

  return null;
}

/* ─── Skeleton de carregamento ───────────────────────────────── */

function TimelineSkeleton() {
  return (
    <div className="relative flex flex-col gap-0 overflow-y-auto px-5 py-4">
      {/* linha vertical */}
      <div className="absolute left-[30px] top-0 h-full w-0.5 rounded-full" style={{ background: "var(--glass-border,rgba(0,0,0,0.08))" }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 pb-7">
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#e5e7eb" }} />
          <div className="flex-1 pt-1">
            <div className="mb-1.5 h-3 w-32 animate-pulse rounded" style={{ background: "#e5e7eb" }} />
            <div className="h-2.5 w-48 animate-pulse rounded" style={{ background: "#f3f4f6" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────────── */

interface DealTimelineTabProps {
  dealId: string;
}

export function DealTimelineTab({ dealId }: DealTimelineTabProps) {
  const { data: events = [], isLoading, isError } = useDealTimeline(dealId);

  if (isLoading) return <TimelineSkeleton />;

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <IconAlertCircle size={32} className="opacity-40" style={{ color: "#ef4444" }} />
        <p className="text-[12.5px]" style={{ color: "#ef4444" }}>Erro ao carregar timeline.</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center" style={{ color: "#718096" }}>
        <IconClock size={36} className="opacity-30" />
        <div className="font-display text-[13px] font-semibold">Sem eventos ainda</div>
        <p className="max-w-xs text-[12px] opacity-70">
          Mudanças de etapa, mensagens, notas e atividades aparecerão aqui.
        </p>
      </div>
    );
  }

  /* Agrupar eventos por data */
  const groups: { label: string; key: string; events: DealTimelineEvent[] }[] = [];
  for (const ev of events) {
    const key = dateKey(ev.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.events.push(ev);
    } else {
      groups.push({ label: groupLabel(ev.createdAt), key, events: [ev] });
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative px-4 pb-6 pt-4">
        {/* Linha vertical contínua */}
        <div
          className="absolute left-[34px] top-0 w-0.5 rounded-full"
          style={{
            height: "calc(100% - 24px)",
            background: "linear-gradient(to bottom, #e5e7eb 0%, #e5e7eb 95%, transparent 100%)",
          }}
        />

        {groups.map((group, gi) => (
          <div key={group.key}>
            {/* Divisor de data */}
            <div className="relative mb-3 mt-2 flex items-center gap-2" style={{ marginLeft: gi === 0 ? 0 : 0 }}>
              <div className="z-10 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: "#f3f4f6", marginLeft: "46px" }}>
                <span className="font-display text-[11px] font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                  {group.label}
                </span>
              </div>
            </div>

            {/* Eventos do grupo */}
            {group.events.map((ev, evIdx) => {
              const meta = getMeta(ev.type);
              const Icon = meta.icon;
              const isLast = gi === groups.length - 1 && evIdx === group.events.length - 1;
              const actor = ev.user;

              return (
                <div
                  key={ev.id}
                  className={`relative flex items-start gap-3 ${isLast ? "pb-0" : "pb-5"}`}
                >
                  {/* Badge do ícone — sobre a linha */}
                  <div
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm"
                    style={{
                      background: meta.bg,
                      border: `2px solid ${meta.color}30`,
                      color: meta.color,
                    }}
                  >
                    <Icon size={14} />
                  </div>

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      {/* Título + tipo */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-display text-[12.5px] font-semibold"
                            style={{ color: "#1a202c" }}
                          >
                            {/* Para campo personalizado, exibe o nome do campo como título */}
                            {(ev.type === "CUSTOM_FIELD_UPDATED" || ev.type === "FIELD_UPDATED")
                              ? (metaStr((ev.meta as Record<string, unknown>)?.fieldLabel ?? (ev.meta as Record<string, unknown>)?.field, "") || meta.label)
                              : meta.label}
                          </span>
                          {/* Pill colorida para eventos especiais */}
                          {ev.type === "WON" || ev.type === "DEAL_WON" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[10px] font-bold"
                              style={{ background: "#d1fae5", color: "#059669" }}>
                              <IconCheck size={9} />
                              Ganho
                            </span>
                          ) : ev.type === "LOST" || ev.type === "DEAL_LOST" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[10px] font-bold"
                              style={{ background: "#fee2e2", color: "#dc2626" }}>
                              Perdido
                            </span>
                          ) : null}
                        </div>

                        {/* Descrição específica do evento */}
                        <EventDescription ev={ev} />

                        {/* Ator */}
                        {actor?.name && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                              style={{ background: avatarColor(actor.name) }}
                            >
                              {initials(actor.name)}
                            </div>
                            <span className="text-[11px]" style={{ color: "#9ca3af" }}>
                              {actor.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Horário */}
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] font-medium tabular-nums" style={{ color: "#9ca3af" }}>
                          {fmtTime(ev.createdAt)}
                        </div>
                        <div className="mt-0.5 text-[9.5px]" style={{ color: "#d1d5db" }}>
                          {relativeTime(ev.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Ponto final da linha */}
        <div
          className="absolute left-[30px] z-10 flex h-4 w-4 items-center justify-center rounded-full"
          style={{ bottom: "8px", background: "#e5e7eb", border: "2px solid #d1d5db" }}
        >
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#9ca3af" }} />
        </div>
      </div>
    </div>
  );
}
