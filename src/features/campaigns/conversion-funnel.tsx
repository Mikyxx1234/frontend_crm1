import type { CampaignListItem } from "./types";
import { nf, rate } from "./viz";

const STAGES = [
  { key: "total" as const, label: "Total", tone: "bg-[var(--text-muted)]/30" },
  { key: "sent" as const, label: "Enviado", tone: "bg-[var(--brand-primary)]/70" },
  { key: "read" as const, label: "Lido", tone: "bg-[var(--color-success)]/80" },
  { key: "replied" as const, label: "Resp.", tone: "bg-[var(--color-success)]" },
];

function stageValue(c: CampaignListItem, key: (typeof STAGES)[number]["key"]): number {
  switch (key) {
    case "total":
      return c.totalRecipients || 0;
    case "sent":
      return c.sentCount || 0;
    case "read":
      return c.readCount || 0;
    case "replied":
      return c.repliedCount || 0;
  }
}

export function ConversionFunnel({ campaign }: { campaign: CampaignListItem }) {
  const total = campaign.totalRecipients || 0;
  const sent = campaign.sentCount || 0;
  const base = Math.max(total, sent, 1);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex h-8 items-end gap-1">
        {STAGES.map((s) => {
          const val = stageValue(campaign, s.key);
          const pct = Math.round((val / base) * 100);
          const ofSent =
            s.key === "read" || s.key === "replied" ? rate(val, sent) : rate(val, total);
          return (
            <div key={s.key} className="group relative min-w-0 flex-1">
              <div className="flex h-8 items-end overflow-hidden rounded-md bg-[var(--glass-bg-overlay)]">
                <div
                  className={`w-full rounded-md ${s.tone}`}
                  style={{ height: `${Math.max(8, pct)}%` }}
                />
              </div>
              <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text-primary)] px-2 py-1 font-body text-[10px] font-medium text-[var(--glass-bg-base)] opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                {s.label}: {nf(val)} · {ofSent}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1">
        {STAGES.map((s) => {
          const val = stageValue(campaign, s.key);
          const ofSent =
            s.key === "read" || s.key === "replied" ? rate(val, sent) : rate(val, total);
          return (
            <div key={s.key} className="min-w-0 text-center sm:flex-1">
              <p className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                {nf(val)}
              </p>
              <p className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                {s.label}
                {s.key !== "total" ? (
                  <span className="ml-1 text-[var(--text-muted)]/70">{ofSent}%</span>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
