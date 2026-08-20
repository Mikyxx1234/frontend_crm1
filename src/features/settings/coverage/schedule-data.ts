import type { Schedule } from "@/features/settings/schedules/schedule-shared";

export type CoverageDepartment = { id: string; name: string; color: string };

export type AgentPresence = "ONLINE" | "AWAY" | "OFFLINE";

export type SlotState = "work" | "lunch" | "off";

export type CoverageAgent = {
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
  departments: CoverageDepartment[];
};

/** Primeira hora visível na régua (06h). */
export const DAY_START = 6;
/** Fim exclusivo do eixo — último rótulo visível é 20h. */
export const DAY_END = 21;

export const HOURS: number[] = Array.from(
  { length: DAY_END - DAY_START },
  (_, i) => DAY_START + i,
);

export type ShiftHours = {
  start: number;
  end: number;
  lunchStart: number | null;
  lunchEnd: number | null;
};

export type HourCoverage = {
  hour: number;
  work: number;
  lunch: number;
};

export type CoverageStats = {
  agents: number;
  onlineNow: number;
  gaps: number;
  maxCoverage: number;
  minWork: number;
  minCoverageWindow: string;
  lunchPeak: string;
  maxLunch: number;
};

/** "HH:MM" → minutos desde a meia-noite. */
export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutos → "HH:MM". */
export function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Horas decimais → "HH:MM" (9.5 → 09:30). */
export function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (mm === 60) return `${String(hh + 1).padStart(2, "0")}:00`;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Hora cheia → "06h". */
export function fmtHourShort(h: number): string {
  return `${String(Math.floor(h)).padStart(2, "0")}h`;
}

/** Posição % de uma hora decimal no eixo [dayStart, dayEnd). */
export function pct(h: number, dayStart: number, dayEnd: number): number {
  const span = dayEnd - dayStart;
  if (span <= 0) return 0;
  return ((h - dayStart) / span) * 100;
}

/**
 * Estado visual do slot. Sem expediente persistido = fora.
 * Sábado usa janela própria sem almoço quando `saturdayEnabled`.
 */
export function slotState(
  schedule: Schedule | null,
  weekday: number,
  slotMin: number,
): SlotState {
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

/** Horários reais do expediente no dia (ignora quem não tem schedule). */
export function shiftBounds(
  schedule: Schedule,
  weekday: number,
): { start: number; end: number } | null {
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

/** Expediente + almoço em horas decimais para as barras Gantt. */
export function shiftHours(
  schedule: Schedule | null,
  weekday: number,
): ShiftHours | null {
  if (!schedule) return null;
  const b = shiftBounds(schedule, weekday);
  if (!b || b.end <= b.start) return null;

  if (weekday === 6) {
    return { start: b.start / 60, end: b.end / 60, lunchStart: null, lunchEnd: null };
  }

  const ls = parseTime(schedule.lunchStart);
  const le = parseTime(schedule.lunchEnd);
  const lunchStart = Math.max(ls, b.start);
  const lunchEnd = Math.min(le, b.end);
  const hasLunch = le > ls && lunchEnd > lunchStart;

  return {
    start: b.start / 60,
    end: b.end / 60,
    lunchStart: hasLunch ? lunchStart / 60 : null,
    lunchEnd: hasLunch ? lunchEnd / 60 : null,
  };
}

/** Resumo textual do dia na coluna do agente. */
export function daySummary(schedule: Schedule | null, weekday: number): string {
  if (!schedule) return "Sem expediente";
  if (weekday === 6) {
    return schedule.saturdayEnabled
      ? `Sáb ${schedule.saturdayStart ?? "09:00"}–${schedule.saturdayEnd ?? "13:00"}`
      : "Folga";
  }
  if (!schedule.weekdays.includes(weekday)) return "Folga";
  return `${schedule.startTime}–${schedule.endTime} · almoço ${schedule.lunchStart}–${schedule.lunchEnd}`;
}

/** Primeiro nome — coluna compacta. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Eixo da timeline: mínimo 06h–20h (DAY_END exclusivo = 21).
 * Estende se algum expediente persistido (ou o relógio de hoje) sair dessa janela.
 * Não inventa 08–18 para quem não tem schedule.
 */
export function axisRange(
  agents: CoverageAgent[],
  weekday: number,
  nowMinutes: number,
  isToday: boolean,
): { dayStart: number; dayEnd: number; hours: number[] } {
  const starts: number[] = [DAY_START * 60];
  const ends: number[] = [(DAY_END - 1) * 60];
  for (const a of agents) {
    if (!a.schedule) continue;
    const b = shiftBounds(a.schedule, weekday);
    if (!b) continue;
    starts.push(b.start);
    ends.push(b.end);
  }
  if (isToday) ends.push(nowMinutes);
  const startMin = Math.max(0, Math.floor(Math.min(...starts) / 60) * 60);
  const latest = Math.max(...ends);
  const endMin = Math.min(24 * 60, Math.max(DAY_END * 60, Math.floor(latest / 60) * 60 + 60));
  const dayStart = startMin / 60;
  const dayEnd = endMin / 60;
  const hours: number[] = [];
  for (let h = dayStart; h < dayEnd; h++) hours.push(h);
  return { dayStart, dayEnd, hours };
}

/**
 * O que o agente está fazendo no bloco [hour, hour+1) — amostra no meio da hora.
 * Quem `participates === false` não entra na cobertura.
 */
export function slotKind(
  agent: CoverageAgent,
  weekday: number,
  hour: number,
): SlotState {
  if (agent.participates === false) return "off";
  return slotState(agent.schedule, weekday, hour * 60 + 30);
}

export function coverageAt(
  agents: CoverageAgent[],
  weekday: number,
  hour: number,
): { work: number; lunch: number } {
  let work = 0;
  let lunch = 0;
  for (const a of agents) {
    const kind = slotKind(a, weekday, hour);
    if (kind === "work") work++;
    else if (kind === "lunch") lunch++;
  }
  return { work, lunch };
}

export function coverageByHour(
  agents: CoverageAgent[],
  weekday: number,
  hours: number[],
): HourCoverage[] {
  return hours.map((hour) => {
    const { work, lunch } = coverageAt(agents, weekday, hour);
    return { hour, work, lunch };
  });
}

/** KPIs derivados dos slots — nada hardcoded. */
export function deriveCoverageStats(
  agents: CoverageAgent[],
  perHour: HourCoverage[],
): CoverageStats {
  const maxCoverage = Math.max(1, ...perHour.map((c) => c.work), 0);
  const gaps = perHour.filter((s) => s.work === 0);
  const minWork = perHour.length ? Math.min(...perHour.map((s) => s.work)) : 0;
  const minSlot = perHour.find((s) => s.work === minWork);
  const maxLunch = perHour.length ? Math.max(...perHour.map((s) => s.lunch)) : 0;
  const maxLunchSlot = perHour.find((s) => s.lunch === maxLunch);
  const onlineNow = agents.filter((a) => a.agentStatus?.status === "ONLINE").length;

  return {
    agents: agents.length,
    onlineNow,
    gaps: gaps.length,
    maxCoverage,
    minWork,
    minCoverageWindow: minSlot ? `${minWork} às ${fmtHour(minSlot.hour)}` : "—",
    lunchPeak:
      maxLunchSlot && maxLunch > 0 ? `${maxLunch} às ${fmtHour(maxLunchSlot.hour)}` : "—",
    maxLunch,
  };
}
