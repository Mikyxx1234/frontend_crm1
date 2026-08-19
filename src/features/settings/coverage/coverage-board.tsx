"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBuilding,
  IconClock,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconToolsKitchen2,
  IconUsers,
  IconWifi,
  IconX as X,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/crm/user-avatar";
import { ButtonGlass } from "@/components/crm/button-glass";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { KpiCard } from "@/components/crm/kpi-card";
import { KpiStrip } from "@/components/crm/kpi-strip";
import { SwitchGlass } from "@/components/crm/switch-glass";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { Label } from "@/components/ui/label";
import { DISTRIBUTION_RESPONSIBLES_KEY } from "@/features/distribution/hooks";
import {
  useDepartments,
  useUpdateDepartment,
  type Department,
  type DepartmentOperatingHours,
} from "@/features/conversations-settings/hooks/use-departments";
import {
  DEFAULT_SCHEDULE,
  ScheduleDialogShell,
  ScheduleFields,
  WEEKDAYS,
  type Schedule,
} from "@/features/settings/schedules/schedule-shared";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CoverageDepartment = { id: string; name: string; color: string };
type DepartmentRef = CoverageDepartment;

type AgentPresence = "ONLINE" | "AWAY" | "OFFLINE";

type CoverageAgent = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  schedule: Schedule | null;
  /** Opt-in administrativo. Default true quando o GET não manda o campo. */
  participates?: boolean;
  /** false = some da grade (admins que não atendem). Default true. */
  visibleInCoverage?: boolean;
  agentStatus: {
    status: AgentPresence;
    availableForVoiceCalls?: boolean;
    updatedAt: string;
  } | null;
  departments: DepartmentRef[];
};

type SlotState = "work" | "lunch" | "off";

type PresenceFilter = "" | AgentPresence;

// ─── Constants ───────────────────────────────────────────────────────────────

const SLOT_MINUTES = 30;
/** Coluna fixa (sticky) com seleção + identidade do agente. */
const AGENT_COL_PX = 320;
/**
 * Largura da coluna fixa no mobile depois que a grade começa a ser arrastada.
 * A coluna cheia ocupa quase toda a viewport estreita e esconde o gráfico.
 */
const AGENT_COL_COMPACT_PX = 124;
/** Folga antes de recolher — evita alternar a cada micro-scroll acidental. */
const COMPACT_SCROLL_THRESHOLD_PX = 8;
/** Largura mínima por slot de 30min — força scroll em vez de comprimir horas. */
const SLOT_MIN_PX = 32;
const DAY_START_MIN = 6 * 60;
const DAY_END_MIN = 20 * 60;

const SLOT_STYLES: Record<SlotState, string> = {
  work: "bg-[color-mix(in_srgb,var(--color-success)_58%,transparent)]",
  lunch: "bg-[color-mix(in_srgb,var(--color-warn)_80%,transparent)]",
  off: "bg-[var(--glass-bg-strong)] opacity-40",
};

const INACTIVE_SLOT_STYLES: Record<SlotState, string> = {
  work: "bg-[color-mix(in_srgb,var(--text-muted)_22%,transparent)]",
  lunch: "bg-[color-mix(in_srgb,var(--text-muted)_14%,transparent)]",
  off: "bg-[var(--glass-bg-strong)] opacity-25",
};

const DEFAULT_DEPT_HOURS: DepartmentOperatingHours = {
  start: "09:00",
  end: "18:00",
  weekdays: [1, 2, 3, 4, 5],
};

function normalizeDeptHours(
  raw: DepartmentOperatingHours | null | undefined,
): DepartmentOperatingHours {
  if (!raw || typeof raw.start !== "string" || typeof raw.end !== "string") {
    return DEFAULT_DEPT_HOURS;
  }
  const weekdays = Array.isArray(raw.weekdays)
    ? raw.weekdays.filter((d) => d >= 0 && d <= 6)
    : DEFAULT_DEPT_HOURS.weekdays;
  return {
    start: raw.start,
    end: raw.end,
    weekdays: weekdays.length ? weekdays : DEFAULT_DEPT_HOURS.weekdays,
  };
}

function formatDeptHoursLabel(hours: DepartmentOperatingHours): string {
  const days = [...hours.weekdays].sort((a, b) => a - b);
  const isWeekdays =
    days.length === 5 && days[0] === 1 && days[4] === 5 && !days.includes(0) && !days.includes(6);
  const dayStr = isWeekdays
    ? "Seg–Sex"
    : WEEKDAYS.filter((w) => days.includes(w.value))
        .map((w) => w.short)
        .join("·");
  return `${dayStr} ${hours.start}–${hours.end}`;
}

const PRESENCE_OPTIONS: { id: PresenceFilter; label: string; dot: string }[] = [
  { id: "ONLINE", label: "Online", dot: "bg-[var(--color-success)]" },
  { id: "AWAY", label: "Ausente", dot: "bg-[var(--color-warn)]" },
  { id: "OFFLINE", label: "Offline", dot: "bg-[var(--text-muted)]" },
];

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
 * Estado visual do slot. Sem expediente persistido = fora (barra vazia).
 * Não pintar o dia inteiro como "work" — isso era o "Sempre elegível" /
 * LIVRE esticando a barra verde de 06h às 20h. Sábado usa janela própria
 * sem almoço quando `saturdayEnabled`.
 */
function slotState(schedule: Schedule | null, weekday: number, slotMin: number): SlotState {
  if (!schedule) return "off";
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

/** Primeiro nome — única informação textual mantida na coluna recolhida. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Resumo textual do dia na coluna do agente (expediente + almoço explícitos). */
function daySummary(schedule: Schedule | null, weekday: number): string {
  if (!schedule) return "Sem expediente";
  if (weekday === 6) {
    return schedule.saturdayEnabled
      ? `Sáb ${schedule.saturdayStart ?? "09:00"}–${schedule.saturdayEnd ?? "13:00"}`
      : "Folga";
  }
  if (!schedule.weekdays.includes(weekday)) return "Folga";
  return `${schedule.startTime}–${schedule.endTime} · almoço ${schedule.lunchStart}–${schedule.lunchEnd}`;
}

/** Horários reais do expediente no dia (ignora quem não tem schedule). */
function shiftBounds(schedule: Schedule, weekday: number): { start: number; end: number } | null {
  if (weekday === 6) {
    if (!schedule.saturdayEnabled) return null;
    return {
      start: parseTime(schedule.saturdayStart ?? "09:00"),
      end: parseTime(schedule.saturdayEnd ?? "13:00"),
    };
  }
  if (!schedule.weekdays.includes(weekday)) return null;
  return { start: parseTime(schedule.startTime), end: parseTime(schedule.endTime) };
}

async function fetchCoverage(): Promise<CoverageAgent[]> {
  const res = await fetch(apiUrl("/api/agents/schedules"));
  if (!res.ok) throw new Error("Erro ao carregar expedientes");
  return res.json();
}

export function useCoverageAgents() {
  return useQuery({
    queryKey: ["agents-coverage"],
    queryFn: fetchCoverage,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}

function DepartmentHoursControl() {
  const { data: depts = [], isLoading } = useDepartments();
  const updateMut = useUpdateDepartment();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, DepartmentOperatingHours>>({});

  React.useEffect(() => {
    if (!open) return;
    const next: Record<string, DepartmentOperatingHours> = {};
    for (const d of depts) next[d.id] = normalizeDeptHours(d.operatingHours);
    setDraft(next);
  }, [open, depts]);

  const summary = React.useMemo(() => {
    if (depts.length === 0) return "Horário do departamento";
    const labels = new Set(
      depts.map((d) => formatDeptHoursLabel(normalizeDeptHours(d.operatingHours))),
    );
    if (labels.size === 1) return [...labels][0];
    return "Horários dos departamentos";
  }, [depts]);

  const save = async () => {
    const jobs = depts.filter((d) => {
      const cur = formatDeptHoursLabel(normalizeDeptHours(d.operatingHours));
      const next = draft[d.id];
      return next && formatDeptHoursLabel(next) !== cur;
    });
    try {
      for (const d of jobs) {
        await updateMut.mutateAsync({ id: d.id, operatingHours: draft[d.id] });
      }
      setOpen(false);
      toast.success(
        jobs.length === 0 ? "Nenhuma alteração." : "Horário do departamento salvo.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar horário.");
    }
  };

  const patch = (id: string, partial: Partial<DepartmentOperatingHours>) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...normalizeDeptHours(prev[id]), ...partial },
    }));
  };

  const toggleDay = (id: string, day: number) => {
    const cur = normalizeDeptHours(draft[id]);
    const weekdays = cur.weekdays.includes(day)
      ? cur.weekdays.filter((d) => d !== day)
      : [...cur.weekdays, day].sort((a, b) => a - b);
    patch(id, { weekdays: weekdays.length ? weekdays : cur.weekdays });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 py-1.5 font-display text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
      >
        <IconBuilding size={14} className="text-[var(--text-muted)]" />
        <span className="max-w-[220px] truncate">{summary}</span>
        <IconPencil size={12} className="text-[var(--text-muted)]" />
      </button>

      <ScheduleDialogShell
        open={open}
        onOpenChange={setOpen}
        title="Horário do departamento"
        description="Janela operacional padrão (Seg–Sex 09:00–18:00). Não substitui o expediente individual."
        submitLabel="Salvar"
        submitPending={updateMut.isPending}
        onSubmit={() => void save()}
      >
        {depts.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3 py-4 text-center font-body text-[12px] text-[var(--text-muted)]">
            Nenhum departamento cadastrado. Crie em Configurações → Equipe → Departamentos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {depts.map((d: Department) => {
              const hours = normalizeDeptHours(draft[d.id]);
              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                      {d.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Início</Label>
                      <InputGlass
                        type="time"
                        value={hours.start}
                        onChange={(e) => patch(d.id, { start: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Fim</Label>
                      <InputGlass
                        type="time"
                        value={hours.end}
                        onChange={(e) => patch(d.id, { end: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((wd) => {
                      const active = hours.weekdays.includes(wd.value);
                      return (
                        <button
                          key={wd.value}
                          type="button"
                          onClick={() => toggleDay(d.id, wd.value)}
                          className={cn(
                            "rounded-[var(--radius-md)] px-2 py-1 font-display text-[11px] font-semibold transition-colors",
                            active
                              ? "bg-[var(--brand-primary)] text-white"
                              : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                          )}
                        >
                          {wd.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScheduleDialogShell>
    </>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function CoverageBoard({
  search = "",
  deptIds = [],
  showHidden = false,
  onShowHiddenChange,
}: {
  search?: string;
  deptIds?: string[];
  showHidden?: boolean;
  onShowHiddenChange?: (v: boolean) => void;
} = {}) {
  const qc = useQueryClient();
  const { data: agents = [], isLoading, isError } = useCoverageAgents();

  const [weekday, setWeekday] = React.useState<number>(() => new Date().getDay());
  const deptFilter = React.useMemo(() => new Set(deptIds), [deptIds]);
  const [presenceFilter, setPresenceFilter] = React.useState<PresenceFilter>("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editAgent, setEditAgent] = React.useState<CoverageAgent | null>(null);
  const [editSchedule, setEditSchedule] = React.useState<Schedule>(DEFAULT_SCHEDULE);
  const [editParticipates, setEditParticipates] = React.useState(true);
  const [editVisible, setEditVisible] = React.useState(true);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkSchedule, setBulkSchedule] = React.useState<Schedule>(DEFAULT_SCHEDULE);

  // Tick de 1min para o marcador "agora" acompanhar o relógio.
  const [nowMinutes, setNowMinutes] = React.useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  React.useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(t);
  }, []);
  const isToday = weekday === new Date().getDay();

  // ── Filtro (área + presença + busca) ──────────────────────────────────────

  const q = search.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    let arr = agents;
    if (!showHidden) {
      arr = arr.filter((a) => {
        if (a.visibleInCoverage !== false) return true;
        // Busca ainda acha quem foi escondido, para dar pra restaurar.
        if (!q) return false;
        return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      });
    }
    if (deptFilter.size > 0) {
      arr = arr.filter((a) => a.departments.some((d) => deptFilter.has(d.id)));
    }
    if (presenceFilter) {
      arr = arr.filter((a) => (a.agentStatus?.status ?? "OFFLINE") === presenceFilter);
    }
    if (q) {
      arr = arr.filter(
        (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [agents, deptFilter, presenceFilter, q, showHidden]);

  const hiddenCount = React.useMemo(
    () => agents.filter((a) => a.visibleInCoverage === false).length,
    [agents],
  );

  // ── Range dinâmico da grade (hora cheia) ──────────────────────────────────
  // Só horários persistidos. Sem schedule não infla o eixo (antes usava
  // 08–18 fictício e pintava o dia inteiro). Eixo mínimo 06h–20h; estende
  // até o fim real (ex.: 21h) e inclui a hora final como coluna rotulada.

  const { rangeStart, rangeEnd, slots } = React.useMemo(() => {
    const starts: number[] = [DAY_START_MIN];
    const ends: number[] = [DAY_END_MIN];
    for (const a of filtered) {
      if (!a.schedule) continue;
      const b = shiftBounds(a.schedule, weekday);
      if (!b) continue;
      starts.push(b.start);
      ends.push(b.end);
    }
    if (isToday) ends.push(nowMinutes);
    const start = Math.max(0, Math.floor(Math.min(...starts) / 60) * 60);
    const latest = Math.max(...ends);
    const end = Math.min(24 * 60, Math.max(21 * 60, Math.floor(latest / 60) * 60 + 60));
    const list: number[] = [];
    for (let m = start; m < end; m += SLOT_MINUTES) list.push(m);
    return { rangeStart: start, rangeEnd: end, slots: list };
  }, [filtered, weekday, isToday, nowMinutes]);

  // ── Cobertura por slot + KPIs ─────────────────────────────────────────────

  const coverage = React.useMemo(() => {
    const perSlot = slots.map((slotMin) => {
      let work = 0;
      let lunch = 0;
      for (const a of filtered) {
        if (a.participates === false) continue;
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
    const onlineNow = filtered.filter((a) => a.agentStatus?.status === "ONLINE").length;
    return { perSlot, gaps, minWork, minSlot, maxLunch, maxLunchSlot, onlineNow };
  }, [filtered, slots, weekday]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveOne = useMutation({
    mutationFn: async ({
      userId,
      schedule,
      participates,
      visibleInCoverage,
    }: {
      userId: string;
      schedule: Schedule;
      participates: boolean;
      visibleInCoverage: boolean;
    }) => {
      const res = await fetch(apiUrl(`/api/agents/${userId}/schedule`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schedule, participates, visibleInCoverage }),
      });
      if (!res.ok) throw new Error("Erro ao salvar horário");
      return res.json() as Promise<
        Schedule & { participates?: boolean; visibleInCoverage?: boolean }
      >;
    },
    onSuccess: (saved, vars) => {
      qc.setQueryData<CoverageAgent[]>(["agents-coverage"], (prev) =>
        prev?.map((a) =>
          a.id === vars.userId
            ? {
                ...a,
                schedule: {
                  startTime: saved.startTime ?? vars.schedule.startTime,
                  lunchStart: saved.lunchStart ?? vars.schedule.lunchStart,
                  lunchEnd: saved.lunchEnd ?? vars.schedule.lunchEnd,
                  endTime: saved.endTime ?? vars.schedule.endTime,
                  timezone: saved.timezone ?? vars.schedule.timezone,
                  weekdays: saved.weekdays ?? vars.schedule.weekdays,
                  saturdayEnabled: vars.schedule.saturdayEnabled,
                  saturdayStart: vars.schedule.saturdayStart,
                  saturdayEnd: vars.schedule.saturdayEnd,
                },
                participates: saved.participates ?? vars.participates,
                visibleInCoverage:
                  saved.visibleInCoverage ?? vars.visibleInCoverage,
              }
            : a,
        ),
      );
      qc.invalidateQueries({ queryKey: ["agents-coverage"] });
      qc.invalidateQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY });
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
      qc.invalidateQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY });
      setBulkOpen(false);
      setSelected(new Set());
      if (fail === 0) toast.success(`Expediente aplicado a ${ok} agente(s).`);
      else if (ok === 0) toast.error("Não foi possível aplicar o expediente.");
      else toast.error(`${ok} aplicado(s), ${fail} falharam.`);
    },
    onError: () => toast.error("Erro ao aplicar expediente."),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    setEditParticipates(agent.participates !== false);
    setEditVisible(agent.visibleInCoverage !== false);
  };

  // ── Coluna do agente recolhível (mobile) ──────────────────────────────────
  // Em tela estreita a coluna cheia cobre a grade. Assim que o usuário arrasta
  // a grade para o lado, a coluna encolhe para só o primeiro nome; ao voltar ao
  // início (grade novamente oculta) os dados completos reaparecem.

  const isMdUp = useMediaQuery("(min-width: 768px)", true);
  const [gridScrolled, setGridScrolled] = React.useState(false);
  const compactAgentCol = !isMdUp && gridScrolled;
  const agentColPx = compactAgentCol ? AGENT_COL_COMPACT_PX : AGENT_COL_PX;

  const handleGridScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollLeft > COMPACT_SCROLL_THRESHOLD_PX;
    setGridScrolled((prev) => (prev === next ? prev : next));
  }, []);

  // minmax com piso em px: a grade cresce além do container e rola no eixo X
  // em vez de comprimir/cortar a última hora (20h, 21h…).
  const gridTemplate = `${agentColPx}px repeat(${slots.length}, minmax(${SLOT_MIN_PX}px, 1fr))`;

  // Posição (%) do marcador "agora" dentro da área de slots.
  const nowPct =
    isToday && nowMinutes >= rangeStart && nowMinutes <= rangeEnd
      ? ((nowMinutes - rangeStart) / (rangeEnd - rangeStart)) * 100
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full min-w-0 flex-col gap-3.5">
      {isError && (
        <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-3 text-sm text-[var(--color-danger)]">
          Erro ao carregar expedientes.
        </p>
      )}

      {/* Controles: dia da semana + presença (busca/área ficam no PageHeader) */}
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

        {PRESENCE_OPTIONS.map((p) => {
          const active = presenceFilter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPresenceFilter((prev) => (prev === p.id ? "" : p.id))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition-colors",
                active
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              <span className={cn("size-2 rounded-full", active ? "bg-white" : p.dot)} />
              {p.label}
            </button>
          );
        })}

        <div className="h-6 w-px bg-[var(--glass-border)]" />

        <DepartmentHoursControl />

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => onShowHiddenChange?.(!showHidden)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition-colors",
              showHidden
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
            aria-pressed={showHidden}
            title={
              showHidden
                ? "Ocultar quem não aparece na lista"
                : "Mostrar quem foi escondido da lista"
            }
          >
            {showHidden ? <IconEye size={14} /> : <IconEyeOff size={14} />}
            {hiddenCount} oculto{hiddenCount === 1 ? "" : "s"}
          </button>
        )}
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
          label="Online agora"
          value={coverage.onlineNow.toLocaleString("pt-BR")}
          icon={<IconWifi size={20} stroke={2.2} />}
          tone={coverage.onlineNow > 0 ? "success" : "warning"}
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
              className="h-[56px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-16">
          <IconClock size={40} className="text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">
            Nenhum agente encontrado{deptFilter.size > 0 ? " para as áreas selecionadas" : ""}.
          </p>
          {!showHidden && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => onShowHiddenChange?.(true)}
              className="font-display text-[12px] font-semibold text-[var(--brand-primary)] hover:underline"
            >
              Mostrar {hiddenCount} oculto{hiddenCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      ) : (
        <div
          onScroll={handleGridScroll}
          className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]"
        >
          <div className="relative w-max min-w-full pr-3">
            {/* Marcador "agora" — linha vertical sobre toda a grade */}
            {nowPct !== null && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[var(--color-danger)]"
                style={{
                  left: `calc(${agentColPx}px + (100% - ${agentColPx}px) * ${nowPct / 100})`,
                }}
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-[var(--radius-sm)] bg-[var(--color-danger)] px-1.5 py-0.5 font-display text-[9px] font-bold text-white tabular-nums">
                  {formatSlot(nowMinutes)}
                </span>
              </div>
            )}

            {/* Header de horas */}
            <div className="grid border-b border-[var(--glass-border)]" style={{ gridTemplateColumns: gridTemplate }}>
              <div
                className={cn(
                  "sticky left-0 z-10 flex items-center gap-2 border-r border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-2.5",
                  compactAgentCol ? "px-2" : "px-3",
                )}
              >
                {!compactAgentCol && (
                  <CheckboxGlass
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Selecionar todos os agentes filtrados"
                  />
                )}
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Agente
                </span>
              </div>
              {Array.from({ length: (rangeEnd - rangeStart) / 60 }).map((_, i) => (
                <div
                  key={i}
                  className="border-l border-[var(--glass-border)] px-1 py-2.5 font-display text-[10px] font-bold text-[var(--text-muted)] tabular-nums"
                  style={{ gridColumn: `span 2` }}
                >
                  {String(rangeStart / 60 + i).padStart(2, "0")}h
                </div>
              ))}
            </div>

            {/* Linha de cobertura */}
            <div className="grid border-b border-[var(--glass-border)] bg-[var(--glass-bg-panel)]" style={{ gridTemplateColumns: gridTemplate }}>
              <div className="sticky left-0 z-10 flex items-center border-r border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-2">
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
                      "flex items-center justify-center py-2 font-display text-[11px] font-bold tabular-nums",
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
            {filtered.map((agent) => {
              const presence = agent.agentStatus?.status ?? "OFFLINE";
              const inactive = agent.participates === false;
              const slotStyles = inactive ? INACTIVE_SLOT_STYLES : SLOT_STYLES;
              return (
                <div
                  key={agent.id}
                  className={cn(
                    "group grid border-b border-[var(--glass-border)] last:border-b-0 hover:bg-[var(--glass-bg-panel)]",
                    inactive && "opacity-70 grayscale-[0.35]",
                  )}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div
                    className={cn(
                      "sticky left-0 z-10 flex items-center border-r border-[var(--glass-border)] py-2 group-hover:bg-[var(--glass-bg-panel)]",
                      compactAgentCol ? "gap-2 px-2" : "gap-2.5 px-3",
                      inactive
                        ? "bg-[color-mix(in_srgb,var(--text-muted)_8%,var(--glass-bg-base))]"
                        : "bg-[var(--glass-bg-base)]",
                    )}
                  >
                    {compactAgentCol ? (
                      <>
                        <UserAvatar
                          size={24}
                          name={agent.name}
                          imageUrl={agent.avatarUrl}
                          status={
                            presence === "ONLINE"
                              ? "online"
                              : presence === "AWAY"
                                ? "away"
                                : "offline"
                          }
                        />
                        <p
                          title={agent.name}
                          className={cn(
                            "min-w-0 flex-1 truncate font-display text-[12px] font-bold",
                            inactive ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
                          )}
                        >
                          {firstName(agent.name)}
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckboxGlass
                          checked={selected.has(agent.id)}
                          onChange={() => toggleSelected(agent.id)}
                          aria-label={`Selecionar ${agent.name}`}
                        />
                        <UserAvatar
                          size={32}
                          name={agent.name}
                          imageUrl={agent.avatarUrl}
                          status={
                            presence === "ONLINE"
                              ? "online"
                              : presence === "AWAY"
                                ? "away"
                                : "offline"
                          }
                        />
                        <div className="min-w-0 flex-1 leading-tight">
                          <p
                            className={cn(
                              "truncate font-display text-[13px] font-bold",
                              inactive ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
                            )}
                          >
                            {agent.name}
                          </p>
                          <p className="font-body text-[11px] font-semibold leading-snug text-[var(--text-secondary)] tabular-nums">
                            {daySummary(agent.schedule, weekday)}
                          </p>
                          <p className="flex items-center gap-1.5 truncate font-body text-[10px] text-[var(--text-muted)]">
                            {agent.departments.length > 0 ? (
                              agent.departments.map((d) => (
                                <span key={d.id} className="inline-flex items-center gap-1">
                                  <span
                                    className={cn("size-1.5 rounded-full", inactive && "opacity-50")}
                                    style={{ backgroundColor: d.color }}
                                  />
                                  {d.name}
                                </span>
                              ))
                            ) : (
                              <span>Sem área</span>
                            )}
                          </p>
                        </div>
                        {agent.visibleInCoverage === false ? (
                          <TooltipGlass label="Escondido da lista — clique em editar para voltar a aparecer" side="left">
                            <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--text-muted)_18%,transparent)] px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-[var(--text-muted)]">
                              Oculto
                            </span>
                          </TooltipGlass>
                        ) : inactive ? (
                          <TooltipGlass label="Não participa da distribuição — não recebe leads" side="left">
                            <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--text-muted)_18%,transparent)] px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-[var(--text-muted)]">
                              Inativo
                            </span>
                          </TooltipGlass>
                        ) : !agent.schedule ? (
                          <TooltipGlass label="Sem expediente definido — a barra só aparece depois de salvar o horário" side="left">
                            <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-[var(--text-muted)]">
                              Sem horário
                            </span>
                          </TooltipGlass>
                        ) : null}
                        <TooltipGlass label="Editar horário" side="left">
                          <button
                            type="button"
                            onClick={() => openEdit(agent)}
                            aria-label={`Editar horário de ${agent.name}`}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)] transition-opacity hover:bg-[var(--color-primary-soft)]",
                              agent.visibleInCoverage === false
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100",
                            )}
                          >
                            <IconPencil size={13} />
                          </button>
                        </TooltipGlass>
                      </>
                    )}
                  </div>
                  {slots.map((slotMin) => {
                    const st = slotState(agent.schedule, weekday, slotMin);
                    return (
                      <div
                        key={slotMin}
                        className={cn("border-l border-[var(--glass-border)]/40", slotStyles[st])}
                        title={`${agent.name} — ${formatSlot(slotMin)}: ${
                          inactive
                            ? "não participa"
                            : st === "work"
                              ? "em expediente"
                              : st === "lunch"
                                ? "almoço"
                                : "fora"
                        }`}
                      />
                    );
                  })}
                </div>
              );
            })}
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
          <span className={cn("size-3 rounded-sm", INACTIVE_SLOT_STYLES.work)} /> Não participa
        </span>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <span className="size-3 rounded-sm bg-[color-mix(in_srgb,var(--color-danger)_72%,transparent)]" /> Gap (0 agentes)
        </span>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <span className="h-3 w-0.5 bg-[var(--color-danger)]" /> Agora
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
        description="Defina o expediente, se aparece na lista e se participa da distribuição."
        submitLabel="Salvar"
        submitPending={saveOne.isPending}
        onSubmit={() => {
          if (editAgent) {
            saveOne.mutate({
              userId: editAgent.id,
              schedule: editSchedule,
              participates: editParticipates,
              visibleInCoverage: editVisible,
            });
          }
        }}
      >
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
              Aparece na lista de cobertura
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Desligado = some da grade (útil para admins que não atendem).
            </p>
          </div>
          <SwitchGlass
            checked={editVisible}
            onChange={setEditVisible}
            aria-label="Aparece na lista de cobertura"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
              Participa da distribuição
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Desligado = inativo (não recebe leads).
            </p>
          </div>
          <SwitchGlass
            checked={editParticipates}
            onChange={setEditParticipates}
            aria-label="Participa da distribuição"
          />
        </div>
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
