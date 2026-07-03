"use client";

import {
  Pencil,
  RotateCcw,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getInitials } from "@/lib/utils";
import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { RunAutomationButton } from "@/components/automations/run-automation-button";

import { ContactDetail, DealDetailData } from "./shared";

type DealHeaderProps = {
  deal: DealDetailData;
  contact: ContactDetail | undefined;
  onEdit: () => void;
  onWon: () => void;
  onLostOpen: () => void;
  onReopen: () => void;
  onDelete: () => void;
  lostOpen: boolean;
  onLostConfirm: (reason: string) => void;
  onLostCancel: () => void;
  statusBusy: boolean;
};

export function DealHeader({
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
}: DealHeaderProps) {
  const createdAtLabel = formatDate(deal.createdAt);
  const stageColor = deal.stage.color ?? "#2563eb";

  return (
    <div className="shrink-0 border-b border-border/80 bg-[var(--color-bg-subtle)]/65">
      <div className="space-y-3 px-5 py-4">
        <section className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${stageColor} 0%, rgba(37,99,235,0.14) 100%)`,
            }}
            aria-hidden
          />

          <div className="px-5 pb-4 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 border border-border bg-[var(--glass-bg-subtle)] shadow-sm">
                    <AvatarFallback className="bg-[var(--glass-bg-subtle)] text-sm font-bold text-foreground">
                    {getInitials(contact?.name ?? deal.title)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center rounded-full border border-border bg-[var(--color-bg-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {deal.stage.pipeline.name}
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-soft)]">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: stageColor }}
                          aria-hidden
                        />
                        {deal.stage.name}
                      </div>
                    </div>

                    <h2 className="mt-2 truncate text-[30px] font-semibold tracking-tight text-[var(--text-primary)]">
                      {deal.title}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                      {contact?.name ? (
                        <>
                          <span className="font-medium text-foreground">{contact.name}</span>
                          <DotDivider />
                        </>
                      ) : null}
                      <span>Criado em {createdAtLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <HeaderActionCluster
                dealStatus={deal.status}
                statusBusy={statusBusy}
                onWon={onWon}
                onLostOpen={onLostOpen}
                onReopen={onReopen}
                onEdit={onEdit}
                onDelete={onDelete}
                dealId={deal.id}
                contactId={contact?.id ?? null}
              />
            </div>

          </div>
        </section>

        <LossReasonDialog
          open={lostOpen}
          onOpenChange={(o) => { if (!o) onLostCancel(); }}
          onConfirm={onLostConfirm}
          isPending={statusBusy}
        />
      </div>
    </div>
  );
}

function DotDivider() {
  return <span className="size-1 rounded-full bg-[var(--glass-border)]" aria-hidden />;
}

function HeaderActionCluster({
  dealStatus,
  statusBusy,
  onWon,
  onLostOpen,
  onReopen,
  onEdit,
  onDelete,
  dealId,
  contactId,
}: {
  dealStatus: DealDetailData["status"];
  statusBusy: boolean;
  onWon: () => void;
  onLostOpen: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dealId: string;
  contactId: string | null;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 pr-12">
      {/* "Rodar automação" — so aparece quando ha contato vinculado.
          Deals sem contato nao tem onde aplicar a automacao (steps
          dependem de contactId pra add tag, enviar mensagem, etc). */}
      {contactId ? (
        <RunAutomationButton
          variant="inline"
          contactId={contactId}
          dealId={dealId}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-[var(--color-bg-subtle)] p-1.5">
        {dealStatus === "OPEN" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 text-[13px] text-[var(--color-success)] shadow-none hover:bg-[var(--color-success)]/20"
              disabled={statusBusy}
              onClick={onWon}
            >
              <Trophy className="size-3.5" /> Ganho
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-xl border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 text-[13px] text-[var(--color-danger)] shadow-none hover:bg-[var(--color-danger)]/20"
              disabled={statusBusy}
              onClick={onLostOpen}
            >
              <XCircle className="size-3.5" /> Perdido
            </Button>
          </>
        ) : dealStatus === "WON" ? (
          <>
            <Badge className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-1.5 text-[var(--color-success)]">
              Ganho
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-xl px-3 text-[13px] text-[var(--color-ink-soft)] hover:bg-white hover:text-[var(--text-primary)]"
              disabled={statusBusy}
              onClick={onReopen}
            >
              <RotateCcw className="size-3.5" /> Reabrir
            </Button>
          </>
        ) : (
          <>
            <Badge variant="destructive" className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-1.5 text-[var(--color-danger)]">
              Perdido
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-xl px-3 text-[13px] text-[var(--color-ink-soft)] hover:bg-white hover:text-[var(--text-primary)]"
              disabled={statusBusy}
              onClick={onReopen}
            >
              <RotateCcw className="size-3.5" /> Reabrir
            </Button>
          </>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 rounded-xl text-[var(--text-muted)] hover:bg-white hover:text-[var(--text-primary)]"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 rounded-xl text-[var(--text-muted)] hover:bg-white hover:text-[var(--text-primary)]"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
