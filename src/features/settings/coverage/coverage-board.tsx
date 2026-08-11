"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconClock,
  IconPencil,
  IconToolsKitchen2,
  IconUsers,
  IconX as X,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/crm/user-avatar";
import { ButtonGlass } from "@/components/crm/button-glass";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { KpiCard } from "@/components/crm/kpi-card";
import { KpiStrip } from "@/components/crm/kpi-strip";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  DEFAULT_SCHEDULE,
  ScheduleDialogShell,
  ScheduleFields,
  WEEKDAYS,
  type Schedule,
} from "@/features/settings/schedules/schedule-shared";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type DepartmentRef = { id: string; name: string; color: string };

type CoverageAgent = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  schedule: Schedule | null;
  departments: DepartmentRef[];
};

type SlotState = "work" | "lunch" | "off";

// ─── Constants ───────────────────────────────────────────────────────────────

const SLOT_MINUTES = 30;
/** Largura de cada slot de 30min na grade. */
const SLOT_PX = 22;
/** Coluna fixa (sticky) com seleção + identidade do agente. */
const AGENT_COL_PX = 260;

const SLOT_STYLES: Record<SlotState, string> = {
  work: "bg-[color-mix(in_srgb,var(--color-success)_58%,transparent)]",
  lunch: "bg-[color-mix(in_srgb,var(--color-warn)_62%,transparent)]",
  off: "bg-[var(--glass-bg-strong)] opacity-45",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "HH:MM" → minutos desde a meia-noite. */
function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Estado do agente num slot de 30min. Espelha a elegibilidade de
 * distribuição (`eligibility.ts`): sem schedule = sem restrição (sempre
 * "work"); sábado usa janela própria sem almoço quando `saturdayEnabled`.
 */
function slotState(schedule: Schedule | null, weekday: number, slotMin: number): SlotState {
  if (!schedule) return "work";
  if (weekday === 6) {
    if (!schedule.saturdayEnabled) return "off";
    const s = parseTime(schedule.saturdayStart ?? "09:00");
    const e = parseTime(schedule.saturdayEnd ?? "13:00");
    return slotMin >= s && slotMin < e ? "work" : "off";
  }
  if (!schedule.weekdays.includes(weekday)) return "off";
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);
  if (slotMin < start || slotMin >= end) return "off";
  const ls = parseTime(schedule.lunchStart);
  const le = parseTime(schedule.lunchEnd);
  if (slotMin >= ls && slotMin < le) return "lunch";
  return "work";
}

async function fetchCoverage(): Promise<CoverageAgent[]> {
  const res = await fetch(apiUrl("/api/agents/schedules"));
  if (!res.ok) throw new Error("Erro ao carregar expedientes");
  return res.json();
}

// ─── Componente principal ────────────────────────────────────────────────────

export function CoverageBoard() {
  const qc = useQueryClient();
  const { data: agents = [], isLoading, isError } = useQuery({
    queryKey: ["agents-coverage"],
    queryFn: fetchCoverage,
  });

  const [weekday, setWeekday] = React.useState<number>(() => new Date().getDay());
  const [deptFilter, setDeptFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editAgent, setEditAgent] = React.useState<CoverageAgent | null>(null);
  const [editSchedule, setEditSchedule] = React.useState<Schedule>(DEFAULT_SCHEDULE);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkSchedule, setBulkSchedule] = React.useState<Schedule>(DEFAULT_SCHEDULE);

  // ── Departamentos disponíveis (dedup a partir dos agentes) ────────────────

  const departments = React.useMemo(() => {
    const map = new Map<string, DepartmentRef>();
    for (const a of agents) for (const d of a.departments) map.set(d.id, d);
    return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "pt-BR"));
  }, [agents]);

  // ── Filtro (área + busca) ─────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    let arr = agents;
    if (deptFilter.size > 0) {
      arr = arr.filter((a) => a.departments.some((d) => deptFilter.has(d.id)));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [agents, deptFilter, search]);

  // ── Range dinâmico da grade (hora cheia) ──────────────────────────────────

  const { rangeStart, rangeEnd, slots } = React.useMemo(() => {
    const starts = filtered.map((a) =>
      a.schedule ? parseTime(a.schedule.startTime) : 8 * 60,
    );
    const ends = filtered.map((a) =>
      a.schedule ? parseTime(a.schedule.endTime) : 18 * 60,
    );
    const start = Math.max(0, Math.floor(Math.min(...starts, 6 * 60) / 60) * 60);
    const end = Math.min(24 * 60, Math.ceil(Math.max(...ends, 20 * 60) / 60) * 60);
    const list: number[] = [];
    for (let m = start; m < end; m += SLOT_MINUTES) list.push(m);
    return { rangeStart: start, rangeEnd: end, slots: list };
  }, [filtered]);

  // ── Cobertura por slot + KPIs ─────────────────────────────────────────────

  const coverage = React.useMemo(() => {
    const perSlot = slots.map((slotMin) => {
      let work = 0;
      let lunch = 0;
      for (const a of filtered) {
        const st = slotState(a.schedule, weekday, slotMin);
        if (st === "work") work++;
        else if (st === "lunch") lunch++;
      }
      return { slotMin, work, lunch };
    });
    const gaps = perSlot.filter((s) => s.work === 0);
    const minWork = perSlot.length ? Math.min(...perSlot.map((s) => s.work)) : 0;
    const minSlot = perSlot.find((s) => s.work === minWork);
    const maxLunch = perSlot.length ? Math.max(...perSlot.map((s) => s.lunch)) : 0;
    const maxLunchSlot = perSlot.find((s) => s.lunch === maxLunch);
    return { perSlot, gaps, minWork, minSlot, maxLunch, maxLunchSlot };
  }, [filtered, slots, weekday]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveOne = useMutation({
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
      qc.invalidateQueries({ queryKey: ["agents-coverage"] });
      setEditAgent(null);
      toast.success("Expediente salvo.");
    },
    onError: () => toast.error("Erro ao salvar horário."),
  });

  const applyBulk = useMutation({
    mutationFn: async ({ userIds, schedule }: { userIds: string[]; schedule: Schedule }) => {
      const results = await Promise.allSettled(
        userIds.map((id) =>
          fetch(apiUrl(`/api/agents/${id}/schedule`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(schedule),
          }).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
      const fail = results.filter((r) => r.status === "rejected").length;
      return { ok: userIds.length - fail, fail };
    },
    onSuccess: ({ ok, fail }) => {
      qc.invalidateQueries({ queryKey: ["agents-coverage"] });
      setBulkOpen(false);
      setSelected(new Set());
      if (fail === 0) toast.success(`Expediente aplicado a ${ok} agente(s).`);
      else if (ok === 0) toast.error("Não foi possível aplicar o expediente.");
      else toast.error(`${ok} aplicado(s), ${fail} falharam.`);
    },
    onError: () => toast.error("Erro ao aplicar expediente."),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleDept = (id: string) =>
    setDeptFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  const toggleSelectAll = () =>
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const a of filtered) next.delete(a.id);
        return next;
      }
      const next = new Set(prev);
      for (const a of filtered) next.add(a.id);
      return next;
    });

  const openEdit = (agent: CoverageAgent) => {
    setEditAgent(agent);
    setEditSchedule(agent.schedule ?? DEFAULT_SCHEDULE);
  };

  const gridTemplate = `${AGENT_COL_PX}px repeat(${slots.length}, ${SLOT_PX}px)`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full min-w-0 flex-col gap-3.5">
      {isError && (
        <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-3 text-sm text-[var(--color-danger)]">
          Erro ao carregar expedientes.
        </p>
      )}

      {/* Controles: dia da semana + áreas + busca */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1">
          {WEEKDAYS.map((wd) => (
            <button
              key={wd.value}
              type="button"
              onClick={() => setWeekday(wd.value)}
              className={cn(
                "rounded-[var(--radius-md)] px-2.5 py-1.5 font-display text-[12px] font-semibold transition-colors",
                weekday === wd.value
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {wd.short}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-[var(--glass-border)]" />

        <button
          type="button"
          onClick={() => setDeptFilter(new Set())}
          className={cn(
            "rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition-colors",
            deptFilter.size === 0
              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
        >
          Todas as áreas
        </button>
        {departments.map((d) => {
          const active = deptFilter.has(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDept(d.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition-colors",
                active
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              {d.name}
            </button>
          );
        })}

        <div className="h-6 w-px bg-[var(--glass-border)]" />

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar agente…"
          aria-label="Buscar agente por nome ou e-mail"
          className="h-9 w-48 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 font-body text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--input-border-focus)]"
        />
      </div>

      {/* KPIs de cobertura do dia */}
      <KpiStrip aria-label="Indicadores de cobertura">
        <KpiCard
          label="Agentes"
          value={filtered.length.toLocaleString("pt-BR")}
          icon={<IconUsers size={20} stroke={2.2} />}
          tone="brand"
        />
        <KpiCard
          label="Gaps no dia"
          value={coverage.gaps.length.toLocaleString("pt-BR")}
          icon={<IconAlertTriangle size={20} stroke={2.2} />}
          tone={coverage.gaps.length > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Cobertura mínima"
          value={
            coverage.minSlot
              ? `${coverage.minWork} às ${formatSlot(coverage.minSlot.slotMin)}`
              : "—"
          }
          icon={<IconClock size={20} stroke={2.2} />}
          tone={coverage.minWork <= 1 ? "warning" : "success"}
        />
        <KpiCard
          label="Pico de almoço"
          value={
            coverage.maxLunchSlot && coverage.maxLunch > 0
              ? `${coverage.maxLunch} às ${formatSlot(coverage.maxLunchSlot.slotMin)}`
              : "—"
          }
          icon={<IconToolsKitchen2 size={20} stroke={2.2} />}
          tone={coverage.maxLunch >= Math.max(2, Math.ceil(filtered.length / 2)) ? "warning" : "neutral"}
        />
      </KpiStrip>

      {/* Grade */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[52px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-16">
          <IconClock size={40} className="text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">
            Nenhum agente encontrado{deptFilter.size > 0 ? " para as áreas selecionadas" : ""}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]">
          <div className="min-w-max">
            {/* Header de horas */}
            <div className="grid border-b border-[var(--glass-border)]" style={{ gridTemplateColumns: gridTemplate }}>
              <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 py-2">
                <CheckboxGlass
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos os agentes filtrados"
                />
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Agente
                </span>
              </div>
              {Array.from({ length: (rangeEnd - rangeStart) / 60 }).map((_, i) => (
                <div
                  key={i}
                  className="col-span-2 border-l border-[var(--glass-border)] px-1 py-2 font-display text-[10px] font-bold text-[var(--text-muted)] tabular-nums"
                  style={{ gridColumn: `span 2` }}
                >
                  {String(rangeStart / 60 + i).padStart(2, "0")}h
                </div>
              ))}
            </div>

            {/* Linha de cobertura */}
            <div className="grid border-b border-[var(--glass-border)] bg-[var(--glass-bg-panel)]" style={{ gridTemplateColumns: gridTemplate }}>
              <div className="sticky left-0 z-10 flex items-center border-r border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-1.5">
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Cobertura
                </span>
              </div>
              {coverage.perSlot.map((s) => (
                <TooltipGlass
                  key={s.slotMin}
                  label={`${formatSlot(s.slotMin)} — ${s.work} em expediente, ${s.lunch} em almoço`}
                  side="top"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center py-1.5 font-display text-[10px] font-bold tabular-nums",
                      s.work === 0
                        ? "bg-[color-mix(in_srgb,var(--color-danger)_72%,transparent)] text-white"
                        : s.work === 1
                          ? "bg-[color-mix(in_srgb,var(--color-warn)_55%,transparent)] text-[color-mix(in_srgb,var(--color-warn)_80%,black)]"
                          : "text-[var(--text-secondary)]",
                    )}
                  >
                    {s.work}
                  </div>
                </TooltipGlass>
              ))}
            </div>

            {/* Linhas dos agentes */}
            {filtered.map((agent) => (
              <div
                key={agent.id}
                className="group grid border-b border-[var(--glass-border)] last:border-b-0 hover:bg-[var(--glass-bg-panel)]"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 py-2 group-hover:bg-[var(--glass-bg-panel)]">
                  <CheckboxGlass
                    checked={selected.has(agent.id)}
                    onChange={() => toggleSelected(agent.id)}
                    aria-label={`Selecionar ${agent.name}`}
                  />
                  <UserAvatar size={28} name={agent.name} imageUrl={agent.avatarUrl} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                      {agent.name}
                    </p>
                    <p className="flex items-center gap-1 truncate font-body text-[11px] text-[var(--text-muted)]">
                      {agent.departments.length > 0 ? (
                        agent.departments.map((d) => (
                          <span key={d.id} className="inline-flex items-center gap-1">
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                            {d.name}
                          </span>
                        ))
                      ) : (
                        <span>Sem área</span>
                      )}
                    </p>
                  </div>
                  {!agent.schedule && (
                    <TooltipGlass label="Sem expediente definido — sempre elegível na distribuição" side="left">
                      <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-[var(--text-muted)]">
                        Livre
                      </span>
                    </TooltipGlass>
                  )}
                  <TooltipGlass label="Editar horário" side="left">
                    <button
                      type="button"
                      onClick={() => openEdit(agent)}
                      aria-label={`Editar horário de ${agent.name}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--color-primary-soft)]"
                    >
                      <IconPencil size={13} />
                    </button>
                  </TooltipGlass>
                </div>
                {slots.map((slotMin) => {
                  const st = slotState(agent.schedule, weekday, slotMin);
                  return (
                    <div
                      key={slotMin}
                      className={cn("border-l border-[var(--glass-border)]/40", SLOT_STYLES[st])}
                      title={`${agent.name} — ${formatSlot(slotMin)}: ${
                        st === "work" ? "em expediente" : st === "lunch" ? "almoço" : "fora"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <span className={cn("size-3 rounded-sm", SLOT_STYLES.work)} /> Em expediente
        </span>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <span className={cn("size-3 rounded-sm", SLOT_STYLES.lunch)} /> Almoço
        </span>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <span className={cn("size-3 rounded-sm", SLOT_STYLES.off)} /> Fora do expediente
        </span>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <span className="size-3 rounded-sm bg-[color-mix(in_srgb,var(--color-danger)_72%,transparent)]" /> Gap (0 agentes)
        </span>
      </div>

      {/* Barra de ação em massa */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-3 shadow-[var(--glass-shadow)] backdrop-blur-lg">
          <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            {selected.size} agente(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <ButtonGlass type="button" variant="glass" onClick={() => setSelected(new Set())} className="gap-1.5">
              <X className="size-4" /> Limpar
            </ButtonGlass>
            <ButtonGlass
              type="button"
              variant="primary"
              onClick={() => {
                setBulkSchedule(DEFAULT_SCHEDULE);
                setBulkOpen(true);
              }}
              className="gap-1.5"
            >
              <IconClock className="size-4" /> Aplicar expediente
            </ButtonGlass>
          </div>
        </div>
      )}

      {/* Modal edição individual — padrão das modais de filtros (kanban/inbox) */}
      <ScheduleDialogShell
        open={!!editAgent}
        onOpenChange={(o) => { if (!o) setEditAgent(null); }}
        title={`Expediente de ${editAgent?.name ?? ""}`}
        description="Defina o expediente, almoço e dias de trabalho."
        submitLabel="Salvar"
        submitPending={saveOne.isPending}
        onSubmit={() => {
          if (editAgent) saveOne.mutate({ userId: editAgent.id, schedule: editSchedule });
        }}
      >
        <ScheduleFields schedule={editSchedule} onChange={setEditSchedule} />
      </ScheduleDialogShell>

      {/* Modal aplicação em massa */}
      <ScheduleDialogShell
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={`Aplicar expediente a ${selected.size} agente(s)`}
        description="O expediente abaixo substitui o horário atual de todos os selecionados."
        submitLabel={`Aplicar a ${selected.size} agente(s)`}
        submitPending={applyBulk.isPending}
        onSubmit={() => applyBulk.mutate({ userIds: [...selected], schedule: bulkSchedule })}
      >
        <ScheduleFields schedule={bulkSchedule} onChange={setBulkSchedule} />
      </ScheduleDialogShell>
    </div>
  );
}
