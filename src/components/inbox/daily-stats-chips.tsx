"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Inbox, MessageCircle, Send } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type DailyStats = {
  pending: number;
  slaCritical: number;
  messagesToday: number;
  messagesReceivedToday: number;
};

async function fetchStats(): Promise<DailyStats> {
  const res = await fetch(apiUrl("/api/inbox/daily-stats"));
  if (!res.ok) {
    return { pending: 0, slaCritical: 0, messagesToday: 0, messagesReceivedToday: 0 };
  }
  return res.json();
}

/**
 * Painel do dia — 3 chips no topo do Inbox que dão pulso instantâneo
 * pro consultor: o que está esperando, o que está crítico, e quanto
 * ele já produziu hoje.
 *
 * Visualmente discreto (chips compactos, no header) pra não competir
 * com o conteúdo. Refetch a cada 30s — barato (3 counts indexados).
 *
 * Cada chip pode disparar uma ação de filtro futuramente (ex.: clicar
 * em "5 críticas" filtra a lista). Por enquanto exibe só.
 */
export function DailyStatsChips({
  className,
  onPendingClick,
  onCriticalClick,
}: {
  className?: string;
  onPendingClick?: () => void;
  onCriticalClick?: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["inbox", "daily-stats"],
    queryFn: fetchStats,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const pending = data?.pending ?? 0;
  const critical = data?.slaCritical ?? 0;
  const sent = data?.messagesToday ?? 0;
  const received = data?.messagesReceivedToday ?? 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-2 overflow-x-auto py-1.5 scrollbar-none",
        className,
      )}
    >
      <Chip
        icon={<MessageCircle className="size-3" strokeWidth={2.4} />}
        label="Pendentes"
        value={pending}
        tone="amber"
        onClick={onPendingClick}
      />
      <Chip
        icon={<AlertTriangle className="size-3" strokeWidth={2.4} />}
        label="Crítico"
        title={critical > 0 ? `${critical} sem resposta há mais de 1h` : "Nenhuma conversa crítica"}
        value={critical}
        tone={critical > 0 ? "red" : "slate"}
        onClick={onCriticalClick}
        pulse={critical > 0}
      />
      <Chip
        icon={<Inbox className="size-3" strokeWidth={2.4} />}
        label="Recebidas"
        title="Mensagens do cliente hoje (exclui notas internas)"
        value={received}
        tone="slate"
      />
      <Chip
        icon={<Send className="size-3" strokeWidth={2.4} />}
        label="Enviadas"
        title="Suas mensagens enviadas hoje (conversas atribuídas a você)"
        value={sent}
        tone="emerald"
      />
    </div>
  );
}

type ChipTone = "amber" | "red" | "emerald" | "slate";

const TONE_BG: Record<ChipTone, string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  red: "bg-red-50 text-red-700 ring-red-200/70 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/70 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  slate: "bg-[var(--color-bg-subtle)] text-[var(--color-ink-soft)] ring-slate-200/70 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-[var(--color-ink-muted)] dark:ring-slate-700",
};

function Chip({
  icon,
  label,
  title,
  value,
  tone,
  onClick,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
  value: number;
  tone: ChipTone;
  onClick?: () => void;
  pulse?: boolean;
}) {
  const interactive = !!onClick;
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      title={title ?? label}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tracking-tight ring-1 transition-colors sm:gap-1.5",
        TONE_BG[tone],
        interactive && "cursor-pointer active:scale-95",
        pulse && "animate-pulse",
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </Tag>
  );
}
