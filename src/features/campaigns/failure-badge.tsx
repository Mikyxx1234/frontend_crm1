import { IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import type { CampaignListItem } from "./types";
import { anomalies, nf, rate } from "./viz";

export function FailureBadge({ campaign }: { campaign: CampaignListItem }) {
  const anom = anomalies(campaign);
  const failPct = rate(campaign.failedCount || 0, campaign.totalRecipients || 0);
  const alert = failPct >= 6 || anom.length > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 justify-self-start rounded-lg px-3 py-1.5 font-display text-xs font-medium lg:justify-self-end",
        alert
          ? "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-text)]"
          : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
      )}
      title={anom.join(" · ") || undefined}
    >
      {alert ? <IconAlertTriangle size={14} aria-hidden /> : null}
      {nf(campaign.failedCount || 0)} falhas · {failPct}%
    </div>
  );
}
