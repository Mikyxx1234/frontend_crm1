"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { isToday } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  scheduledAt: string | null;
  deal: { id: string; title: string } | null;
};

type StatusFilter = "all" | "pending" | "done" | "overdue";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "done", label: "Concluídas" },
  { value: "overdue", label: "Atrasadas" },
];

function truncate(s: string | null, n: number) {
  if (!s) return null;
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

async function fetchTasks(userId: string, filter: StatusFilter): Promise<TaskRow[]> {
  const params = new URLSearchParams({
    type: "TASK",
    userId,
    perPage: "100",
  });
  if (filter === "pending" || filter === "overdue") params.set("completed", "false");
  if (filter === "done") params.set("completed", "true");
  const r = await fetch(apiUrl(`/api/activities?${params}`));
  if (!r.ok) throw new Error("Falha ao carregar tarefas.");
  const data = (await r.json()) as { items?: TaskRow[] };
  return data.items ?? [];
}

function applyOverdueClientFilter(tasks: TaskRow[], filter: StatusFilter): TaskRow[] {
  if (filter !== "overdue") return tasks;
  const now = Date.now();
  return tasks.filter((t) => t.scheduledAt && new Date(t.scheduledAt).getTime() < now);
}

function groupTasks(tasks: TaskRow[]) {
  const now = new Date();
  const overdue: TaskRow[] = [];
  const today: TaskRow[] = [];
  const upcoming: TaskRow[] = [];
  const done: TaskRow[] = [];
  for (const t of tasks) {
    if (t.completed) {
      done.push(t);
      continue;
    }
    if (!t.scheduledAt) {
      upcoming.push(t);
      continue;
    }
    const d = new Date(t.scheduledAt);
    if (d < now) overdue.push(t);
    else if (isToday(d)) today.push(t);
    else upcoming.push(t);
  }
  return { overdue, today, upcoming, done };
}

export default function TasksPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const qc = useQueryClient();

  const { data: raw = [], isLoading, isError } = useQuery({
    queryKey: ["tasks", userId, filter],
    queryFn: () => fetchTasks(userId!, filter),
    enabled: status === "authenticated" && !!userId,
  });

  const tasks = useMemo(() => applyOverdueClientFilter(raw, filter), [raw, filter]);
  const groups = useMemo(() => groupTasks(tasks), [tasks]);

  const toggleMut = useMutation({
    mutationFn: (id: string) =>
      fetch(apiUrl(`/api/activities/${id}/toggle`), { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(apiUrl(`/api/activities/${id}`), { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { type: "TASK", title: title.trim() };
      if (dueDate) body.scheduledAt = new Date(`${dueDate}T09:00:00`).toISOString();
      const r = await fetch(apiUrl("/api/activities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const sections: { key: string; label: string; items: TaskRow[]; tone: "red" | "amber" | "slate" | "green" }[] = [
    { key: "overdue", label: "Atrasadas", items: groups.overdue, tone: "red" },
    { key: "today", label: "Hoje", items: groups.today, tone: "amber" },
    { key: "upcoming", label: "Próximas", items: groups.upcoming, tone: "slate" },
    { key: "done", label: "Concluídas", items: groups.done, tone: "green" },
  ];

  const visibleSections = sections.filter((s) => {
    if (filter === "done") return s.key === "done";
    if (filter === "pending" || filter === "overdue") return s.key !== "done";
    return true;
  });

  return (
    <div className="w-full space-y-8">
      <PageHeader
        title="Tarefas"
        description="Organize e acompanhe suas atividades."
        icon={<CheckSquare />}
      />

      <form
        className="flex flex-col gap-3 rounded-xl border border-border/80 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || createMut.isPending) return;
          createMut.mutate();
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-xs font-medium text-[var(--color-ink-soft)]">Nova tarefa</label>
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <label className="text-xs font-medium text-[var(--color-ink-soft)]">Data</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10" />
        </div>
        <Button type="submit" disabled={!title.trim() || createMut.isPending} className="h-10 shrink-0 gap-1.5">
          {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Adicionar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {status === "loading" || isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">Não foi possível carregar as tarefas.</p>
      ) : tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-[var(--color-bg-subtle)]/80 px-4 py-10 text-center text-sm text-slate-500">
          Nenhuma tarefa neste filtro.
        </p>
      ) : (
        <div className="space-y-8">
          {visibleSections.map((sec) =>
            sec.items.length === 0 ? null : (
              <section key={sec.key}>
                <div className="mb-3 flex items-center gap-2">
                  {sec.tone === "red" && <AlertTriangle className="size-4 text-red-500" />}
                  {sec.tone === "amber" && <Clock className="size-4 text-amber-500" />}
                  {sec.tone === "slate" && <Calendar className="size-4 text-[var(--color-ink-muted)]" />}
                  {sec.tone === "green" && <CheckCircle2 className="size-4 text-emerald-500" />}
                  <h2
                    className={cn(
                      "text-sm font-semibold",
                      sec.tone === "red" && "text-red-700",
                      sec.tone === "amber" && "text-amber-800",
                      sec.tone === "slate" && "text-foreground",
                      sec.tone === "green" && "text-emerald-700"
                    )}
                  >
                    {sec.label}
                  </h2>
                  <Badge variant="secondary" className="text-[10px]">
                    {sec.items.length}
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {sec.items.map((t) => (
                    <li
                      key={t.id}
                      className={cn(
                        "group flex gap-3 rounded-xl border bg-white p-3 shadow-sm transition hover:border-slate-300",
                        sec.tone === "red" && "border-red-200/90 bg-red-50/40",
                        sec.tone === "amber" && "border-amber-200/80 bg-amber-50/30",
                        sec.tone === "slate" && "border-border/80",
                        sec.tone === "green" && "border-emerald-200/70 bg-emerald-50/20 opacity-90"
                      )}
                    >
                      <button
                        type="button"
                        aria-label={t.completed ? "Marcar pendente" : "Marcar concluída"}
                        className="mt-0.5 shrink-0 text-[var(--color-ink-muted)] hover:text-foreground disabled:opacity-50"
                        disabled={toggleMut.isPending}
                        onClick={() => toggleMut.mutate(t.id)}
                      >
                        {t.completed ? (
                          <CheckCircle2 className="size-5 text-emerald-600" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-medium text-slate-900",
                            t.completed && "text-slate-500 line-through decoration-slate-400"
                          )}
                        >
                          {t.title}
                        </p>
                        {truncate(t.description, 120) && (
                          <p className="mt-0.5 text-sm text-slate-500">{truncate(t.description, 120)}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {t.deal && (
                            <Badge variant="outline" className="font-normal">
                              {t.deal.title}
                            </Badge>
                          )}
                          {t.scheduledAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(t.scheduledAt)}
                            </span>
                          ) : (
                            <span className="text-[var(--color-ink-muted)]">Sem data</span>
                          )}
                          {t.completed ? (
                            <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">Concluída</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-[var(--color-ink-muted)] opacity-60 hover:text-red-600 group-hover:opacity-100"
                        disabled={deleteMut.isPending}
                        onClick={() => deleteMut.mutate(t.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}
