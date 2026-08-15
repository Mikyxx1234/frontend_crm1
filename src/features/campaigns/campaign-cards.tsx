"use client";

import { IconAlertTriangle, IconMessageCircle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { STATUS_META } from "./constants";
import type { CampaignListItem } from "./types";
import {
  anomalies,
  campaignSegmentLabel,
  fmtDateBR,
  fmtDateTimeBR,
  isDraftLike,
  isSendingLike,
  nf,
  rate,
  sendProgress,
} from "./viz";

function Ring({ c }: { c: CampaignListItem }) {
  const sent = c.sentCount || 0;
  const total = c.totalRecipients || 0;
  const readPct = rate(c.readCount || 0, sent);
  const replyPct = rate(c.repliedCount || 0, sent);
  const failPct = rate(c.failedCount || 0, total);
  const a = readPct;
  const b = a + replyPct;
  const d = b + failPct;
  const ring = `conic-gradient(var(--color-success) 0% ${a}%, var(--color-primary) ${a}% ${b}%, var(--color-destructive) ${b}% ${d}%, var(--color-muted) ${d}% 100%)`;
  return (
    <div className="relative size-20 shrink-0 rounded-full" style={{ background: ring }}>
      <div className="absolute inset-1.5 flex flex-col items-center justify-center rounded-full bg-white dark:bg-[var(--color-bg-card)]">
        <span className="font-mono text-base font-bold leading-none tabular-nums text-foreground">
          {readPct}%
        </span>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">leitura</span>
      </div>
    </div>
  );
}

function LegendDot({
  tone,
  label,
  value,
}: {
  tone: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", tone)} aria-hidden="true" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono text-[11px] font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function statusBadgeClass(c: CampaignListItem, failPct: number): string {
  if (isSendingLike(c)) return "bg-primary/10 text-primary";
  if (isDraftLike(c)) return "bg-muted text-muted-foreground";
  if (failPct >= 6) return "bg-destructive/10 text-destructive";
  return "bg-success/10 text-success";
}

function Card({
  c,
  onSelect,
}: {
  c: CampaignListItem;
  onSelect: (c: CampaignListItem) => void;
}) {
  const sent = c.sentCount || 0;
  const total = c.totalRecipients || 0;
  const failPct = rate(c.failedCount || 0, total);
  const replyPct = rate(c.repliedCount || 0, sent);
  const readPct = rate(c.readCount || 0, sent);
  const anom = anomalies(c);
  const sending = isSendingLike(c);
  const draft = isDraftLike(c);
  const dateLabel =
    c.status === "SCHEDULED" && c.scheduledAt
      ? fmtDateTimeBR(c.scheduledAt)
      : fmtDateBR(c.createdAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-[var(--color-bg-card)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <IconMessageCircle size={12} className="text-success" aria-hidden />
            {campaignSegmentLabel(c)} · {dateLabel}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
            statusBadgeClass(c, failPct),
          )}
        >
          {STATUS_META[c.status].label}
        </span>
      </div>

      {draft ? (
        <p className="py-4 text-center text-xs italic text-muted-foreground">
          {c.status === "SCHEDULED"
            ? "Aguardando disparo — métricas após o início do envio."
            : "Rascunho — lance a campanha para ver métricas."}
        </p>
      ) : sending ? (
        <div className="flex flex-col gap-2 py-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-medium text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Enviando
            </span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {nf(sent)} / {nf(total)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="sending-bar h-full rounded-full bg-primary"
              style={{ width: `${sendProgress(c)}%` }}
              role="progressbar"
              aria-valuenow={sendProgress(c)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Envio em ${sendProgress(c)}%`}
            />
          </div>
          <span className="text-center font-mono text-[11px] font-semibold tabular-nums text-foreground">
            {sendProgress(c)}% enviado
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Ring c={c} />
          <div className="flex flex-1 flex-col gap-1.5">
            <LegendDot
              tone="bg-success"
              label="Lido"
              value={`${nf(c.readCount || 0)} · ${readPct}%`}
            />
            <LegendDot
              tone="bg-primary"
              label="Resp."
              value={`${nf(c.repliedCount || 0)} · ${replyPct}%`}
            />
            <LegendDot
              tone="bg-destructive"
              label="Falha"
              value={`${nf(c.failedCount || 0)} · ${failPct}%`}
            />
          </div>
        </div>
      )}

      {anom.length > 0 && !draft ? (
        <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          <IconAlertTriangle size={12} className="shrink-0" aria-hidden />
          {anom[0]}
        </p>
      ) : null}
    </button>
  );
}

export function CampaignCards({
  items,
  onSelect,
}: {
  items: CampaignListItem[];
  onSelect: (c: CampaignListItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((c) => (
        <Card key={c.id} c={c} onSelect={onSelect} />
      ))}
    </div>
  );
}
