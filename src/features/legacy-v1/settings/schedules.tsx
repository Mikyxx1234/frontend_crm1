"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck as Check, IconClock as Clock, IconLoader2 as Loader2, IconPencil as Pencil } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { InputGlass } from "@/components/crm/input-glass";
import { Label } from "@/components/ui/label";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  ListColumnLabel,
  listTableHeadRowClass,
} from "@/components/crm/sortable-header";
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
  ONLINE: "bg-[var(--color-success-bg)] text-[color-mix(in_srgb,var(--color-success)_78%,black)]",
  OFFLINE: "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
  AWAY: "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
};
const STATUS_DOT: Record<AgentOnlineStatus, string> = {
  ONLINE: "bg-[var(--color-success)]",
  OFFLINE: "bg-[var(--text-muted)]",
  AWAY: "bg-[var(--color-warn)]",
};

/** Colunas da tabela glass (grid CSS — padrão /contacts). */
const TABELA_COLS =
  "grid-cols-[minmax(0,1.4fr)_104px_112px_72px_130px_72px_minmax(150px,1fr)_60px]";

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
    <div className="w-full space-y-4">
      {isError && (
        <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-3 text-sm text-[var(--color-danger)]">
          Erro ao carregar agentes.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--glass-bg-strong)]" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-16 text-center">
          <Clock className="mx-auto mb-3 size-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum agente encontrado.</p>
        </div>
      ) : (
        <div className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <div className={listTableHeadRowClass(`grid ${TABELA_COLS} gap-3 px-3 py-2`)}>
            <ListColumnLabel>Agente</ListColumnLabel>
            <ListColumnLabel>Status</ListColumnLabel>
            <ListColumnLabel>Ligações WA</ListColumnLabel>
            <ListColumnLabel>Início</ListColumnLabel>
            <ListColumnLabel>Almoço</ListColumnLabel>
            <ListColumnLabel>Fim</ListColumnLabel>
            <ListColumnLabel>Dias</ListColumnLabel>
            <ListColumnLabel align="right">Ações</ListColumnLabel>
          </div>

          <div className="flex flex-col">
            {agents.map((agent) => {
              const status: AgentOnlineStatus = agent.agentStatus?.status ?? "OFFLINE";
              const voiceOn = agent.agentStatus?.availableForVoiceCalls ?? false;
              const sched = agent.schedule;
              return (
                <div
                  key={agent.id}
                  className={cn(
                    "grid items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-0 hover:bg-[var(--glass-bg-overlay)]",
                    TABELA_COLS,
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-xs font-semibold text-white">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-[var(--glass-bg-base)]", STATUS_DOT[status])} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[13.5px] font-semibold text-[var(--text-primary)]">{agent.name}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">{agent.email}</p>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => cycleStatus(agent)}
                      disabled={statusMutation.isPending}
                      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80", STATUS_COLORS[status])}
                    >
                      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
                      {STATUS_LABELS[status]}
                    </button>
                  </div>
                  <div>
                    <TooltipGlass label="Disponível para receber ligações WhatsApp (requer Online + horário)" side="top">
                      <button
                        type="button"
                        onClick={() =>
                          voiceMutation.mutate({ userId: agent.id, availableForVoiceCalls: !voiceOn })
                        }
                        disabled={voiceMutation.isPending}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80",
                          voiceOn
                            ? "bg-[var(--color-success-bg)] text-[color-mix(in_srgb,var(--color-success)_78%,black)]"
                            : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
                        )}
                        aria-label="Disponível para receber ligações WhatsApp"
                      >
                        {voiceOn ? "Ativo" : "Inativo"}
                      </button>
                    </TooltipGlass>
                  </div>
                  <div className="tabular-nums text-[13px] text-[var(--text-primary)]">
                    {sched?.startTime ?? "08:00"}
                  </div>
                  <div className="tabular-nums text-[13px] text-[var(--text-muted)]">
                    {sched ? `${sched.lunchStart} – ${sched.lunchEnd}` : "12:00 – 13:00"}
                  </div>
                  <div className="tabular-nums text-[13px] text-[var(--text-primary)]">
                    {sched?.endTime ?? "18:00"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((wd) => {
                      const active = sched ? sched.weekdays.includes(wd.value) : [1, 2, 3, 4, 5].includes(wd.value);
                      return (
                        <TooltipGlass key={wd.value} label={wd.label} side="top">
                          <span className={cn(
                            "inline-flex size-7 items-center justify-center rounded-[var(--radius-md)] text-[10px] font-bold",
                            active
                              ? "bg-[var(--brand-primary)] text-white"
                              : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
                          )}>{wd.short.charAt(0)}</span>
                        </TooltipGlass>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <TooltipGlass label="Editar horário" side="left">
                      <ButtonGlass variant="icon" size="icon" onClick={() => openEdit(agent)} aria-label="Editar horário">
                        <Pencil className="size-3.5" />
                      </ButtonGlass>
                    </TooltipGlass>
                  </div>
                </div>
              );
            })}
          </div>
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
                <InputGlass id="sch-start" type="time" value={editSchedule.startTime}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-end">Fim expediente</Label>
                <InputGlass id="sch-end" type="time" value={editSchedule.endTime}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, endTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-lunch-start">Início almoço</Label>
                <InputGlass id="sch-lunch-start" type="time" value={editSchedule.lunchStart}
                  onChange={(e) => setEditSchedule((s) => ({ ...s, lunchStart: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-lunch-end">Fim almoço</Label>
                <InputGlass id="sch-lunch-end" type="time" value={editSchedule.lunchEnd}
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
                        "inline-flex items-center gap-1 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold transition-colors",
                        active
                          ? "bg-[var(--brand-primary)] text-white shadow-sm"
                          : "border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--text-primary)]"
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
              <ButtonGlass type="button" variant="glass" onClick={() => setEditAgent(null)}>Cancelar</ButtonGlass>
              <ButtonGlass type="submit" variant="primary" disabled={scheduleMutation.isPending} className="gap-2">
                {scheduleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Salvar
              </ButtonGlass>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
