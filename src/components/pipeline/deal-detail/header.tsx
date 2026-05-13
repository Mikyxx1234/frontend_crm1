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
    <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/65">
      <div className="space-y-3 px-5 py-4">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
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
                  <Avatar className="size-11 border border-slate-200 bg-slate-100 shadow-sm">
                    <AvatarFallback className="bg-slate-100 text-sm font-bold text-slate-700">
                    {getInitials(contact?.name ?? deal.title)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {deal.stage.pipeline.name}
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: stageColor }}
                          aria-hidden
                        />
                        {deal.stage.name}
                      </div>
                    </div>

                    <h2 className="mt-2 truncate text-[30px] font-semibold tracking-tight text-slate-950">
                      {deal.title}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      {contact?.name ? (
                        <>
                          <span className="font-medium text-slate-700">{contact.name}</span>
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
  return <span className="size-1 rounded-full bg-slate-300" aria-hidden />;
}

function HeaderActionCluster({
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
    <div className="flex shrink-0 items-center gap-2 pr-12">
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
        {dealStatus === "OPEN" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[13px] text-emerald-700 shadow-none hover:bg-emerald-100"
              disabled={statusBusy}
              onClick={onWon}
            >
              <Trophy className="size-3.5" /> Ganho
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-xl border-rose-200 bg-rose-50 px-3 text-[13px] text-rose-700 shadow-none hover:bg-rose-100"
              disabled={statusBusy}
              onClick={onLostOpen}
            >
              <XCircle className="size-3.5" /> Perdido
            </Button>
          </>
        ) : dealStatus === "WON" ? (
          <>
            <Badge className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              Ganho
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-xl px-3 text-[13px] text-slate-600 hover:bg-white hover:text-slate-900"
              disabled={statusBusy}
              onClick={onReopen}
            >
              <RotateCcw className="size-3.5" /> Reabrir
            </Button>
          </>
        ) : (
          <>
            <Badge variant="destructive" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700">
              Perdido
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-xl px-3 text-[13px] text-slate-600 hover:bg-white hover:text-slate-900"
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
          className="size-8 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
