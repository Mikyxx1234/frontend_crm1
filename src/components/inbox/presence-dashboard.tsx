"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { ChatAvatar } from "@/components/inbox/chat-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  /** Mantidos para compat — não são mais exibidos no card. */
  capacity?: number;
  activeConversations?: number;
  maxConcurrent?: number;
  tone?: AgentCapacityTone;
  capacityLoading?: boolean;
  /** URL da pagina de configuracao de horarios — vira link secundario no menu. */
  manageHref?: string;
  className?: string;
  /** Gatilho compacto (pill) para header denso do Inbox. */
  compact?: boolean;
}

export function PresenceDashboard({
  agent,
  status,
  manageHref = "/settings/schedules",
  className,
  compact = false,
}: PresenceDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = status === "ONLINE";

  const updateStatus = useMutation({
    mutationFn: async (next: AgentPresenceStatus) => {
      const res = await fetch(apiUrl(`/api/agents/${agent.id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Falha ao atualizar status.");
      }
      return next;
    },
    onSuccess: (next) => {
      void queryClient.invalidateQueries({ queryKey: ["my-agent-status"] });
      void queryClient.invalidateQueries({ queryKey: ["agent-capacity"] });
      toast.success(`Status alterado para ${STATUS_LABEL[next]}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const STATUS_OPTIONS: AgentPresenceStatus[] = ["ONLINE", "AWAY", "OFFLINE"];

  const STATUS_MENU_CONFIG: Record<
    AgentPresenceStatus,
    {
      label: string;
      description: string;
      dot: string;
      iconBg: string;
      iconBorder: string;
      activeBg: string;
      activeText: string;
      activeDesc: string;
      check: string;
    }
  > = {
    ONLINE: {
      label: "Online",
      description: "Recebe novas conversas",
      dot: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconBorder: "border-transparent",
      activeBg: "bg-emerald-50",
      activeText: "text-emerald-900",
      activeDesc: "text-emerald-700",
      check: "text-emerald-500",
    },
    AWAY: {
      label: "Ausente",
      description: "Pausa temporária",
      dot: "bg-amber-400",
      iconBg: "bg-amber-50",
      iconBorder: "border-amber-200",
      activeBg: "bg-amber-50",
      activeText: "text-amber-900",
      activeDesc: "text-amber-700",
      check: "text-amber-500",
    },
    OFFLINE: {
      label: "Offline",
      description: "Indisponível",
      dot: "bg-slate-400",
      iconBg: "bg-slate-50",
      iconBorder: "border-slate-200",
      activeBg: "bg-slate-50",
      activeText: "text-slate-700",
      activeDesc: "text-slate-500",
      check: "text-slate-400",
    },
  };

  return (
    <div className={cn("font-display relative", className)}>
      <DropdownMenu className="block w-full">
        <DropdownMenuTrigger
          aria-label={`Alterar status (atual: ${STATUS_LABEL[status]})`}
          className={cn(
            "group text-left transition-colors",
            compact
              ? "inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 hover:bg-slate-200/90"
              : "relative flex w-full items-center gap-1.5 rounded-lg border border-border/70 bg-white px-2 py-1 shadow-sm hover:border-slate-300",
          )}
        >
          {compact ? (
            <>
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                {isOnline ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-50" />
                ) : null}
                <span
                  className={cn("relative inline-flex size-1.5 rounded-full", STATUS_DOT[status])}
                />
              </span>
              <span className="truncate text-[10px] font-medium text-slate-600">
                {STATUS_LABEL[status]}
              </span>
              <ChevronDown size={10} className="shrink-0 text-slate-400" />
            </>
          ) : (
            <>
              <div className="relative size-6 shrink-0">
                <ChatAvatar
                  user={{ id: agent.id, name: agent.name, imageUrl: agent.imageUrl ?? null }}
                  size={32}
                  channel={null}
                  hideCartoon
                />
                <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex size-2 items-center justify-center">
                  {isOnline && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex size-2 rounded-full border-[1.5px] border-white",
                      STATUS_DOT[status],
                    )}
                  />
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <span className="truncate text-[11px] font-bold tracking-tight text-foreground group-hover:text-primary">
                  {STATUS_LABEL[status]}
                </span>
                <ChevronDown
                  size={10}
                  className="shrink-0 text-[var(--color-ink-muted)] transition-transform group-hover:text-primary"
                />
              </div>
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="z-50 min-w-[208px] rounded-xl border border-slate-100 bg-white p-1 shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
        >
          <p className="px-2 pb-1 pt-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Status de atendimento
          </p>

          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt;
            const config = STATUS_MENU_CONFIG[opt];
            return (
              <DropdownMenuItem
                key={opt}
                disabled={updateStatus.isPending}
                onClick={() => {
                  if (active || updateStatus.isPending) return;
                  updateStatus.mutate(opt);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                  active ? config.activeBg : "hover:bg-slate-50",
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", config.dot)} />
                <div className="min-w-0 flex-1 text-left">
                  <p className={cn("text-[13px] font-semibold leading-tight", active ? config.activeText : "text-slate-700")}>
                    {config.label}
                  </p>
                  <p className={cn("text-[11px] leading-tight", active ? config.activeDesc : "text-slate-400")}>
                    {config.description}
                  </p>
                </div>
                {active ? <Check className={cn("size-3 shrink-0", config.check)} strokeWidth={2.5} /> : null}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
            onClick={() => router.push(manageHref)}
          >
            <CalendarDays className="size-3.5 shrink-0 text-slate-400" strokeWidth={2} />
            <p className="text-left text-[13px] font-medium text-slate-500">Configurar horários</p>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
