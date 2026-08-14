"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type { CampaignListItem } from "./types";
import { campaignDayKey, fmtDateBR, isDraftLike, nf } from "./viz";

export function VolumeChart({
  items,
  selectedDate,
  onSelectDate,
}: {
  items: CampaignListItem[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const data = useMemo(
    () =>
      [...items]
        .filter((c) => !isDraftLike(c))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [items],
  );
  const max = Math.max(...data.map((c) => c.sentCount || 0), 1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = data.find((c) => c.id === activeId) ?? null;

  if (data.length === 0) return null;

  return (
    <div className="shrink-0 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-medium text-[var(--text-primary)]">
            Volume enviado por campanha
          </p>
          <p className="font-body text-xs text-[var(--text-muted)]">
            Últimas campanhas, mais antigas à esquerda
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
          pico {nf(max)}
        </span>
      </div>

      <p
        className="mt-3 min-h-5 font-body text-xs tabular-nums text-[var(--text-muted)]"
        aria-live="polite"
      >
        {active
          ? `${fmtDateBR(active.createdAt)} · ${nf(active.sentCount || 0)} enviados`
          : selectedDate
            ? `${fmtDateBR(selectedDate)} · lista filtrada`
            : "Passe o mouse ou foque uma barra"}
      </p>

      <div className="mt-2 overflow-x-auto">
        <div
          className="flex h-28 min-w-80 items-end gap-2"
          role="list"
          aria-label="Volume enviado por campanha"
        >
          {data.map((c) => {
            const day = campaignDayKey(c.createdAt);
            const selected = selectedDate === day;
            const dimmed = selectedDate !== null && !selected;
            return (
              <div key={c.id} className="flex h-full min-w-6 flex-1 items-end" role="listitem">
                <button
                  type="button"
                  className="group relative flex h-full w-full items-end rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                  aria-label={`${fmtDateBR(c.createdAt)}: ${nf(c.sentCount || 0)} enviados. ${c.name}`}
                  aria-pressed={selected}
                  onClick={() => onSelectDate(selected ? null : day)}
                  onMouseEnter={() => setActiveId(c.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(c.id)}
                  onBlur={() => setActiveId(null)}
                >
                  <span
                    className={cn(
                      "w-full rounded-t-md transition-colors motion-reduce:transition-none",
                      dimmed
                        ? "bg-[var(--brand-primary)]/30"
                        : selected
                          ? "bg-[var(--brand-primary)]"
                          : "bg-[var(--brand-primary)]/80 group-hover:bg-[var(--brand-primary)] group-focus-visible:bg-[var(--brand-primary)]",
                    )}
                    style={{ height: `${((c.sentCount || 0) / max) * 100}%` }}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text-primary)] px-2 py-1 font-body text-[10px] font-medium text-[var(--glass-bg-base)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:block">
                    {fmtDateBR(c.createdAt)} · {nf(c.sentCount || 0)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-body text-[var(--text-muted)]">
            Filtrado por {fmtDateBR(selectedDate)}
          </span>
          <button
            type="button"
            className="rounded-md border border-[var(--glass-border)] px-2 py-1 font-display font-medium text-[var(--text-primary)] hover:bg-[var(--glass-bg-overlay)]"
            onClick={() => onSelectDate(null)}
          >
            Limpar filtro
          </button>
        </div>
      ) : (
        <p className="mt-3 font-body text-xs text-[var(--text-muted)]">
          Clique numa barra para filtrar o dia.
        </p>
      )}
    </div>
  );
}
