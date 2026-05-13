"use client";

/**
 * WorkspaceHeader — padroniza o topo do workspace do deal (kanban) com
 * o MESMO componente `ConversationHeader` usado pelo Inbox e pelo Sales
 * Hub. Remove a versão custom (título gigante "Negócio - X" + breadcrumb
 * em trios) em favor do padrão: avatar + nome do contato + chip de etapa
 * + telefone/email + slot `actions` com Ganho/Perdido/Editar/Excluir.
 *
 * O título do deal migrou para a sidebar (pequeno card "Negócio" no
 * topo do painel de dados), alinhado ao padrão do SalesHub.
 *
 * Quando há uma conversa selecionada, o header também habilita os
 * controles de voz, transferir responsável e gerenciar tags — idêntico
 * ao comportamento do Inbox.
 */

import * as React from "react";
import { Pencil, PanelRightOpen, RotateCcw, Trash2, Trophy, XCircle } from "lucide-react";

import { ConversationHeader } from "@/components/inbox/conversation-header";
import type { TransferControlUser } from "@/components/inbox/transfer-control";
import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ds } from "@/lib/design-system";

import type { ContactDetail, ConversationRow, DealDetailData } from "./shared";

type WorkspaceHeaderProps = {
  deal: DealDetailData;
  contact: ContactDetail | undefined;

  // Ações do deal
  onEdit: () => void;
  onWon: () => void;
  onLostOpen: () => void;
  onReopen: () => void;
  onDelete: () => void;
  lostOpen: boolean;
  onLostConfirm: (reason: string) => void;
  onLostCancel: () => void;
  statusBusy: boolean;

  // Navegação
  onToggleSidebar?: () => void;
  onClose?: () => void;

  // Conversa ativa (opcional — habilita voz/transferir/tags)
  conversation?: ConversationRow | null;
  conversationTags?: { name: string; color: string }[] | null;

  // Atribuição
  myUserId?: string;
  canManageAssignee?: boolean;
  currentAssigneeId?: string | null;
  teamUsers?: TransferControlUser[];
  assignLoading?: boolean;
  onAssign?: (userId: string | null) => void;

  // Callback para refetch após mutação de tags
  onTagsUpdated?: () => void;

  // Evento "Histórico" no slot actions (abre drawer de timeline)
  onOpenHistory?: () => void;
};

export function WorkspaceHeader({
  deal,
  contact,
  onEdit,
  onWon,
  onLostOpen,
  onReopen,
  onDelete,
  lostOpen,
  onLostConfirm,
  onLostCancel,
  statusBusy,
  onToggleSidebar,
  onClose,
  conversation,
  conversationTags,
  myUserId,
  canManageAssignee,
  currentAssigneeId,
  teamUsers,
  assignLoading,
  onAssign,
  onTagsUpdated,
}: WorkspaceHeaderProps) {
  const contactTags = React.useMemo(() => {
    if (conversationTags && conversationTags.length > 0) return conversationTags;
    // Fallback para tags do deal (quando a API do deal já inclui relation tags).
    const fromDeal = deal.tags?.map((t) => ({ name: t.tag.name, color: t.tag.color }));
    return fromDeal ?? [];
  }, [conversationTags, deal.tags]);

  return (
    <>
      {/* Botão "abrir sidebar" fica à esquerda do header no mobile.
          Coloco num wrapper absoluto para não quebrar o layout do
          ConversationHeader, que é flex-centralizado. */}
      {onToggleSidebar ? (
        <div className="relative">
          <div className="pointer-events-none absolute left-2 top-2 z-10 md:hidden">
            <TooltipHost label="Dados do negócio" side="bottom">
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label="Abrir dados do negócio"
                className={cn(
                  "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full",
                  "border border-black/6 bg-white text-slate-600",
                  "transition-colors hover:bg-slate-50 active:scale-95",
                )}
              >
                <PanelRightOpen className="size-4" strokeWidth={2.2} />
              </button>
            </TooltipHost>
          </div>
        </div>
      ) : null}

      <ConversationHeader
        contactId={contact?.id}
        contactName={contact?.name ?? deal.title}
        contactPhone={contact?.phone ?? null}
        contactEmail={contact?.email ?? null}
        contactAvatarUrl={contact?.avatarUrl ?? null}
        contactChannel={conversation?.channel ?? null}
        contactHref={contact?.id ? `/contacts/${contact.id}` : null}
        tags={contactTags}
        stageName={deal.stage.name}
        stageColor={deal.stage.color ?? null}
        conversationId={conversation?.id ?? null}
        conversationChannel={conversation?.channel ?? null}
        canManageAssignee={canManageAssignee}
        myUserId={myUserId}
        currentAssigneeId={currentAssigneeId ?? conversation?.assignedToId ?? null}
        teamUsers={teamUsers}
        assignLoading={assignLoading}
        onAssign={onAssign}
        onTagsUpdated={onTagsUpdated}
        actions={
          <DealHeaderActions
            dealStatus={deal.status}
            statusBusy={statusBusy}
            onWon={onWon}
            onLostOpen={onLostOpen}
            onReopen={onReopen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        }
        onClose={onClose}
      />

      <LossReasonDialog
        open={lostOpen}
        onOpenChange={(o) => { if (!o) onLostCancel(); }}
        onConfirm={onLostConfirm}
        isPending={statusBusy}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DealHeaderActions
//
// Slot `actions` do ConversationHeader: Ganho/Perdido (ou Reabrir)
// + Editar + Excluir. Mesmo vocabulário visual dos chips soft do DS
// usado no SalesHub (`DealOutcomeButtons`).
// ─────────────────────────────────────────────────────────────────────────────

function DealHeaderActions({
  dealStatus,
  statusBusy,
  onWon,
  onLostOpen,
  onReopen,
  onEdit,
  onDelete,
}: {
  dealStatus: DealDetailData["status"];
  statusBusy: boolean;
  onWon: () => void;
  onLostOpen: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {dealStatus === "OPEN" ? (
        <>
          <ToneButton
            tone="emerald"
            icon={<Trophy className="size-3.5" strokeWidth={2.2} />}
            label="Ganho"
            disabled={statusBusy}
            onClick={onWon}
          />
          <ToneButton
            tone="rose"
            icon={<XCircle className="size-3.5" strokeWidth={2.2} />}
            label="Perdido"
            disabled={statusBusy}
            onClick={onLostOpen}
          />
        </>
      ) : (
        <ToneButton
          tone="slate"
          icon={<RotateCcw className="size-3.5" strokeWidth={2.2} />}
          label="Reabrir"
          disabled={statusBusy}
          onClick={onReopen}
        />
      )}

      <span className="mx-1 hidden h-5 w-px bg-slate-200/70 sm:block" aria-hidden />

      <TooltipHost label="Editar negócio" side="bottom">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar negócio"
          className={ds.button.icon}
        >
          <Pencil className="size-3.5" strokeWidth={2.2} />
        </button>
      </TooltipHost>
      <TooltipHost label="Excluir negócio" side="bottom">
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir negócio"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-lg text-slate-400",
            "transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95",
          )}
        >
          <Trash2 className="size-3.5" strokeWidth={2.2} />
        </button>
      </TooltipHost>
    </div>
  );
}

function ToneButton({
  tone,
  icon,
  label,
  disabled,
  onClick,
}: {
  tone: "emerald" | "rose" | "slate";
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-3",
        "text-[12px] font-semibold tracking-tight transition-colors",
        "active:scale-95 disabled:opacity-50",
        toneClass,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
