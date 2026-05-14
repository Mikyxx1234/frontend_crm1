"use client";

/**
 * ConversationHeader — barra única estilo WhatsApp (Inbox + Sales Hub).
 * Uma linha ~46px: avatar + nome/telefone | tabs flex-1 | ações · buscar · (⋮ opcional)
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MoreVertical, Phone, Search, X } from "lucide-react";

import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn, resolveContactAvatarDisplayUrl } from "@/lib/utils";

export type ConversationHeaderTab = {
  key: string;
  label: string;
  count?: number;
};

export type ConversationHeaderProps = {
  contactId?: string | null;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAvatarUrl?: string | null;
  contactChannel?: string | null;
  contactHref?: string | null;
  tags?: { name: string; color: string }[] | null;

  conversationId?: string | null;
  conversationChannel?: string | null;

  canManageAssignee?: boolean;
  myUserId?: string;
  currentAssigneeId?: string | null;
  teamUsers?: import("@/components/inbox/transfer-control").TransferControlUser[];
  assignLoading?: boolean;
  onAssign?: (userId: string | null) => void;
  onTagsUpdated?: () => void;

  /** Conteúdo do menu ⋮ (voz, transferir, lembrete, tags…). */
  overflowMenu?: React.ReactNode;
  /** Ações extras antes de “Fechar” (ex.: Ganho/Perdido). */
  actionsSlot?: React.ReactNode;
  /** Ações na barra (ex.: transferir, lembrete) — usado no Inbox com `hideOverflowMenu`. */
  toolbarActions?: React.ReactNode;
  /**
   * Substitui o atalho `tel:` na posição do telefone.
   * `undefined` = mantém `tel:` quando houver número.
   */
  phoneReplacement?: React.ReactNode;
  /** Esconde o menu ⋮; use com `toolbarActions` e `phoneReplacement` (Inbox). */
  hideOverflowMenu?: boolean;

  onBack?: () => void;
  onClose?: () => void;
  onOpenConversationList?: () => void;
  onSearch?: () => void;

  tabs?: ConversationHeaderTab[] | null;
  activeTab?: string;
  onTabChange?: (key: string) => void;
};

function normalizeChannel(raw: string | null | undefined): ChatAvatarChannel {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "whatsapp" || v === "instagram" || v === "email" || v === "meta") {
    return v as ChatAvatarChannel;
  }
  return null;
}

export function ConversationHeader({
  contactId,
  contactName,
  contactPhone,
  contactAvatarUrl,
  contactChannel,
  contactHref,
  conversationChannel,
  overflowMenu,
  actionsSlot,
  toolbarActions,
  phoneReplacement,
  hideOverflowMenu,
  onBack,
  onClose,
  onOpenConversationList,
  onSearch,
  tabs,
  activeTab,
  onTabChange,
}: ConversationHeaderProps) {
  const telHref = contactPhone?.replace(/\s/g, "")
    ? `tel:${contactPhone.replace(/\s/g, "")}`
    : null;

  const hasKebabContent =
    !!overflowMenu || !!actionsSlot || !!onClose || !!onOpenConversationList;
  const showKebab = !hideOverflowMenu && hasKebabContent;

  const tabList = tabs?.filter(Boolean) ?? [];

  return (
    <div
      className="flex shrink-0 items-stretch border-b border-border bg-white"
      style={{ minHeight: 46 }}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2.5 border-r border-border px-2 sm:px-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)] md:hidden"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
          </button>
        ) : null}

        {onOpenConversationList ? (
          <button
            type="button"
            onClick={onOpenConversationList}
            className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] sm:flex"
            aria-label="Lista de conversas"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        ) : null}

        <ChatAvatar
          user={{
            id: contactId ?? undefined,
            name: contactName,
            imageUrl: resolveContactAvatarDisplayUrl(contactAvatarUrl ?? null),
          }}
          phone={contactPhone ?? undefined}
          channel={normalizeChannel(contactChannel ?? conversationChannel)}
          size={34}
        />

        <div className="min-w-0 max-w-[min(200px,40vw)] sm:max-w-[min(260px,32vw)]">
          {contactHref ? (
            <Link
              href={contactHref}
              className="block truncate text-[13px] font-semibold text-foreground transition-colors hover:text-primary"
            >
              {contactName}
            </Link>
          ) : (
            <p className="truncate text-[13px] font-semibold text-foreground">{contactName}</p>
          )}
          {contactPhone ? (
            <p className="truncate font-mono text-[10px] text-[var(--color-ink-muted)] tabular-nums">
              {contactPhone}
            </p>
          ) : null}
        </div>
      </div>

      {tabList.length > 0 ? (
        <div className="relative flex min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <div role="tablist" className="flex min-h-0 min-w-0">
            {tabList.map((tab) => {
              const active = activeTab === tab.key;
              const showCount = typeof tab.count === "number" && tab.count > 0;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => onTabChange?.(tab.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0 text-[12px] font-medium transition-colors sm:px-3",
                    active
                      ? "border-b-2 border-primary font-semibold text-primary"
                      : "border-b-2 border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]",
                  )}
                >
                  {tab.label}
                  {showCount ? (
                    <span
                      className={cn(
                        "rounded px-1 text-[10px] font-semibold tabular-nums leading-4",
                        active
                          ? "bg-[var(--color-primary-soft)] text-primary"
                          : "bg-[var(--color-bg-subtle)] text-[var(--color-ink-muted)]",
                      )}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="flex min-w-0 shrink-0 items-center gap-0.5 border-l border-border px-1.5 sm:px-2">
        {toolbarActions ? (
          <div className="flex min-w-0 max-w-[min(200px,38vw)] shrink items-center gap-0.5 overflow-hidden sm:max-w-none">
            {toolbarActions}
          </div>
        ) : null}

        {phoneReplacement !== undefined ? (
          phoneReplacement ? (
            <div className="flex max-w-[min(200px,42vw)] shrink-0 items-center justify-center sm:max-w-[240px]">
              {phoneReplacement}
            </div>
          ) : null
        ) : telHref ? (
          <TooltipHost label="Ligar" side="bottom">
            <a
              href={telHref}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)]"
              aria-label="Ligar"
            >
              <Phone className="size-4" strokeWidth={1.5} />
            </a>
          </TooltipHost>
        ) : null}

        {onSearch ? (
          <TooltipHost label="Buscar na conversa" side="bottom">
            <button
              type="button"
              onClick={onSearch}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)]"
              aria-label="Buscar na conversa"
            >
              <Search className="size-4" strokeWidth={1.5} />
            </button>
          </TooltipHost>
        ) : null}

        {showKebab ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8 shrink-0 rounded-lg border-0 bg-transparent p-0 text-[var(--color-ink-muted)] shadow-none ring-offset-0 hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
              aria-label="Mais ações"
            >
              <MoreVertical className="size-4" strokeWidth={1.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(280px,calc(100vw-2rem))]">
              {onOpenConversationList ? (
                <DropdownMenuItem className="sm:hidden" onClick={() => onOpenConversationList()}>
                  Conversas do contato
                </DropdownMenuItem>
              ) : null}
              {onOpenConversationList ? <DropdownMenuSeparator className="sm:hidden" /> : null}
              {overflowMenu}
              {actionsSlot ? (
                <>
                  {overflowMenu ? <DropdownMenuSeparator /> : null}
                  <div className="px-2 py-2">{actionsSlot}</div>
                </>
              ) : null}
              {onClose ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onClose} className="text-[var(--color-ink-soft)]">
                    <X className="mr-2 size-3.5" strokeWidth={2} />
                    Fechar conversa
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {hideOverflowMenu && onClose ? (
          <TooltipHost label="Fechar conversa" side="bottom">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar conversa"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)]"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </TooltipHost>
        ) : null}
      </div>
    </div>
  );
}
