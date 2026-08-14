import Link from "next/link";
import { IconBrandWhatsapp, IconMessageCircle } from "@tabler/icons-react";

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
  isDraftLike,
  isSendingLike,
} from "./viz";

export function CampaignRow({ campaign }: { campaign: CampaignListItem }) {
  const draft = isDraftLike(campaign);
  const sending = isSendingLike(campaign);
  const listLabel = campaignSegmentLabel(campaign);
  const dateLabel =
    campaign.status === "SCHEDULED" && campaign.scheduledAt
      ? `Agendada p/ ${fmtDateTimeBR(campaign.scheduledAt)}`
      : fmtDateBR(campaign.createdAt);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className={cn(
        "group grid w-full min-w-0 grid-cols-1 items-stretch gap-3 overflow-visible rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md",
        "transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--input-border-focus,rgba(91,111,245,0.50))] hover:shadow-[var(--glass-shadow)]",
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
  );
}
