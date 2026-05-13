"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Mail,
  MessageCircle,
  PhoneCall,
  Plus,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn, formatDateTime } from "@/lib/utils";

import type { DealDetailActivity } from "../shared";
import { ACTIVITY_TYPES } from "../shared";

// Mapa de tipo -> visual (icone + cor accent + bg pilula)
const TYPE_VISUAL: Record<
  string,
  { Icon: LucideIcon; bg: string; ring: string; fg: string }
> = {
  CALL:     { Icon: PhoneCall,     bg: "bg-cyan-50",     ring: "ring-cyan-200/70",     fg: "text-cyan-700" },
  EMAIL:    { Icon: Mail,          bg: "bg-emerald-50",  ring: "ring-emerald-200/70",  fg: "text-emerald-700" },
  MEETING:  { Icon: Users,         bg: "bg-violet-50",   ring: "ring-violet-200/70",   fg: "text-violet-700" },
  TASK:     { Icon: CheckCircle2,  bg: "bg-blue-50",     ring: "ring-blue-200/70",     fg: "text-blue-700" },
  NOTE:     { Icon: MessageCircle, bg: "bg-slate-50",    ring: "ring-slate-200/70",    fg: "text-slate-600" },
  WHATSAPP: { Icon: MessageCircle, bg: "bg-green-50",    ring: "ring-green-200/70",    fg: "text-green-700" },
  OTHER:    { Icon: Calendar,      bg: "bg-amber-50",    ring: "ring-amber-200/70",    fg: "text-amber-700" },
};

type ActivitiesPanelProps = {
  activities: DealDetailActivity[];
  dealId: string;
  onCreated: () => void;
};

export function ActivitiesPanel({ activities, dealId, onCreated }: ActivitiesPanelProps) {
  const [type, setType] = React.useState("TASK");
  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [scheduled, setScheduled] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { type, title: title.trim(), dealId };
      if (desc.trim()) body.description = desc.trim();
      if (scheduled.trim()) body.scheduledAt = new Date(scheduled).toISOString();
      const res = await fetch(apiUrl("/api/activities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao criar atividade");
      return res.json();
    },
    onSuccess: () => {
      setTitle(""); setDesc(""); setScheduled(""); setOpen(false);
      onCreated();
    },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) =>
      fetch(apiUrl(`/api/activities/${id}/toggle`), { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => onCreated(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(apiUrl(`/api/activities/${id}`), { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => onCreated(),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f4f7fa]">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Composer glass */}
        <div
          className={cn(
            "mb-5 rounded-2xl border border-slate-100 bg-white/80 p-4 backdrop-blur-md",
            "shadow-[0_40px_100px_-40px_rgba(13,27,62,0.10)]",
          )}
        >
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-dashed border-slate-200",
                "bg-slate-50/60 px-3.5 py-3 text-left text-[13px]",
                "tracking-tight text-slate-500 transition-colors",
                "hover:border-[#507df1]/40 hover:bg-white hover:text-slate-800",
              )}
            >
              <Plus className="size-4 text-[#507df1]" strokeWidth={2.4} />
              <span className="font-semibold">Nova atividade</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tipo
                  </label>
                  <SelectNative
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 text-sm"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Agendar
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduled}
                    onChange={(e) => setScheduled(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 text-sm"
                  />
                </div>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titulo da atividade..."
                className="h-9 rounded-xl border-slate-200 text-sm"
                autoFocus
              />
              <Textarea
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descricao (opcional)"
                className="rounded-xl border-slate-200 text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-4 text-[12px] font-bold text-slate-500"
                  onClick={() => { setOpen(false); setTitle(""); setDesc(""); setScheduled(""); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-[#507df1] px-4 text-[12px] font-bold text-white shadow-blue-glow hover:bg-[#4466d6]"
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
        {activities.length === 0 ? (
          <p className="py-12 text-center text-[13px] tracking-tight text-slate-400">
            Nenhuma atividade registrada.
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
                  "rounded-2xl border border-slate-100 bg-white p-3.5",
                  "shadow-[0_40px_100px_-40px_rgba(13,27,62,0.10)] transition-shadow",
                  "hover:shadow-[0_40px_100px_-30px_rgba(13,27,62,0.14)]",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5",
                          "text-[10px] font-black uppercase tracking-widest",
                          visual.bg, visual.fg,
                        )}
                      >
                        {ACTIVITY_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                      </span>
                      {a.completed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                          <CheckCircle2 className="size-3" /> Concluida
                        </span>
                      ) : (
                        <Circle className="size-3 text-slate-300" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[14px] font-bold tracking-tight text-slate-900",
                        a.completed && "line-through decoration-slate-300",
                      )}
                    >
                      {a.title}
                    </p>
                    {a.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] tracking-tight text-slate-500">
                        {a.description}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] tracking-tight text-slate-400">
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
                        "shrink-0 rounded-full p-1 text-slate-400 opacity-0",
                        "transition-all hover:bg-rose-50 hover:text-rose-500",
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
