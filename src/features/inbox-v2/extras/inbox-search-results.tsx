"use client";

import { createPortal } from "react-dom";
import {
  IconArrowDown,
  IconArrowUp,
  IconBriefcase,
  IconCornerDownLeft,
  IconMessage,
  IconPhone,
  IconSearch,
} from "@tabler/icons-react";

import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";
import { sanitizeContactName } from "@/lib/display-name";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { DealListItemDto } from "@/features/pipeline-v2/api/list";

import { toConversationCard } from "../adapters";
import type { ConversationListRow } from "../api";

const DEAL_STATUS: Record<DealListItemDto["status"], string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};

export type InboxSearchHit =
  | { kind: "conversation"; row: ConversationListRow }
  | { kind: "deal"; deal: DealListItemDto };

export function flattenInboxSearchHits(
  conversations: ConversationListRow[],
  deals: DealListItemDto[],
): InboxSearchHit[] {
  return [
    ...conversations.map((row) => ({ kind: "conversation" as const, row })),
    ...deals.map((deal) => ({ kind: "deal" as const, deal })),
  ];
}

export function InboxSearchResultsPanel({
  coords,
  loading,
  query,
  conversations,
  deals,
  activeIndex,
  onActiveIndexChange,
  onPickConversation,
  onPickDeal,
}: {
  coords: { top: number; left: number; width: number };
  loading: boolean;
  query: string;
  conversations: ConversationListRow[];
  deals: DealListItemDto[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPickConversation: (row: ConversationListRow) => void;
  onPickDeal: (id: string) => void;
}) {
  const empty = !loading && conversations.length === 0 && deals.length === 0;
  const total = conversations.length + deals.length;
  const dealOffset = conversations.length;

  return createPortal(
    <div
      data-inbox-search-results
      role="listbox"
      aria-label="Resultados da busca"
      className="fixed z-(--z-popover) flex max-h-[min(32rem,72vh)] flex-col overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
      style={{
        top: coords.top,
        left: coords.left,
        width: Math.max(coords.width, 360),
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {loading ? (
          <p className="px-3 py-6 text-center font-body text-[13px] text-[var(--text-muted)]">
            Buscando…
          </p>
        ) : empty ? (
          <div className="flex flex-col items-center gap-1 px-3 py-8 text-center">
            <IconSearch size={18} className="text-[var(--text-muted)]" />
            <p className="font-body text-[13px] text-[var(--text-secondary)]">
              Nenhum resultado para “{query}”
            </p>
          </div>
        ) : (
          <>
            {conversations.length > 0 && (
              <Section icon={<IconMessage size={13} />} label="Conversas" count={conversations.length}>
                {conversations.map((row, i) => (
                    <ConversationHit
                      key={row.id}
                      row={row}
                      active={i === activeIndex}
                      onHover={() => onActiveIndexChange(i)}
                      onClick={() => onPickConversation(row)}
                    />
                ))}
              </Section>
            )}
            {deals.length > 0 && (
              <Section icon={<IconBriefcase size={13} />} label="Negócios" count={deals.length}>
                {deals.map((deal, i) => {
                  const index = dealOffset + i;
                  return (
                    <DealHit
                      key={deal.id}
                      deal={deal}
                      active={index === activeIndex}
                      onHover={() => onActiveIndexChange(index)}
                      onClick={() => onPickDeal(deal.id)}
                    />
                  );
                })}
              </Section>
            )}
          </>
        )}
      </div>
      {!loading && !empty && (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] px-3 py-2">
          <div className="flex items-center gap-3 font-body text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Kbd>
                <IconArrowUp size={10} />
                <IconArrowDown size={10} />
              </Kbd>
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>
                <IconCornerDownLeft size={11} />
              </Kbd>
              abrir
            </span>
          </div>
          <span className="font-display text-[12px] font-semibold text-[var(--brand-primary)]">
            Ver todos os {total} resultado{total === 1 ? "" : "s"}
          </span>
        </footer>
      )}
    </div>,
    document.body,
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-[6px] border border-black/[0.08] bg-[var(--glass-bg-overlay,#f4f6fb)] px-1 py-0.5 text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

function Section({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </p>
        <span className="ml-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--glass-bg-overlay,#eef1f6)] px-1.5 font-display text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
          {count}
        </span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function HitAvatar({
  id,
  name,
  imageUrl,
  overlay,
}: {
  id: string;
  name: string;
  imageUrl?: string | null;
  overlay: "chat" | "deal";
}) {
  return (
    <span className="relative mt-0.5 shrink-0">
      <ChatAvatar
        user={{ id, name, imageUrl: imageUrl ?? null }}
        size={AVATAR_SIZE.lg}
        channel={null}
      />
      <span className="absolute -bottom-px -right-px grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[var(--brand-primary)] shadow-sm ring-1 ring-black/[0.08]">
        {overlay === "chat" ? <IconMessage size={10} /> : <IconBriefcase size={10} />}
      </span>
    </span>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "muted" | "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wide",
        tone === "muted" && "bg-[#eef1f6] text-[#64748b]",
        tone === "success" && "bg-[#ecfdf5] text-[#059669]",
        tone === "danger" && "bg-[#fef2f2] text-[#dc2626]",
      )}
    >
      {children}
    </span>
  );
}

function ConversationHit({
  row,
  active,
  onHover,
  onClick,
}: {
  row: ConversationListRow;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const card = toConversationCard(row);
  const phone = formatPhoneDisplay(row.contact?.phone) || row.contact?.phone?.trim() || null;
  const closed = row.status === "RESOLVED";

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors",
        active ? "bg-[var(--color-primary-soft,#eef0fe)]" : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      <HitAvatar
        id={row.contact?.id ?? row.id}
        name={card.name}
        imageUrl={row.contact?.avatarUrl}
        overlay="chat"
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {card.name}
          </span>
          {row.number != null && (
            <span className="shrink-0 font-body text-[12px] tabular-nums text-[var(--text-muted)]">
              #{row.number}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 font-body text-[12px] text-[var(--text-secondary)]">
          <IconPhone size={12} className="shrink-0 text-[var(--text-muted)]" />
          <span className="truncate">{phone || card.preview || "Abrir conversa"}</span>
        </span>
      </span>
      {closed && <StatusPill tone="muted">Encerrada</StatusPill>}
    </button>
  );
}

function DealHit({
  deal,
  active,
  onHover,
  onClick,
}: {
  deal: DealListItemDto;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const name = sanitizeContactName(deal.contact?.name) || deal.title || "Negócio";
  const stage = deal.stage?.name?.trim() || null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors",
        active ? "bg-[var(--color-primary-soft,#eef0fe)]" : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      <HitAvatar
        id={deal.contact?.id ?? deal.id}
        name={name}
        imageUrl={deal.contact?.avatarUrl}
        overlay="deal"
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {name}
          </span>
          {deal.number != null && (
            <span className="shrink-0 font-body text-[12px] tabular-nums text-[var(--text-muted)]">
              #{deal.number}
            </span>
          )}
        </span>
        <span className="mt-0.5 truncate font-body text-[12px] text-[var(--text-secondary)]">
          {stage ? `Etapa ${stage}` : deal.title}
        </span>
      </span>
      <StatusPill tone={deal.status === "LOST" ? "danger" : "success"}>
        {DEAL_STATUS[deal.status]}
      </StatusPill>
    </button>
  );
}
