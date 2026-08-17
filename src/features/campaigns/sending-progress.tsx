import type { CampaignListItem } from "./types";
import { nf, sendProgress } from "./viz";

export function SendingProgress({ campaign }: { campaign: CampaignListItem }) {
  const sent = campaign.sentCount || 0;
  const total = campaign.totalRecipients || 0;
  const pct = sendProgress(campaign);
  const remaining = Math.max(0, total - sent);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
        <span className="inline-flex items-center gap-1.5 font-display font-medium text-[var(--brand-primary)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--brand-primary)]" />
          </span>
          Enviando agora
        </span>
        <span className="font-mono tabular-nums text-[var(--text-muted)]">
          {nf(sent)} / {nf(total)}
          <span> · faltam {nf(remaining)}</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--glass-bg-overlay)]">
        <div
          className="sending-bar h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.max(3, pct)}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Envio em ${pct}%`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 font-body text-[11px] text-[var(--text-muted)]">
        <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
          {pct}% enviado
        </span>
        <span className="flex flex-wrap gap-x-2">
          <span>{nf(campaign.readCount || 0)} lidos</span>
          <span>{nf(campaign.repliedCount || 0)} resp.</span>
          <span>{nf(campaign.failedCount || 0)} falhas (parcial)</span>
        </span>
      </div>
    </div>
  );
}
