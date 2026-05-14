"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ChannelBadge } from "@/components/inbox/channel-badge";
import { cn } from "@/lib/utils";

import type { ConversationRow } from "./shared";
import { STATUS_LABEL } from "./shared";

type WorkspaceConversationListProps = {
  conversations: ConversationRow[];
  selectedId: string | null;
  onSelect: (c: ConversationRow) => void;
  /** Borda entre chat e lista: `left` = coluna à esquerda, `right` = à direita. */
  rail?: "left" | "right";
};

/** Lista densa de conversas — trilho de threads no workspace (estilo Kommo). */
export function WorkspaceConversationList({
  conversations,
  selectedId,
  onSelect,
  rail = "left",
}: WorkspaceConversationListProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col bg-sidebar",
        rail === "right" ? "border-l border-border" : "border-r border-border",
      )}
    >
      <header className="shrink-0 border-b border-sidebar-border px-3 py-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
          Conversas
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">
          {conversations.length} {conversations.length === 1 ? "thread" : "threads"}
        </p>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ul className="divide-y divide-border/50">
          {conversations.map((c) => {
            const active = selectedId === c.id;
            const label = c.inboxName?.trim() || "Conversa";
            const preview =
              c.channel === "WHATSAPP_CLOUD" || c.channel === "BAILEYS_MD"
                ? "WhatsApp"
                : c.channel;

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors lumen-transition",
                    active
                      ? "border-l-[3px] border-primary bg-[var(--color-sidebar-active-bg)]"
                      : "border-l-[3px] border-transparent hover:bg-[var(--color-sidebar-hover)]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <ChannelBadge channel={c.channel} compact className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "line-clamp-1 text-[13px] font-semibold leading-tight tracking-tight",
                          active ? "text-[var(--color-sidebar-active-fg)]" : "text-foreground",
                        )}
                      >
                        {label}
                      </span>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-ink-muted)]">
                        {preview}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 pl-7">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide",
                        c.status === "OPEN"
                          ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                          : c.status === "RESOLVED"
                            ? "bg-[var(--color-bg-subtle)] text-[var(--color-ink-soft)]"
                            : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
                      )}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--color-ink-muted)]">
                      {formatDistanceToNow(new Date(c.updatedAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
