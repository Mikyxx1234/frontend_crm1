"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCalendar as Calendar, IconCircleCheck as CheckCircle2, IconCircle as Circle, IconClock, IconMail as Mail, IconMessageCircle as MessageCircle, IconPhoneCall as PhoneCall, IconPlus as Plus, IconTrash as Trash2, IconUsers as Users, IconLoader2 as Loader2 } from "@tabler/icons-react"
import type { Icon as LucideIcon } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn, formatDateTime } from "@/lib/utils";

import type { DealDetailActivity } from "../shared";
import { ACTIVITY_TYPES } from "../shared";

// ── TimePicker DS v2 ──────────────────────────────────────────────
// Substituição do <input type="time"> nativo (exibe scroll-wheel do browser).
// Dois selects compactos para hora e minuto, estilizados com tokens do DS.
function TimePickerInline({
  value,
  onChange,
  disabled,
}: {
  value: string;         // "HH:mm" ou ""
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [hh, mm] = value ? value.split(":") : ["", ""];

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  function handleHour(h: string) {
    onChange(`${h}:${mm || "00"}`);
  }
  function handleMinute(m: string) {
    onChange(`${hh || "00"}:${m}`);
  }

  const selectCls = cn(
    "h-8 rounded-lg border border-border bg-[var(--color-bg-card)] px-1.5 text-[13px] text-foreground transition appearance-none cursor-pointer",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]/40",
    "disabled:cursor-not-allowed disabled:opacity-40",
  );

  return (
    <div className={cn("flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-[var(--color-bg-card)] px-1.5 transition", disabled && "opacity-40 pointer-events-none")}>
      <IconClock size={12} className="shrink-0 text-[var(--color-ink-muted)]" />
      <select
        disabled={disabled}
        value={hh || ""}
        onChange={(e) => handleHour(e.target.value)}
        className={cn(selectCls, "w-[38px] border-0 bg-transparent focus:ring-0 px-0.5")}
        aria-label="Hora"
      >
        <option value="">--</option>
        {hours.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-[11px] font-bold text-[var(--color-ink-muted)]">:</span>
      <select
        disabled={disabled}
        value={mm || ""}
        onChange={(e) => handleMinute(e.target.value)}
        className={cn(selectCls, "w-[38px] border-0 bg-transparent focus:ring-0 px-0.5")}
        aria-label="Minuto"
      >
        <option value="">--</option>
        {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

// Mapa de tipo -> visual (icone + cor accent + bg pilula)
const TYPE_VISUAL: Record<
  string,
  { Icon: LucideIcon; bg: string; ring: string; fg: string }
> = {
  CALL:     { Icon: PhoneCall,     bg: "bg-[var(--color-cyan-soft)]",              ring: "ring-[var(--color-cyan)]/70",        fg: "text-[var(--color-cyan)]" },
  EMAIL:    { Icon: Mail,          bg: "bg-[var(--color-success-bg)]",             ring: "ring-[var(--color-success)]/70",     fg: "text-[var(--color-success-text)]" },
  MEETING:  { Icon: Users,         bg: "bg-[var(--color-lavender-soft)]",          ring: "ring-[var(--color-lavender)]/70",    fg: "text-[var(--color-lavender)]" },
  TASK:     { Icon: CheckCircle2,  bg: "bg-[var(--color-primary)]/8",              ring: "ring-[var(--color-primary)]/70",     fg: "text-[var(--color-primary)]" },
  NOTE:     { Icon: MessageCircle, bg: "bg-[var(--color-bg-subtle)]",              ring: "ring-[var(--color-border-soft)]",    fg: "text-[var(--color-ink-soft)]" },
  WHATSAPP: { Icon: MessageCircle, bg: "bg-[var(--color-success-soft)]",           ring: "ring-[var(--color-success)]/70",     fg: "text-[var(--color-success-text)]" },
  OTHER:    { Icon: Calendar,      bg: "bg-[var(--color-warn-bg)]",                ring: "ring-[var(--color-warn)]/70",        fg: "text-[var(--color-warn)]" },
};

type ActivitiesPanelProps = {
  activities?: DealDetailActivity[]; // @deprecated — ignorado internamente
  dealId: string;
  onCreated?: () => void;
};

const activitiesKey = (dealId: string) => ["deal-activities", dealId] as const;

export function ActivitiesPanel({ dealId, onCreated }: ActivitiesPanelProps) {
  const queryClient = useQueryClient();
  const [type, setType] = React.useState("TASK");
  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState(""); // "yyyy-MM-dd"
  const [scheduledTime, setScheduledTime] = React.useState(""); // "HH:mm"
  const [open, setOpen] = React.useState(false);

  // Combina data + hora em ISO string (ou vazia)
  const scheduledISO = React.useMemo(() => {
    if (!scheduledDate) return "";
    const time = scheduledTime || "00:00";
    return `${scheduledDate}T${time}`;
  }, [scheduledDate, scheduledTime]);

  const { data: activities = [], isLoading } = useQuery<DealDetailActivity[]>({
    queryKey: activitiesKey(dealId),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/activities?dealId=${dealId}&perPage=100`));
      if (!res.ok) throw new Error("Erro ao carregar atividades");
      const json = await res.json().catch(() => ({}));
      return Array.isArray(json) ? json : (json.items ?? []);
    },
    enabled: Boolean(dealId),
    staleTime: 30_000,
  });

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: activitiesKey(dealId) });
    onCreated?.();
  }, [dealId, queryClient, onCreated]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { type, title: title.trim(), dealId };
      if (desc.trim()) body.description = desc.trim();
      if (scheduledISO) body.scheduledAt = new Date(scheduledISO).toISOString();
      const res = await fetch(apiUrl("/api/activities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao criar atividade");
      return res.json();
    },
    onSuccess: () => {
      setTitle(""); setDesc(""); setScheduledDate(""); setScheduledTime(""); setOpen(false);
      invalidate();
    },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) =>
      fetch(apiUrl(`/api/activities/${id}/toggle`), { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(apiUrl(`/api/activities/${id}`), { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: invalidate,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-chat-bg)]">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Composer glass */}
        <div
          className={cn(
            "mb-5 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur-md",
            "shadow-[var(--shadow-sm)]",
          )}
        >
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border",
                "bg-[var(--color-bg-subtle)]/60 px-3.5 py-3 text-left text-[13px]",
                "tracking-tight text-[var(--text-muted)] transition-colors",
                "hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg-card)] hover:text-[var(--text-primary)]",
              )}
            >
              <Plus className="size-4 text-primary" strokeWidth={2.4} />
              <span className="font-semibold">Nova tarefa</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
                    Tipo
                  </label>
                  <SelectNative
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-9 rounded-xl border-border text-sm"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
                    Agendar
                  </label>
                    <div className="flex gap-1.5">
                    <DatePicker
                      value={scheduledDate || null}
                      onChange={(v) => setScheduledDate(v)}
                      placeholder="Data"
                      className="min-w-0 flex-1"
                    />
                    <TimePickerInline
                      value={scheduledTime}
                      onChange={setScheduledTime}
                      disabled={!scheduledDate}
                    />
                  </div>
                </div>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titulo da tarefa..."
                className="h-9 rounded-xl border-border text-sm"
                autoFocus
              />
              <Textarea
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descricao (opcional)"
                className="rounded-xl border-border text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-4 text-[12px] font-bold text-[var(--text-muted)]"
                  onClick={() => { setOpen(false); setTitle(""); setDesc(""); setScheduledDate(""); setScheduledTime(""); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-primary px-4 text-[12px] font-bold text-white shadow-[var(--shadow-indigo-glow)] hover:bg-[var(--color-primary-dark)]"
                  disabled={!title.trim() || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? "Salvando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-[var(--color-ink-muted)]" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-12 text-center text-[13px] tracking-tight text-[var(--color-ink-muted)]">
            Nenhuma tarefa registrada.
          </p>
        ) : (
          <ActivityTimeline
            activities={activities}
            onToggle={(id) => toggleMut.mutate(id)}
            onDelete={(id) => deleteMut.mutate(id)}
            togglePending={toggleMut.isPending}
            deletePending={deleteMut.isPending}
          />
        )}
      </div>
    </div>
  );
}

// Timeline com spine SVG curva (Bezier sutil) ligando os icones
function ActivityTimeline({
  activities,
  onToggle,
  onDelete,
  togglePending,
  deletePending,
}: {
  activities: DealDetailActivity[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  togglePending: boolean;
  deletePending: boolean;
}) {
  return (
    <div className="relative pl-12">
      {/* SVG spine — curva sutil de cima a baixo */}
      <svg
        className="pointer-events-none absolute left-[18px] top-3 h-[calc(100%-1.5rem)] w-3"
        preserveAspectRatio="none"
        viewBox="0 0 12 100"
        aria-hidden
      >
        <path
          d="M6 0 C 0 25, 12 50, 6 75 S 0 100, 6 100"
          fill="none"
          stroke="rgb(226 232 240)"
          strokeWidth="1.5"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </svg>

      <ul className="relative space-y-3">
        {activities.map((a) => {
          const visual = TYPE_VISUAL[a.type] ?? TYPE_VISUAL.OTHER;
          const Icon = visual.Icon;
          return (
            <li key={a.id} className="group relative">
              {/* icone — pílula colorida */}
              <button
                type="button"
                onClick={() => onToggle(a.id)}
                disabled={togglePending}
                aria-label={a.completed ? "Marcar como pendente" : "Concluir"}
                className={cn(
                  "absolute -left-12 top-2 inline-flex size-9 items-center justify-center rounded-full",
                  visual.bg, "ring-1", visual.ring, visual.fg,
                  "transition-transform active:scale-95",
                  a.completed && "opacity-60 grayscale",
                )}
              >
                {a.completed ? (
                  <CheckCircle2 className="size-4" strokeWidth={2.4} />
                ) : (
                  <Icon className="size-4" strokeWidth={2.2} />
                )}
              </button>

              <div
                className={cn(
                  "rounded-2xl border border-border bg-card p-3.5",
                  "shadow-[var(--shadow-sm)] lumen-transition hover:shadow-[var(--shadow-md)]",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5",
                          "text-[10px] font-semibold uppercase tracking-widest",
                          visual.bg, visual.fg,
                        )}
                      >
                        {ACTIVITY_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                      </span>
                      {a.completed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-success-text)]">
                          <CheckCircle2 className="size-3" /> Concluida
                        </span>
                      ) : (
                        <Circle className="size-3 text-[var(--text-faint)]" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[14px] font-bold tracking-tight text-[var(--text-primary)]",
                        a.completed && "line-through decoration-[var(--color-border-strong)]",
                      )}
                    >
                      {a.title}
                    </p>
                    {a.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] tracking-tight text-[var(--text-muted)]">
                        {a.description}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] tracking-tight text-[var(--color-ink-muted)]">
                      {a.user.name} · {formatDateTime(a.scheduledAt ?? a.createdAt)}
                    </p>
                  </div>
                  <TooltipHost label="Excluir" side="left">
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      disabled={deletePending}
                      aria-label="Excluir"
                      className={cn(
                        "shrink-0 rounded-full p-1 text-[var(--color-ink-muted)] opacity-0",
                        "transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]",
                        "group-hover:opacity-100",
                      )}
                    >
                      <Trash2 className="size-3.5" strokeWidth={2} />
                    </button>
                  </TooltipHost>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
