"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconCalendar as CalendarDays, IconCheck as Check, IconChevronDown as ChevronDown } from "@tabler/icons-react";
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
  ONLINE: "bg-[var(--color-online)]",
  AWAY: "bg-[var(--color-warning)]",
  OFFLINE: "bg-[var(--text-muted)]",
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
      dot: "bg-[var(--color-online)]",
      iconBg: "bg-[var(--color-success)]/10",
      iconBorder: "border-transparent",
      activeBg: "bg-[var(--color-success)]/10",
      activeText: "text-[var(--color-success)]",
      activeDesc: "text-[var(--color-success)]",
      check: "text-[var(--color-success)]",
    },
    AWAY: {
      label: "Ausente",
      description: "Pausa temporária",
      dot: "bg-[var(--color-warning)]",
      iconBg: "bg-[var(--color-warning)]/10",
      iconBorder: "border-[var(--color-warning)]/30",
      activeBg: "bg-[var(--color-warning)]/10",
      activeText: "text-[var(--color-warning)]",
      activeDesc: "text-[var(--color-warning)]",
      check: "text-[var(--color-warning)]",
    },
    OFFLINE: {
      label: "Offline",
      description: "Indisponível",
      dot: "bg-[var(--text-muted)]",
      iconBg: "bg-[var(--glass-bg-subtle)]",
      iconBorder: "border-[var(--glass-border-subtle)]",
      activeBg: "bg-[var(--glass-bg-subtle)]",
      activeText: "text-[var(--text-secondary)]",
      activeDesc: "text-[var(--text-muted)]",
      check: "text-[var(--text-muted)]",
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
              ? "inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--glass-bg-subtle)] px-2 py-1 hover:bg-[var(--glass-bg-subtle)]"
              : "relative flex w-full items-center gap-1.5 rounded-lg border border-border/70 bg-white px-2 py-1 shadow-sm hover:border-[var(--glass-border)]",
          )}
        >
          {compact ? (
            <>
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                {isOnline ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-online)] opacity-50" />
                ) : null}
                <span
                  className={cn("relative inline-flex size-1.5 rounded-full", STATUS_DOT[status])}
                />
              </span>
              <span className="truncate text-[10px] font-medium text-[var(--text-secondary)]">
                {STATUS_LABEL[status]}
              </span>
              <ChevronDown size={10} className="shrink-0 text-[var(--text-muted)]" />
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
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-online)] opacity-75" />
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
          className="z-(--z-popover) min-w-[208px] rounded-xl border border-[var(--glass-border-subtle)] dark:border-[var(--glass-border)] p-1 shadow-[0_12px_40px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
          style={{ backgroundColor: "var(--dropdown-solid-bg)" }}
        >
          <p className="px-2 pb-1 pt-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] dark:text-[var(--text-muted)]">
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
                  active ? config.activeBg : "hover:bg-[var(--glass-bg-subtle)]",
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", config.dot)} />
                <div className="min-w-0 flex-1 text-left">
                  <p className={cn("text-[13px] font-semibold leading-tight", active ? config.activeText : "text-[var(--text-secondary)] dark:text-slate-100")}>
                    {config.label}
                  </p>
                  <p className={cn("text-[11px] leading-tight", active ? config.activeDesc : "text-[var(--text-muted)] dark:text-[var(--text-muted)]")}>
                    {config.description}
                  </p>
                </div>
                {active ? <Check className={cn("size-3 shrink-0", config.check)} strokeWidth={2.5} /> : null}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--glass-bg-subtle)]"
            onClick={() => router.push(manageHref)}
          >
            <CalendarDays className="size-3.5 shrink-0 text-[var(--text-muted)] dark:text-[var(--text-muted)]" strokeWidth={2} />
            <p className="text-left text-[13px] font-medium text-[var(--text-muted)] dark:text-[var(--text-faint)]">Configurar horários</p>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
