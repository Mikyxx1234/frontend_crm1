"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCalendar,
  IconChecklist,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { toast } from "sonner";

/* ─── Tipos ──────────────────────────────────────────────────── */

type ActivityType = "CALL" | "EMAIL" | "MEETING" | "TASK" | "NOTE" | "OTHER";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string | null;
  completed: boolean;
  scheduledAt?: string | null;
  completedAt?: string | null;
  dealId?: string | null;
  user?: { id: string; name: string } | null;
  createdAt: string;
}

interface ActivitiesResponse {
  items: Activity[];
  total: number;
}

/* ─── Helpers visuais ─────────────────────────────────────────── */

const TYPE_META: Record<
  ActivityType,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  CALL:    { label: "Ligação",   icon: IconPhone,    color: "#5b6ff5" },
  EMAIL:   { label: "E-mail",    icon: IconMail,     color: "#a78bfa" },
  MEETING: { label: "Reunião",   icon: IconUsers,    color: "#f59e0b" },
  TASK:    { label: "Tarefa",    icon: IconChecklist, color: "#10b981" },
  NOTE:    { label: "Nota",      icon: IconChecklist, color: "#718096" },
  OTHER:   { label: "Outro",     icon: IconChecklist, color: "#718096" },
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return fmtDate(iso);
}

/* ─── Hooks ──────────────────────────────────────────────────── */

function activitiesKey(dealId: string) {
  return ["deal-activities-v2", dealId];
}

function useDealActivities(dealId: string) {
  return useQuery<ActivitiesResponse>({
    queryKey: activitiesKey(dealId),
    queryFn: async () => {
      const res = await fetch(`/api/activities?dealId=${dealId}&perPage=50`);
      if (!res.ok) throw new Error("Erro ao carregar atividades");
      return res.json();
    },
    enabled: !!dealId,
    staleTime: 15_000,
  });
}

function useCreateActivity(dealId: string) {
  const qc = useQueryClient();
  return useMutation<Activity, Error, { type: ActivityType; title: string; scheduledAt?: string; description?: string }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, dealId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao criar atividade");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: activitiesKey(dealId) });
      toast.success("Atividade criada");
    },
    onError: (e) => toast.error(e.message),
  });
}

function useToggleActivity(dealId: string) {
  const qc = useQueryClient();
  return useMutation<Activity, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/activities/${id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao atualizar atividade");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: activitiesKey(dealId) }),
    onError: (e) => toast.error(e.message),
  });
}

function useDeleteActivity(dealId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir atividade");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: activitiesKey(dealId) });
      toast.success("Atividade removida");
    },
    onError: (e) => toast.error(e.message),
  });
}

/* ─── Formulário de criação ──────────────────────────────────── */

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "TASK",    label: "Tarefa" },
  { value: "CALL",    label: "Ligação" },
  { value: "MEETING", label: "Reunião" },
  { value: "EMAIL",   label: "E-mail" },
];

interface CreateFormProps {
  dealId: string;
  onClose: () => void;
}

function CreateActivityForm({ dealId, onClose }: CreateFormProps) {
  const [type, setType] = useState<ActivityType>("TASK");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const createMut = useCreateActivity(dealId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMut.mutate(
      { type, title: title.trim(), scheduledAt: scheduledAt || undefined },
      { onSuccess: onClose },
    );
  }

  const inputClass =
    "w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]";
  const borderStyle = { borderColor: "var(--glass-border,rgba(0,0,0,0.08))" };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border p-3"
      style={{ background: "var(--glass-bg-overlay,rgba(255,255,255,0.7))", ...borderStyle }}
    >
      <p className="mb-2 font-display text-[12px] font-semibold text-[var(--text-primary,#1a202c)]">
        Nova atividade
      </p>

      {/* Tipo */}
      <div className="mb-2 flex gap-1 flex-wrap">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className="rounded-full px-2.5 py-0.5 font-display text-[11.5px] font-semibold transition-colors"
            style={{
              background: type === t.value ? "var(--brand-primary,#5b6ff5)" : "var(--glass-bg,rgba(0,0,0,0.04))",
              color: type === t.value ? "#fff" : "var(--text-secondary,#4a5568)",
              border: `1px solid ${type === t.value ? "transparent" : "var(--glass-border,rgba(0,0,0,0.08))"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Título */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da atividade"
        className={`${inputClass} mb-2`}
        style={borderStyle}
        required
      />

      {/* Data/hora */}
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        className={`${inputClass} mb-3`}
        style={borderStyle}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1.5 font-display text-[12px] font-semibold text-[var(--text-secondary,#4a5568)]"
          style={{ background: "var(--glass-bg,rgba(0,0,0,0.04))", border: "1px solid var(--glass-border,rgba(0,0,0,0.08))" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createMut.isPending}
          className="rounded-full px-3.5 py-1.5 font-display text-[12px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--brand-primary,#5b6ff5)" }}
        >
          {createMut.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

/* ─── Componente principal ───────────────────────────────────── */

interface DealActivitiesTabProps {
  dealId: string;
}

export function DealActivitiesTab({ dealId }: DealActivitiesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError } = useDealActivities(dealId);
  const toggleMut = useToggleActivity(dealId);
  const deleteMut = useDeleteActivity(dealId);

  const items = data?.items ?? [];

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-[22px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[13px] font-bold text-[var(--text-primary,#1a202c)]">
          Atividades
          {data && data.total > 0 && (
            <span className="ml-1.5 rounded-full bg-[var(--brand-primary,#5b6ff5)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {data.total}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 font-display text-[12px] font-semibold text-white"
          style={{ background: "var(--brand-primary,#5b6ff5)" }}
        >
          <IconPlus size={13} />
          Nova
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <CreateActivityForm dealId={dealId} onClose={() => setShowForm(false)} />
      )}

      {/* Loading */}
      {isLoading && (
        <p className="text-[12.5px] text-[var(--text-muted,#718096)]">Carregando...</p>
      )}

      {/* Erro */}
      {isError && (
        <p className="text-[12.5px] text-[var(--color-danger,#ef4444)]">
          Erro ao carregar atividades.
        </p>
      )}

      {/* Vazio */}
      {!isLoading && !isError && items.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-[var(--text-muted,#718096)]">
          <IconChecklist size={36} className="opacity-40" />
          <div className="font-display text-[13px] font-semibold">Sem atividades</div>
          <p className="max-w-xs text-[12px]">
            Ligações, reuniões e tarefas vinculadas a este negócio aparecerão aqui.
          </p>
        </div>
      )}

      {/* Lista */}
      {items.map((act) => {
        const meta = TYPE_META[act.type] ?? TYPE_META.OTHER;
        const Icon = meta.icon;
        return (
          <div
            key={act.id}
            className="flex items-start gap-3 rounded-[var(--radius-lg)] border p-3 transition-opacity"
            style={{
              background: "var(--glass-bg-overlay,rgba(255,255,255,0.6))",
              borderColor: "var(--glass-border,rgba(0,0,0,0.08))",
              opacity: act.completed ? 0.6 : 1,
            }}
          >
            {/* Toggle */}
            <button
              type="button"
              onClick={() => toggleMut.mutate({ id: act.id })}
              disabled={toggleMut.isPending}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              style={{
                borderColor: act.completed ? "#10b981" : "var(--glass-border,rgba(0,0,0,0.2))",
                background: act.completed ? "#10b981" : "transparent",
                color: act.completed ? "#fff" : "transparent",
              }}
              title={act.completed ? "Marcar como pendente" : "Marcar como concluída"}
            >
              {act.completed && <span className="text-[10px] font-bold">✓</span>}
            </button>

            {/* Ícone tipo */}
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${meta.color}1f`, color: meta.color }}
            >
              <Icon size={13} />
            </div>

            {/* Conteúdo */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span
                  className="font-display text-[12.5px] font-semibold text-[var(--text-primary,#1a202c)]"
                  style={{ textDecoration: act.completed ? "line-through" : "none" }}
                >
                  {act.title}
                </span>
                <span className="shrink-0 text-[10.5px] text-[var(--text-muted,#718096)]">
                  {act.scheduledAt ? fmtDate(act.scheduledAt) : relativeTime(act.createdAt)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted,#718096)]">
                <span
                  className="rounded-full px-1.5 py-0 font-display text-[10px] font-semibold"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  {meta.label}
                </span>
                {act.user?.name && <span>· {act.user.name}</span>}
              </div>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => deleteMut.mutate({ id: act.id })}
              disabled={deleteMut.isPending}
              className="mt-0.5 shrink-0 rounded p-1 text-[var(--text-muted,#718096)] opacity-0 transition-opacity hover:text-[var(--color-danger,#ef4444)] group-hover:opacity-100"
              style={{ opacity: 0.5 }}
              title="Excluir atividade"
            >
              <IconTrash size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
