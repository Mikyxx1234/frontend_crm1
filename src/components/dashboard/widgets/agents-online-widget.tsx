"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Moon, WifiOff } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn, getInitials } from "@/lib/utils";

type AgentPresence = "ONLINE" | "AWAY" | "OFFLINE";

type Agent = {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  status: AgentPresence;
  availableForVoiceCalls: boolean;
  lastActivityAt: string | null;
  statusUpdatedAt: string | null;
};

const STATUS_META: Record<AgentPresence, { label: string; tone: string; dot: string }> = {
  ONLINE:  { label: "Online",   tone: "text-emerald-600", dot: "bg-emerald-500" },
  AWAY:    { label: "Ausente",  tone: "text-amber-600",   dot: "bg-amber-500" },
  OFFLINE: { label: "Offline",  tone: "text-muted-foreground", dot: "bg-muted-foreground/60" },
};

export function AgentsOnlineWidget() {
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents-online"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/monitor/agents"));
      if (!r.ok) throw new Error("Falha ao carregar agentes");
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const online = agents.filter((a) => a.status === "ONLINE");
  const away = agents.filter((a) => a.status === "AWAY");
  const offline = agents.filter((a) => a.status === "OFFLINE");
  const voiceReady = online.filter((a) => a.availableForVoiceCalls).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatusTile count={online.length} label="Online" Icon={Briefcase} tone="text-emerald-600" />
        <StatusTile count={away.length} label="Ausente" Icon={Moon} tone="text-amber-600" />
        <StatusTile count={offline.length} label="Offline" Icon={WifiOff} tone="text-muted-foreground" />
      </div>

      {voiceReady > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          <span className="font-bold text-emerald-600">{voiceReady}</span> prontos
          para ligações por voz.
        </p>
      )}

      {agents.length > 0 ? (
        <div className="space-y-1.5">
          {[...online, ...away].slice(0, 5).map((agent) => {
            const meta = STATUS_META[agent.status];
            return (
              <div
                key={agent.userId}
                className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/10 px-2.5 py-1.5"
              >
                <div className="relative shrink-0">
                  {agent.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="size-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold uppercase text-primary">
                      {getInitials(agent.name)}
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card",
                      meta.dot,
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {agent.name}
                  </p>
                  <p className={cn("text-[10px] font-medium", meta.tone)}>
                    {meta.label}
                  </p>
                </div>
              </div>
            );
          })}
          {online.length + away.length > 5 && (
            <p className="pt-1 text-center text-[10px] text-muted-foreground">
              + {online.length + away.length - 5} outros disponíveis
            </p>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhum agente cadastrado.
        </p>
      )}
    </div>
  );
}

function StatusTile({
  count,
  label,
  Icon,
  tone,
}: {
  count: number;
  label: string;
  Icon: typeof Briefcase;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-2 py-2.5 text-center">
      <Icon className={cn("mx-auto size-4", tone)} />
      <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground">{count}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
