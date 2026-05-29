"use client";

/*
 * Tab "Timeline" do DealDetailPanel — historico de eventos do deal.
 * GET /api/deals/:id/timeline.
 */

import {
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrendingUp,
  IconUser,
} from "@tabler/icons-react";

import { useDealTimeline } from "@/features/pipeline-v2/hooks";
import type { DealTimelineEvent } from "@/features/pipeline-v2/api";

interface DealTimelineTabProps {
  dealId: string;
}

const TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }>; color: string }
> = {
  CREATED: { label: "Negocio criado", icon: IconPlus, color: "#5b6ff5" },
  STAGE_CHANGED: { label: "Estagio alterado", icon: IconTrendingUp, color: "#5b6ff5" },
  STATUS_CHANGED: { label: "Status alterado", icon: IconRefresh, color: "#a78bfa" },
  WON: { label: "Negocio ganho", icon: IconCircleCheck, color: "#10b981" },
  LOST: { label: "Negocio perdido", icon: IconCircleX, color: "#ef4444" },
  ASSIGNED: { label: "Responsavel alterado", icon: IconUser, color: "#5b6ff5" },
  FIELD_UPDATED: { label: "Campo atualizado", icon: IconEdit, color: "#718096" },
  CUSTOM_FIELD_UPDATED: { label: "Campo custom alterado", icon: IconEdit, color: "#718096" },
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function describe(ev: DealTimelineEvent): string {
  const meta = ev.meta ?? {};
  if (ev.type === "STAGE_CHANGED") {
    const from = (meta.from as { name?: string } | string | undefined);
    const to = (meta.to as { name?: string } | string | undefined);
    const fromName =
      typeof from === "string" ? from : from?.name ?? "?";
    const toName = typeof to === "string" ? to : to?.name ?? "?";
    return `${fromName} → ${toName}`;
  }
  if (ev.type === "STATUS_CHANGED") {
    return `${meta.from ?? "?"} → ${meta.to ?? "?"}`;
  }
  if (ev.type === "FIELD_UPDATED" || ev.type === "CUSTOM_FIELD_UPDATED") {
    return String(meta.fieldLabel ?? meta.fieldId ?? "");
  }
  return "";
}

export function DealTimelineTab({ dealId }: DealTimelineTabProps) {
  const { data: events = [], isLoading, isError } = useDealTimeline(dealId);

  if (isLoading) {
    return (
      <div className="p-[22px] text-[12.5px] text-[var(--text-muted,#718096)]">
        Carregando timeline...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-[22px] text-[12.5px] text-[var(--color-danger,#ef4444)]">
        Erro ao carregar timeline.
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--text-muted,#718096)]">
        <IconClock size={36} className="opacity-40" />
        <div className="font-display text-[13px] font-semibold">
          Sem eventos ainda
        </div>
        <p className="max-w-xs text-[12px]">
          Mudancas de estagio, status e atribuicoes apareceram aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-[22px]">
      {events.map((ev) => {
        const meta = TYPE_META[ev.type] ?? {
          label: ev.type,
          icon: IconClock,
          color: "#718096",
        };
        const Icon = meta.icon;
        const desc = describe(ev);
        return (
          <div
            key={ev.id}
            className="flex items-start gap-3 rounded-[var(--radius-lg)] border p-3"
            style={{
              background: "var(--glass-bg-overlay, rgba(255,255,255,0.6))",
              borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${meta.color}1f`, color: meta.color }}
            >
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[12.5px] font-semibold text-[var(--text-primary,#1a202c)]">
                  {meta.label}
                </span>
                <span className="text-[10.5px] text-[var(--text-muted,#718096)]">
                  {fmtDate(ev.createdAt)}
                </span>
              </div>
              {desc ? (
                <div className="mt-0.5 text-[12px] text-[var(--text-secondary,#4a5568)]">
                  {desc}
                </div>
              ) : null}
              {ev.user?.name ? (
                <div className="mt-0.5 text-[11px] text-[var(--text-muted,#718096)]">
                  por {ev.user.name}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
