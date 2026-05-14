"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, Clock, Loader2, Pencil, X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AgentOnlineStatus = "ONLINE" | "OFFLINE" | "AWAY";

type Schedule = {
  startTime: string;
  lunchStart: string;
  lunchEnd: string;
  endTime: string;
  timezone: string;
  weekdays: number[];
};

type AgentRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  agentStatus: {
    status: AgentOnlineStatus;
    availableForVoiceCalls?: boolean;
    updatedAt: string;
  } | null;
  schedule: Schedule | null;
};

const STATUS_LABELS: Record<AgentOnlineStatus, string> = { ONLINE: "Online", OFFLINE: "Offline", AWAY: "Ausente" };
const STATUS_COLORS: Record<AgentOnlineStatus, string> = {
  ONLINE: "bg-[#00d4aa] text-white",
  OFFLINE: "bg-[#e2e8f0] text-[#64748b]",
  AWAY: "bg-[#f59e0b] text-white",
};
const STATUS_DOT: Record<AgentOnlineStatus, string> = {
  ONLINE: "bg-[#00d4aa]",
  OFFLINE: "bg-[#94a3b8]",
  AWAY: "bg-[#f59e0b]",
};

const WEEKDAYS = [
  { value: 0, short: "Dom", label: "Domingo" },
  { value: 1, short: "Seg", label: "Segunda" },
  { value: 2, short: "Ter", label: "Terça" },
  { value: 3, short: "Qua", label: "Quarta" },
  { value: 4, short: "Qui", label: "Quinta" },
  { value: 5, short: "Sex", label: "Sexta" },
  { value: 6, short: "Sáb", label: "Sábado" },
];

const DEFAULT_SCHEDULE: Schedule = {
  startTime: "08:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  endTime: "18:00",
  timezone: "America/Sao_Paulo",
  weekdays: [1, 2, 3, 4, 5],
};

async function fetchAgents(): Promise<AgentRow[]> {
  const res = await fetch(apiUrl("/api/agents/status"));
  if (!res.ok) throw new Error("Erro ao carregar agentes");
  return res.json();
}

export default function SchedulesPage() {
  const qc = useQueryClient();
  const { data: agents = [], isLoading, isError } = useQuery({
    queryKey: ["agents-schedules"],
    queryFn: fetchAgents,
    refetchInterval: 30_000,
  });

  const [editAgent, setEditAgent] = React.useState<AgentRow | null>(null);
  const [editSchedule, setEditSchedule] = React.useState<Schedule>(DEFAULT_SCHEDULE);

  const openEdit = (agent: AgentRow) => {
    setEditAgent(agent);
    setEditSchedule(agent.schedule ?? DEFAULT_SCHEDULE);
  };

  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: AgentOnlineStatus }) => {
      const res = await fetch(apiUrl(`/api/agents/${userId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents-schedules"] }),
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ userId, schedule }: { userId: string; schedule: Schedule }) => {
      const res = await fetch(apiUrl(`/api/agents/${userId}/schedule`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) throw new Error("Erro ao salvar horário");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents-schedules"] });
      setEditAgent(null);
    },
  });

  const cycleStatus = (agent: AgentRow) => {
    const current = agent.agentStatus?.status ?? "OFFLINE";
    const next: AgentOnlineStatus = current === "ONLINE" ? "AWAY" : current === "AWAY" ? "OFFLINE" : "ONLINE";
    statusMutation.mutate({ userId: agent.id, status: next });
  };

  const voiceMutation = useMutation({
    mutationFn: async ({
      userId,
      availableForVoiceCalls,
    }: {
      userId: string;
      availableForVoiceCalls: boolean;
    }) => {
      const res = await fetch(apiUrl(`/api/agents/${userId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableForVoiceCalls }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar ligações");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents-schedules"] }),
  });

  const toggleWeekday = (day: number) => {
    setEditSchedule((s) => ({
      ...s,
      weekdays: s.weekdays.includes(day)
        ? s.weekdays.filter((d) => d !== day)
        : [...s.weekdays, day].sort(),
    }));
  };

  return (
    <div className="w-full space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <PageHeader
        title="Horários e Disponibilidade"
        icon={<Clock />}
        description={
          <>
            Gerencie o expediente e status online/offline de cada agente. A distribuição de leads considera esses dados.
            A coluna <span className="font-medium text-foreground">Ligações WA</span> indica quem pode receber chamadas de voz WhatsApp (com status Online e dentro do horário).
          </>
        }
      />

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar agentes.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 py-16 text-center">
          <Clock className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum agente encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 font-medium text-muted-foreground">Agente</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Ligações WA</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Início</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Almoço</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Fim</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Dias</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const status: AgentOnlineStatus = agent.agentStatus?.status ?? "OFFLINE";
                const voiceOn = agent.agentStatus?.availableForVoiceCalls ?? false;
                const sched = agent.schedule;
                return (
                  <tr key={agent.id} className="border-b last:border-b-0 hover:bg-muted/20 lumen-transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="flex size-9 items-center justify-center rounded-[12px] lumen-ai-gradient text-xs font-semibold text-white">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white", STATUS_DOT[status])} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{agent.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => cycleStatus(agent)}
                        disabled={statusMutation.isPending}
                        className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium lumen-transition hover:opacity-80", STATUS_COLORS[status])}
                      >
                        <span className={cn("size-1.5 rounded-full", status === "ONLINE" ? "bg-white" : status === "AWAY" ? "bg-white" : "bg-[#64748b]")} />
                        {STATUS_LABELS[status]}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <TooltipHost label="Disponível para receber ligações WhatsApp (requer Online + horário)" side="top">
                        <button
                          type="button"
                          onClick={() =>
                            voiceMutation.mutate({ userId: agent.id, availableForVoiceCalls: !voiceOn })
                          }
                          disabled={voiceMutation.isPending}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium lumen-transition hover:opacity-80",
                            voiceOn ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                          )}
                          aria-label="Disponível para receber ligações WhatsApp"
                        >
                          {voiceOn ? "Ativo" : "Inativo"}
                        </button>
                      </TooltipHost>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {sched?.startTime ?? "08:00"}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                      {sched ? `${sched.lunchStart} – ${sched.lunchEnd}` : "12:00 – 13:00"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {sched?.endTime ?? "18:00"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex gap-1">
                        {WEEKDAYS.map((wd) => {
                          const active = sched ? sched.weekdays.includes(wd.value) : [1,2,3,4,5].includes(wd.value);
                          return (
                            <TooltipHost key={wd.value} label={wd.label} side="top">
                              <span className={cn(
                                "inline-flex size-7 items-center justify-center rounded-lg text-[10px] font-medium",
                                active ? "bg-[#1e40af] text-white" : "bg-muted text-muted-foreground"
                              )}>{wd.short.charAt(0)}</span>
                            </TooltipHost>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TooltipHost label="Editar horário" side="left">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(agent)} aria-label="Editar horário">
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipHost>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit schedule dialog */}
      <Dialog open={!!editAgent} onOpenChange={(o) => { if (!o) setEditAgent(null); }}>
        <DialogContent size="md">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Horário de {editAgent?.name}</DialogTitle>
            <DialogDescription>Defina o expediente, almoço e dias de trabalho.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (editAgent) scheduleMutation.mutate({ userId: editAgent.id, schedule: editSchedule });
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sch-start">Início expediente</Label>
                <Input id="sch-start" type="time" value={editSchedule.startTime}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-end">Fim expediente</Label>
                <Input id="sch-end" type="time" value={editSchedule.endTime}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, endTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-lunch-start">Início almoço</Label>
                <Input id="sch-lunch-start" type="time" value={editSchedule.lunchStart}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, lunchStart: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-lunch-end">Fim almoço</Label>
                <Input id="sch-lunch-end" type="time" value={editSchedule.lunchEnd}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, lunchEnd: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias de trabalho</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((wd) => {
                  const active = editSchedule.weekdays.includes(wd.value);
                  return (
                    <button key={wd.value} type="button" onClick={() => toggleWeekday(wd.value)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium lumen-transition",
                        active
                          ? "bg-[#1e40af] text-white shadow-sm"
                          : "border border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground"
                      )}>
                      {active && <Check className="size-3" />}
                      {wd.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {scheduleMutation.isError && (
              <p className="text-sm text-destructive">
                {scheduleMutation.error instanceof Error ? scheduleMutation.error.message : "Erro ao salvar."}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditAgent(null)}>Cancelar</Button>
              <Button type="submit" disabled={scheduleMutation.isPending} className="gap-2">
                {scheduleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
