"use client";

import { useMemo, type ReactNode } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconMessageReply,
  IconSend,
  IconSpeakerphone,
} from "@tabler/icons-react";

import { KpiSquareScroll } from "@/components/crm/kpi-card";

import type { CampaignListItem, CampaignStatus } from "./types";
import { nf, rate } from "./viz";

const SENDING_SET: CampaignStatus[] = ["SENDING", "PROCESSING"];

export function CampaignsMiniDash({ items }: { items: CampaignListItem[] }) {
  const stats = useMemo(() => {
    let sending = 0;
    let sent = 0;
    let read = 0;
    let failed = 0;
    let replied = 0;
    for (const c of items) {
      if (SENDING_SET.includes(c.status)) sending++;
      sent += c.sentCount || 0;
      read += c.readCount || 0;
      failed += c.failedCount || 0;
      replied += c.repliedCount || 0;
    }
    return {
      total: items.length,
      sending,
      sent,
      failed,
      replied,
      readRate: rate(read, sent),
      failRate: rate(failed, sent + failed),
      replyRate: rate(replied, sent),
    };
  }, [items]);

  const cards: {
    key: string;
    label: string;
    shortLabel: string;
    value: number;
    percent?: number;
    accent: string;
    icon: ReactNode;
  }[] = [
    {
      key: "total",
      label: "Total de campanhas",
      shortLabel: "Campanhas",
      value: stats.total,
      accent: "var(--brand-primary)",
      icon: <IconSpeakerphone size={16} />,
    },
    {
      key: "sending",
      label: "Em envio agora",
      shortLabel: "Em envio",
      value: stats.sending,
      accent: "var(--color-warning)",
      icon: <IconSend size={16} />,
    },
    {
      key: "sent",
      label: "Enviadas · taxa de leitura",
      shortLabel: "Enviadas",
      value: stats.sent,
      percent: stats.readRate,
      accent: "var(--color-success)",
      icon: <IconCircleCheck size={16} />,
    },
    {
      key: "replied",
      label: "Respostas · taxa de resposta",
      shortLabel: "Respostas",
      value: stats.replied,
      percent: stats.replyRate,
      accent: "var(--brand-secondary)",
      icon: <IconMessageReply size={16} />,
    },
    {
      key: "failed",
      label: "Falhas · taxa de erro",
      shortLabel: "Falhas",
      value: stats.failed,
      percent: stats.failRate,
      accent: "var(--color-danger)",
      icon: <IconAlertTriangle size={16} />,
    },
  ];

  return (
    <section className="shrink-0" aria-label="Indicadores de campanhas">
      <KpiSquareScroll
        items={cards.map((c) => ({
          key: c.key,
          label: c.shortLabel,
          value: nf(c.value),
          icon: c.icon,
          accent: c.accent,
          percent: c.percent,
        }))}
      />
      <div className="hidden gap-3 lg:grid lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.key}
            className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in srgb, ${c.accent} 14%, transparent)`,
                color: c.accent,
              }}
            >
              {c.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[11.5px] font-semibold tracking-[0.01em] text-[var(--text-muted)]">
                {c.label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[22px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                  {nf(c.value)}
                </span>
                {c.percent !== undefined && (
                  <span
                    className="font-display text-[12px] font-bold tabular-nums"
                    style={{ color: c.accent }}
                  >
                    {c.percent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
