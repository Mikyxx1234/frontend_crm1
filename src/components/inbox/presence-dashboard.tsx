"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { cn } from "@/lib/utils";

export type AgentPresenceStatus = "ONLINE" | "AWAY" | "OFFLINE";

const STATUS_LABEL: Record<AgentPresenceStatus, string> = {
  ONLINE: "Online",
  AWAY: "Ausente",
  OFFLINE: "Offline",
};

const STATUS_DOT: Record<AgentPresenceStatus, string> = {
  ONLINE: "bg-[#22c55e]",
  AWAY: "bg-amber-500",
  OFFLINE: "bg-slate-400",
};

export type AgentCapacityTone = "healthy" | "busy" | "overloaded";

export interface PresenceDashboardProps {
  agent: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
  status: AgentPresenceStatus;
  /**
   * Percentual de ocupação (0–100). Se não informado, assume 0% (livre).
   * Representa `conversasAbertasAtribuídas / capacidadeMáxima`.
   */
  capacity?: number;
  /** Conversas abertas atribuídas ao agente agora (para tooltip). */
  activeConversations?: number;
  /** Capacidade máxima recomendada (para tooltip). */
  maxConcurrent?: number;
  /** Tom já calculado pelo backend com base em thresholds. */
  tone?: AgentCapacityTone;
  /** Indica que ainda está carregando a capacidade real do servidor. */
  capacityLoading?: boolean;
  /** URL que abre o menu para alternar o status. */
  manageHref?: string;
  className?: string;
}

// Thresholds consistentes com `/api/inbox/agent-capacity`. Mantemos como
// fallback quando o backend não envia `tone` (ex.: durante loading).
function toneFromPct(pct: number): AgentCapacityTone {
  if (pct > 85) return "overloaded";
  if (pct >= 60) return "busy";
  return "healthy";
}

const CAPACITY_COLOR: Record<AgentCapacityTone, string> = {
  healthy: "text-green-500",
  busy: "text-amber-500",
  overloaded: "text-red-500",
};

export function PresenceDashboard({
  agent,
  status,
  capacity,
  activeConversations,
  maxConcurrent,
  tone,
  capacityLoading = false,
  manageHref = "/settings/schedules",
  className,
}: PresenceDashboardProps) {
  const isOnline = status === "ONLINE";
  const capValue = Math.max(0, Math.min(100, capacity ?? 0));
  const effectiveTone = tone ?? toneFromPct(capValue);
  const capacityTitle =
    activeConversations != null && maxConcurrent != null
      ? `${activeConversations} de ${maxConcurrent} conversas atribuídas (${capValue}% da capacidade)`
      : `${capValue}% da capacidade utilizada`;

  return (
    <div className={cn("font-outfit relative", className)}>
      {/* Glow gradiente externo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 -z-10 rounded-3xl bg-gradient-to-r from-[#22c55e] to-[#06b6d4] opacity-20 blur-xl"
      />
      <div
        role="status"
        aria-live="polite"
        aria-label={`Você está ${STATUS_LABEL[status]} com ${capValue}% de capacidade.`}
        className="relative flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-premium"
      >
      {/* Esquerda: Avatar + labels */}
      <div className="flex min-w-0 items-center">
        <div className="relative size-[36px] shrink-0">
          <ChatAvatar
            user={{ id: agent.id, name: agent.name, imageUrl: agent.imageUrl }}
            size={36}
            channel={null}
            hideCartoon
          />
          <span className="pointer-events-none absolute bottom-0 right-0 flex size-3 items-center justify-center">
            {isOnline && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2.5 rounded-full border-2 border-white",
                STATUS_DOT[status],
              )}
            />
          </span>
        </div>

        <div className="ml-3 flex min-w-0 flex-col leading-none">
          <span className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
            Status do agente
          </span>
          <Link
            href={manageHref}
            className="group flex items-center gap-1 text-[14px] font-black tracking-tighter text-slate-800 transition-colors hover:text-[#507df1]"
          >
            <span className="truncate">{STATUS_LABEL[status]}</span>
            <ChevronDown
              size={14}
              className="shrink-0 text-slate-400 transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-[#507df1]"
            />
          </Link>
        </div>
      </div>

      {/* Direita: Capacidade */}
      <div
        className="flex shrink-0 flex-col items-end leading-none"
        title={capacityTitle}
      >
        <span
          className={cn(
            "mb-0.5 text-[9px] font-black uppercase",
            CAPACITY_COLOR[effectiveTone],
          )}
        >
          Capacidade
        </span>
        <span
          className={cn(
            "text-[15px] font-black tabular-nums",
            capacityLoading ? "text-slate-400" : "text-slate-700",
          )}
        >
          {capacityLoading ? "—" : `${capValue}%`}
        </span>
      </div>
      </div>
    </div>
  );
}
