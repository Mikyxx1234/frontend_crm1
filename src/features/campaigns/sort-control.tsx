"use client";

import { SORT_KEYS, SORT_LABEL, type CampaignSortKey } from "./viz";

export function SortControl({
  value,
  onChange,
}: {
  value: CampaignSortKey;
  onChange: (key: CampaignSortKey) => void;
}) {
  return (
    <label className="flex items-center gap-2 font-body text-xs text-[var(--text-muted)]">
      <span>Ordenar</span>
      <select
        className="h-7 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-2 font-display font-medium text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
        value={value}
        onChange={(e) => onChange(e.target.value as CampaignSortKey)}
        aria-label="Ordenar campanhas"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {SORT_LABEL[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
