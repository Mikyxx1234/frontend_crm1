"use client";

import { createPortal } from "react-dom";
import {
  IconBriefcase,
  IconMessage,
  IconSearch,
} from "@tabler/icons-react";

import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";
import { sanitizeContactName } from "@/lib/display-name";
import { cn, dealNumericValue, formatCurrency } from "@/lib/utils";
import type { DealListItemDto } from "@/features/pipeline-v2/api/list";

import { toConversationCard } from "../adapters";
import type { ConversationListRow } from "../api";

const DEAL_STATUS: Record<DealListItemDto["status"], string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};

export function InboxSearchResultsPanel({
  coords,
  loading,
  query,
  conversations,
  deals,
  onPickConversation,
  onPickDeal,
}: {
  coords: { top: number; left: number; width: number };
  loading: boolean;
  query: string;
  conversations: ConversationListRow[];
  deals: DealListItemDto[];
  onPickConversation: (id: string) => void;
  onPickDeal: (id: string) => void;
}) {
  const empty = !loading && conversations.length === 0 && deals.length === 0;

  return createPortal(
    <div
      data-inbox-search-results
      role="listbox"
      aria-label="Resultados da busca"
      className="fixed z-(--z-popover) max-h-[min(28rem,70vh)] overflow-y-auto rounded-[16px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
      style={{
        top: coords.top,
        left: coords.left,
        width: Math.max(coords.width, 280),
      }}
    >
      {loading ? (
        <p className="px-3 py-4 text-center font-body text-[13px] text-[var(--text-muted)]">
          Buscando…
        </p>
      ) : empty ? (
        <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
          <IconSearch size={18} className="text-[var(--text-muted)]" />
          <p className="font-body text-[13px] text-[var(--text-secondary)]">
            Nenhum resultado para “{query}”
          </p>
        </div>
      ) : (
        <>
          {conversations.length > 0 && (
            <Section label="Conversas">
              {conversations.map((row) => (
                <ConversationHit
                  key={row.id}
                  row={row}
                  onClick={() => onPickConversation(row.id)}
                />
              ))}
            </Section>
          )}
          {deals.length > 0 && (
            <Section label="Negócios">
              {deals.map((deal) => (
                <DealHit key={deal.id} deal={deal} onClick={() => onPickDeal(deal.id)} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-0.5">
      <p className="px-2.5 pb-1 pt-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function ConversationHit({
  row,
  onClick,
}: {
  row: ConversationListRow;
  onClick: () => void;
}) {
  const card = toConversationCard(row);
  const phone = row.contact?.phone?.trim() || null;
  const closed = row.status === "RESOLVED";

  return (
    <button
      type="button"
      role="option"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-primary-soft)]"
    >
      <span className="mt-0.5 shrink-0">
        <ChatAvatar
          user={{
            id: row.contact?.id ?? row.id,
            name: card.name,
            imageUrl: row.contact?.avatarUrl ?? null,
          }}
          size={AVATAR_SIZE.md}
          channel={typeof row.channel === "string" ? row.channel : null}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {card.name}
          </span>
          {row.number != null && (
            <span className="shrink-0 font-body text-[11px] tabular-nums text-[var(--text-muted)]">
              #{row.number}
            </span>
          )}
          {closed && (
            <span className="shrink-0 rounded-full bg-[var(--glass-bg-overlay)] px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Encerrada
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 font-body text-[12px] text-[var(--text-secondary)]">
          <IconMessage size={12} className="shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate">{phone || card.preview || "Abrir conversa"}</span>
        </span>
      </span>
    </button>
  );
}

function DealHit({ deal, onClick }: { deal: DealListItemDto; onClick: () => void }) {
  const name = sanitizeContactName(deal.contact?.name) || deal.title || "Negócio";
  const value = dealNumericValue(deal.value);
  const stage = deal.stage?.name?.trim() || null;

  return (
    <button
      type="button"
      role="option"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-primary-soft)]"
    >
      <span className="mt-0.5 shrink-0">
        <ChatAvatar
          user={{
            id: deal.contact?.id ?? deal.id,
            name,
            imageUrl: deal.contact?.avatarUrl ?? null,
          }}
          size={AVATAR_SIZE.md}
          channel={null}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {deal.title || name}
          </span>
          {deal.number != null && (
            <span className="shrink-0 font-body text-[11px] tabular-nums text-[var(--text-muted)]">
              #{deal.number}
            </span>
          )}
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-wide",
              deal.status === "WON" && "bg-[var(--color-success-bg,#ecfdf5)] text-[var(--color-success,#059669)]",
              deal.status === "LOST" && "bg-[var(--color-danger-bg,#fef2f2)] text-[var(--color-danger,#dc2626)]",
              deal.status === "OPEN" && "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
            )}
          >
            {DEAL_STATUS[deal.status]}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 font-body text-[12px] text-[var(--text-secondary)]">
          <IconBriefcase size={12} className="shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate">
            {[stage, value > 0 ? formatCurrency(value) : null, deal.contact?.name]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </span>
    </button>
  );
}
