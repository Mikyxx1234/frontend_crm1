"use client";

/*
 * ConversationTimelineTab
 * ───────────────────────
 * Timeline de eventos DESTA conversa. Consome
 * `GET /api/conversations/:id/timeline` via `useConversationTimeline`
 * (infinite query com cursor composto).
 *
 * Reaproveita `EVENT_CONFIG` + `eventDescription` do `event-config`
 * canonico — mesmos icones/labels usados pelo activity-feed global e
 * pelo DealTimelineTab. Isso garante que "Conversa criada", "Conversa
 * encerrada" etc. aparecam consistentes em todos os lugares.
 *
 * Visual espelha o DealTimelineTab para reduzir ruido cognitivo.
 */

import { IconClock, IconLoader2 } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import {
  EVENT_CONFIG,
  eventDescription,
  type FeedEvent,
} from "@/components/crm/feed/event-config";
import { useConversationTimeline } from "@/features/inbox-v2/hooks";

interface ConversationTimelineTabProps {
  conversationId: string | null;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function prettifyType(type: string): string {
  const lower = type.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function ConversationTimelineTab({ conversationId }: ConversationTimelineTabProps) {
  const query = useConversationTimeline(conversationId, { limit: 50 });

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)]">
        <IconClock size={36} className="opacity-40" />
        <div className="font-display text-[13px] font-semibold">
          Selecione uma conversa
        </div>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="p-5.5 text-[12.5px] text-[var(--text-muted)]">
        Carregando timeline...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-5.5 text-[12.5px] text-[var(--color-danger)]">
        Erro ao carregar timeline.
      </div>
    );
  }

  const events: FeedEvent[] = (query.data?.pages ?? []).flatMap((p) => p.items);

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)]">
        <IconClock size={36} className="opacity-40" />
        <div className="font-display text-[13px] font-semibold">
          Sem eventos ainda
        </div>
        <p className="max-w-xs text-[12px]">
          Mensagens, mudancas de status e atribuicoes vao aparecer aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-5.5">
      {events.map((ev) => {
        const cfg = EVENT_CONFIG[ev.type];
        const Icon = cfg?.Icon ?? IconClock;
        const label = cfg?.label ?? prettifyType(ev.type);
        const desc = eventDescription(ev);
        return (
          <div
            key={ev.id}
            className="flex items-start gap-3 rounded-[var(--radius-lg)] border p-3"
            style={{
              background: "var(--glass-bg-overlay, rgba(255,255,255,0.6))",
              borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
            }}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg?.bg ?? "bg-muted"} ${cfg?.ring ?? "text-[var(--text-muted)]"}`}
            >
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                  {label}
                </span>
                <span className="text-[10.5px] text-[var(--text-muted)]">
                  {fmtDate(ev.occurredAt)}
                </span>
              </div>
              {desc ? (
                <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  {desc}
                </div>
              ) : null}
              {ev.actorUser?.name || ev.actorLabel ? (
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  por {ev.actorUser?.name ?? ev.actorLabel}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {query.hasNextPage ? (
        <div className="mx-auto mt-2 mb-1">
          <ButtonGlass
            size="sm"
            variant="glass"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : null}
            {query.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
          </ButtonGlass>
        </div>
      ) : null}
    </div>
  );
}
