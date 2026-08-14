import Link from "next/link";
import { IconBrandWhatsapp, IconMessageCircle, IconTrash } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { ConversionFunnel } from "./conversion-funnel";
import { DraftPlaceholder } from "./draft-placeholder";
import { FailureBadge } from "./failure-badge";
import { SendingProgress } from "./sending-progress";
import type { CampaignListItem } from "./types";
import {
  campaignSegmentLabel,
  fmtDateBR,
  fmtDateTimeBR,
  isDeletable,
  isDraftLike,
  isSendingLike,
} from "./viz";

export function CampaignRow({
  campaign,
  onDelete,
}: {
  campaign: CampaignListItem;
  onDelete?: (campaign: CampaignListItem) => void;
}) {
  const draft = isDraftLike(campaign);
  const sending = isSendingLike(campaign);
  const canDelete = isDeletable(campaign);
  const listLabel = campaignSegmentLabel(campaign);
  const dateLabel =
    campaign.status === "SCHEDULED" && campaign.scheduledAt
      ? `Agendada p/ ${fmtDateTimeBR(campaign.scheduledAt)}`
      : fmtDateBR(campaign.createdAt);

  const deleteHint = sending
    ? "Campanhas em envio não podem ser excluídas"
    : canDelete
      ? "Excluir campanha"
      : "Cancele a campanha antes de excluir";

  return (
    <article
      className={cn(
        "group relative z-0 flex w-full min-w-0 items-stretch overflow-visible rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
        "transition-all duration-150 hover:z-20 hover:-translate-y-0.5 hover:border-[var(--input-border-focus,rgba(91,111,245,0.50))] hover:shadow-[var(--glass-shadow)]",
      )}
    >
      <Link
        href={`/campaigns/${campaign.number ?? campaign.id}`}
        className={cn(
          "grid min-w-0 flex-1 items-stretch gap-3 overflow-visible p-4",
          "sm:gap-4 lg:grid-cols-[minmax(180px,1fr)_2.2fr_auto] lg:items-center",
        )}
      >
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-[var(--text-primary)]">
            {campaign.name}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 font-body text-xs text-[var(--text-muted)]">
            <IconBrandWhatsapp
              size={13}
              stroke={2.2}
              className="shrink-0 text-[var(--color-wa-dark,#128c4b)]"
              aria-hidden
            />
            <span className="min-w-0 truncate">
              {listLabel} · {dateLabel}
            </span>
          </p>
        </div>

        {draft ? (
          <DraftPlaceholder status={campaign.status} />
        ) : sending ? (
          <SendingProgress campaign={campaign} />
        ) : (
          <ConversionFunnel campaign={campaign} />
        )}

        {!draft &&
          (sending ? (
            <span className="inline-flex items-center gap-1.5 justify-self-start rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] px-3 py-1.5 font-display text-xs font-medium text-[var(--brand-primary)] lg:justify-self-end">
              <IconMessageCircle size={14} aria-hidden />
              Em envio
            </span>
          ) : (
            <FailureBadge campaign={campaign} />
          ))}
      </Link>

      {onDelete && (
        <div className="relative z-20 flex shrink-0 items-center pr-3">
          <button
            type="button"
            disabled={!canDelete}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canDelete) onDelete(campaign);
            }}
            aria-label={`Excluir ${campaign.name}`}
            title={deleteHint}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              "border border-transparent text-[var(--text-muted)] transition-all duration-150",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
              "hover:border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]/40",
              "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]",
            )}
          >
            <IconTrash size={15} stroke={2.2} />
          </button>
        </div>
      )}
    </article>
  );
}
