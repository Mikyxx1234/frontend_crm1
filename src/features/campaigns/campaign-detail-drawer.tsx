"use client";

import type { ElementType } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconCircleX,
  IconExternalLink,
  IconEye,
  IconMessageCircle,
  IconMessageReply,
  IconSend,
} from "@tabler/icons-react";

import { FormDialog } from "@/components/ui/form-dialog";
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

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-foreground",
}: {
  icon: ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-white px-3 py-2.5 dark:bg-[var(--color-bg-card)]">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon size={14} aria-hidden />
        {label}
      </span>
      <span className={cn("font-mono text-lg font-bold tabular-nums", tone)}>{value}</span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {nf(value)} · {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function statusBadgeClass(c: CampaignListItem, failPct: number): string {
  if (isSendingLike(c)) return "bg-primary/10 text-primary";
  if (isDraftLike(c)) return "bg-muted text-muted-foreground";
  if (failPct >= 6) return "bg-destructive/10 text-destructive";
  return "bg-success/10 text-success";
}

function DrawerBody({ campaign: c }: { campaign: CampaignListItem }) {
  const sent = c.sentCount || 0;
  const total = c.totalRecipients || 0;
  const read = c.readCount || 0;
  const replied = c.repliedCount || 0;
  const failed = c.failedCount || 0;
  const readPct = rate(read, sent);
  const replyPct = rate(replied, sent);
  const failPct = rate(failed, total);
  const anom = anomalies(c);
  const sending = isSendingLike(c);
  const draft = isDraftLike(c);

  return (
    <div className="flex flex-col gap-5">
      <span
        className={cn(
          "self-start rounded-md px-2 py-0.5 text-[10px] font-medium",
          statusBadgeClass(c, failPct),
        )}
      >
        {STATUS_META[c.status].label}
      </span>
      {draft ? (
        <p className="rounded-lg bg-muted px-3 py-6 text-center text-sm italic text-muted-foreground">
          {c.status === "SCHEDULED"
            ? "Aguardando disparo — configure e aguarde o início para ver as métricas."
            : "Rascunho — configure e lance a campanha para ver as métricas."}
        </p>
      ) : (
        <>
          {sending ? (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-2 rounded-full bg-primary" />
                    </span>
                    Enviando agora
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {nf(sent)} / {nf(total)} · faltam {nf(Math.max(0, total - sent))}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
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
                <span className="text-center font-mono text-xs font-semibold tabular-nums text-foreground">
                  {sendProgress(c)}% enviado
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Metric icon={IconSend} label="Total" value={nf(total)} sub="destinatários" />
              <Metric
                icon={IconSend}
                label="Enviado"
                value={nf(sent)}
                sub={`${rate(sent, total)}% do total`}
              />
              <Metric
                icon={IconEye}
                label="Lido"
                value={nf(read)}
                sub={`${readPct}% dos enviados`}
                tone="text-success"
              />
              <Metric
                icon={IconMessageReply}
                label="Resposta"
                value={`${replyPct}%`}
                sub={`${nf(replied)} respostas`}
                tone="text-primary"
              />
            </div>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Funil de conversão</h3>
              <FunnelStep
                label="Enviado"
                value={sent}
                pct={rate(sent, total)}
                tone="bg-foreground/70"
              />
              <FunnelStep label="Lido" value={read} pct={readPct} tone="bg-success" />
              <FunnelStep label="Respondido" value={replied} pct={replyPct} tone="bg-primary" />
              <FunnelStep label="Falha" value={failed} pct={failPct} tone="bg-destructive" />
            </section>

            <Metric
              icon={IconCircleX}
              label="Falhas"
              value={`${nf(failed)} · ${failPct}%`}
              sub="mensagens não entregues"
              tone={failPct >= 6 ? "text-destructive" : "text-foreground"}
            />

            {anom.length > 0 ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-destructive/10 p-3">
                {anom.map((a) => (
                  <p key={a} className="flex items-start gap-1.5 text-xs text-destructive">
                    <IconAlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                    {a}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        )}
    </div>
  );
}

export function CampaignDetailDrawer({
  campaign,
  onClose,
}: {
  campaign: CampaignListItem | null;
  onClose: () => void;
}) {
  const dateLabel = campaign
    ? campaign.status === "SCHEDULED" && campaign.scheduledAt
      ? fmtDateTimeBR(campaign.scheduledAt)
      : fmtDateBR(campaign.createdAt)
    : "";
  const href = campaign ? `/campaigns/${campaign.number ?? campaign.id}` : "#";

  return (
    <FormDialog
      open={!!campaign}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={campaign?.name ?? "Campanha"}
      description={
        campaign ? `${campaignSegmentLabel(campaign)} · ${dateLabel}` : undefined
      }
      icon={<IconMessageCircle size={20} />}
      size="lg"
      footer={
        campaign ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Abrir página da campanha
            <IconExternalLink size={13} aria-hidden />
          </Link>
        ) : undefined
      }
    >
      {campaign ? <DrawerBody campaign={campaign} /> : null}
    </FormDialog>
  );
}
