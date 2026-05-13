"use client";

/**
 * ConversationHeader — topo PADRÃO do Inbox e do Sales Hub
 * ─────────────────────────────────────────────────────────
 * Header único usado pelas duas telas (Inbox `/inbox` + Sales Hub
 * `/sales-hub`/`/pipeline?view=hub`). Substitui:
 *   • o `<header>` inline gigante de `app/(dashboard)/inbox/client-page.tsx`
 *   • o componente `SalesHubChatHeader` (deletado).
 *
 * O objetivo é o "mix do útil ao agradável" descrito pelo operador:
 * o visual clean/elegante do Sales Hub (avatar grande, telefone+email
 * sempre visíveis, chip de etapa) + as funções úteis do Inbox (chip
 * de sessão de voz, transferir responsável, tags, fechar).
 *
 * Ordem dos slots à direita (escolhida pelo operador):
 *   voz ▾  |  ⇄ transferir  |  🏷 tags  |  [actions slot]  |  ✕ fechar
 *
 * Estrutura:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ▲ barrinha 2px de sessão (cyan=ativa, vermelho=expirada)         │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │  [avatar 44]   Nome do contato  [tag1] [tag2] [+N]               │
 *   │                ● Proposta Enviada                                │
 *   │                📞 +55 71 …    ✉ contato@…   [voz ▾][⇄][🏷][actions][X]│
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Cada slot é renderizado condicionalmente — passar `null`/`undefined`
 * omite a coluna sem deixar gap. Isso permite que o Sales Hub mostre
 * Ganho/Perdido onde o Inbox mostra nada, e vice-versa.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Tag as TagIcon, X } from "lucide-react";
import { cn, resolveContactAvatarDisplayUrl } from "@/lib/utils";
import { ds } from "@/lib/design-system";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { TooltipHost } from "@/components/ui/tooltip";
import { RemindButton } from "@/components/inbox/remind-button";
import { TagPopover } from "@/components/inbox/tag-popover";
import { WhatsappCallChip } from "@/components/inbox/whatsapp-call-chip";
import {
  TransferControl,
  type TransferControlUser,
} from "@/components/inbox/transfer-control";

type ContactTag = { name: string; color: string };

export type ConversationHeaderProps = {
  // ── Identidade do contato ──
  contactId?: string | null;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAvatarUrl?: string | null;
  contactChannel?: string | null;
  /**
   * Link opcional pro perfil do contato. Quando passado, o nome
   * vira clicável e leva pra `/contacts/[id]` (comportamento atual
   * do Inbox).
   */
  contactHref?: string | null;
  /** Tags do contato/conversa — máx 2 visíveis + "+N". */
  tags?: ContactTag[] | null;

  // ── Etapa (opcional, só no Sales Hub) ──
  stageName?: string | null;
  stageColor?: string | null;

  // ── Sessão de conversa (CSW 24h) ──
  /** Faixa fina no topo: cyan = ativa, vermelho = expirada, omitida se null. */
  sessionActive?: boolean | null;

  // ── Sessão de voz (Call Permission) ──
  /** ID da conversa atual — necessário pro chip de voz e pro TagPopover. */
  conversationId?: string | null;
  /** Canal da conversa atual — controla a visibilidade do chip de voz. */
  conversationChannel?: string | null;

  // ── Atribuição / Transferência ──
  canManageAssignee?: boolean;
  myUserId?: string;
  currentAssigneeId?: string | null;
  teamUsers?: TransferControlUser[];
  assignLoading?: boolean;
  onAssign?: (userId: string | null) => void;

  // ── Tags ──
  /** Callback após mutação de tags (refetch). */
  onTagsUpdated?: () => void;

  // ── Slot livre à direita ──
  /** Ações específicas da tela (Ganho/Perdido no Sales Hub). */
  actions?: React.ReactNode;

  // ── Navegação ──
  /** Botão "voltar" mobile (`< xl`). Quando passado, aparece à esquerda. */
  onBack?: () => void;
  /** Botão "fechar" (X) à direita. Em mobile também serve como voltar. */
  onClose?: () => void;
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
  contactEmail,
  contactAvatarUrl,
  contactChannel,
  contactHref,
  tags,
  stageName,
  stageColor,
  sessionActive,
  conversationId,
  conversationChannel,
  canManageAssignee,
  myUserId,
  currentAssigneeId,
  teamUsers = [],
  assignLoading,
  onAssign,
  onTagsUpdated,
  actions,
  onBack,
  onClose,
}: ConversationHeaderProps) {
  const visibleTags = (tags ?? []).slice(0, 2);
  const extraTags = Math.max(0, (tags?.length ?? 0) - 2);

  const showCallChip = !!conversationId;
  const showRemind = !!contactId;
  const showTransfer =
    !!conversationId &&
    !!onAssign &&
    (canManageAssignee || (!!myUserId && !currentAssigneeId));
  const showTagPopover = !!conversationId;

  const NameTag = contactHref ? Link : "h2";
  const nameProps = contactHref
    ? { href: contactHref }
    : ({} as Record<string, never>);

  return (
    <div className="shrink-0 bg-white">
      {/* Banner fininho de sessão de conversa (CSW). */}
      {sessionActive != null && (
        <div
          className={cn(
            "h-[2px] w-full",
            sessionActive ? "bg-brand-cyan" : "bg-red-400",
          )}
        />
      )}

      {/* Mobile: padding lateral 12px (px-3) e gap menor entre blocos
          principais — em chat estreito ate 1px conta. Desktop preserva
          px-6 py-4 + gap-3 da identidade premium. */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 md:gap-3 md:px-6 md:py-4">
        {/* Botão voltar mobile (só aparece em < md). */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600 md:hidden"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Avatar 36px em mobile (libera ~8px de largura), 44px em
            desktop. ChatAvatar nao aceita prop responsiva; renderizamos
            duas instancias mutuamente exclusivas com hidden/block. */}
        <div className="shrink-0 md:hidden">
          <ChatAvatar
            user={{
              id: contactId ?? undefined,
              name: contactName,
              imageUrl: resolveContactAvatarDisplayUrl(contactAvatarUrl ?? null),
            }}
            phone={contactPhone ?? undefined}
            channel={normalizeChannel(contactChannel)}
            size={36}
          />
        </div>
        <div className="hidden shrink-0 md:block">
          <ChatAvatar
            user={{
              id: contactId ?? undefined,
              name: contactName,
              imageUrl: resolveContactAvatarDisplayUrl(contactAvatarUrl ?? null),
            }}
            phone={contactPhone ?? undefined}
            channel={normalizeChannel(contactChannel)}
            size={44}
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Linha 1 — Nome + tags + chip de etapa */}
          <div className="flex items-center gap-2">
            <NameTag
              {...(nameProps as { href: string })}
              className={cn(
                ds.text.title,
                "truncate text-[18px]",
                contactHref && "transition-colors hover:text-accent",
              )}
            >
              {contactName}
            </NameTag>

            {visibleTags.length > 0 && (
              <div className="flex items-center gap-1.5">
                {visibleTags.map((tag) => (
                  <span
                    key={tag.name}
                    className={ds.tag.solidLg}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
                {extraTags > 0 && (
                  <span className={ds.tag.moreLg}>+{extraTags}</span>
                )}
              </div>
            )}

            {stageName && (
              <span
                className={cn(ds.chip.softer, "shrink-0")}
                title={`Etapa: ${stageName}`}
              >
                <span
                  className={ds.chip.dot}
                  style={{ backgroundColor: stageColor ?? "#2563eb" }}
                />
                {stageName}
              </span>
            )}
          </div>

          {/* Linha 2 — Telefone + email.
              Oculta em mobile (< md): em chat estreito o telefone
              ficava sobreposto pelo chip "Voz" da direita, gerando o
              "amontoado" do screenshot. A info nao se perde — o chip
              de voz ja indica o canal, e o telefone esta no perfil
              do contato a 1 tap. */}
          {(contactPhone || contactEmail) && (
            <div
              className={cn(
                "mt-0.5 hidden items-center gap-3 md:flex",
                ds.text.meta,
              )}
            >
              {contactPhone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3 text-slate-400" strokeWidth={2} />
                  <span className="tabular-nums">{contactPhone}</span>
                </span>
              )}
              {contactEmail && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail
                    className="size-3 shrink-0 text-slate-400"
                    strokeWidth={2}
                  />
                  <span className="truncate">{contactEmail}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Lado direito — ordem fixa: voz | transferir | tags | actions | X.
            Mobile: gap-0.5 (4 botoes muito apertados em 360px de largura).
            Desktop: gap-2 da identidade premium. */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 md:gap-2">
          {showCallChip && (
            <WhatsappCallChip
              conversationId={conversationId!}
              channel={conversationChannel ?? null}
            />
          )}

          {showTransfer && (
            <TransferControl
              teamUsers={teamUsers}
              currentAssigneeId={currentAssigneeId}
              myUserId={myUserId}
              canManageAssignee={!!canManageAssignee}
              loading={assignLoading}
              onAssign={(uid) => onAssign?.(uid)}
            />
          )}

          {showRemind && (
            <RemindButton
              contactId={contactId!}
              contactName={contactName}
              conversationId={conversationId ?? undefined}
            />
          )}

          {showTagPopover && (
            <TagPopover
              conversationId={conversationId!}
              currentTags={tags ?? []}
              onTagsUpdated={() => onTagsUpdated?.()}
            >
              <TooltipHost label="Tags" side="bottom">
                <button
                  type="button"
                  className="p-2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="Tags"
                >
                  <TagIcon size={20} />
                </button>
              </TooltipHost>
            </TagPopover>
          )}

          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}

          {onClose && (
            <TooltipHost label="Fechar" side="bottom">
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-accent transition-colors hover:text-accent/80"
                aria-label="Fechar"
              >
                <X size={22} strokeWidth={3} />
              </button>
            </TooltipHost>
          )}
        </div>
      </div>
    </div>
  );
}
