"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, ThumbsDown, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type LossReason = {
  id: string;
  label: string;
  position: number;
  isActive: boolean;
};

async function fetchReasons(): Promise<LossReason[]> {
  const res = await fetch(apiUrl("/api/settings/loss-reasons"));
  if (!res.ok) throw new Error("Erro ao carregar motivos");
  return res.json();
}

async function fetchSetting(key: string): Promise<string | null> {
  const res = await fetch(apiUrl(`/api/settings/org?key=${encodeURIComponent(key)}`));
  if (!res.ok) return null;
  const data = await res.json();
  return data.value ?? null;
}

export default function LossReasonsPage() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = React.useState("");

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["loss-reasons"],
    queryFn: fetchReasons,
  });

  const { data: requiredRaw } = useQuery({
    queryKey: ["org-setting", "deals.loss_reason_required"],
    queryFn: () => fetchSetting("deals.loss_reason_required"),
  });
  const isRequired = requiredRaw === "true";

  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch(apiUrl("/api/settings/loss-reasons"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
    },
    onSuccess: () => {
      setNewLabel("");
      queryClient.invalidateQueries({ queryKey: ["loss-reasons"] });
      toast.success("Motivo adicionado");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(apiUrl(`/api/settings/loss-reasons/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-reasons"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/settings/loss-reasons/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-reasons"] });
      toast.success("Motivo removido");
    },
  });

  const toggleRequired = useMutation({
    mutationFn: async (val: boolean) => {
      const res = await fetch(apiUrl("/api/settings/org"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "deals.loss_reason_required",
          value: val ? "true" : "false",
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-setting", "deals.loss_reason_required"],
      });
      toast.success("Configuração salva");
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <PageHeader
        title="Motivos de perda"
        description="Configure os motivos disponíveis ao marcar um negócio como perdido."
        icon={<ThumbsDown />}
      />

      {/* Toggle obrigatório */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-800">Motivo obrigatório</p>
          <p className="text-xs text-slate-500">Exigir um motivo ao marcar negócio como perdido</p>
        </div>
        <button
          type="button"
          onClick={() => toggleRequired.mutate(!isRequired)}
          disabled={toggleRequired.isPending}
          className="text-[var(--color-ink-soft)] transition hover:text-slate-900"
        >
          {isRequired ? (
            <ToggleRight className="size-8 text-cyan-600" />
          ) : (
            <ToggleLeft className="size-8 text-[var(--color-ink-muted)]" />
          )}
        </button>
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Novo motivo de perda…"
          className="h-10 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) {
              e.preventDefault();
              createMutation.mutate(newLabel.trim());
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => newLabel.trim() && createMutation.mutate(newLabel.trim())}
          disabled={!newLabel.trim() || createMutation.isPending}
          className="h-10 gap-1.5 rounded-lg px-4"
        >
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {/* List */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))
        ) : reasons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
            <p className="text-sm text-slate-500">Nenhum motivo cadastrado</p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Adicione motivos para padronizar a análise de negócios perdidos.
            </p>
          </div>
        ) : (
          reasons.map((reason) => (
            <ReasonRow
              key={reason.id}
              reason={reason}
              onUpdate={(data) => updateMutation.mutate({ id: reason.id, ...data })}
              onDelete={() => deleteMutation.mutate(reason.id)}
              isPending={updateMutation.isPending || deleteMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ReasonRow({
  reason,
  onUpdate,
  onDelete,
  isPending,
}: {
  reason: LossReason;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(reason.label);

  const save = () => {
    if (label.trim() && label.trim() !== reason.label) {
      onUpdate({ label: label.trim() });
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 transition",
        !reason.isActive && "opacity-50",
      )}
    >
      <GripVertical className="size-4 shrink-0 cursor-grab text-slate-300" />

      {editing ? (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setLabel(reason.label);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 hover:text-cyan-700"
        >
          {reason.label}
        </button>
      )}

      <TooltipHost label="Remover" side="left">
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="shrink-0 rounded-md p-1.5 text-[var(--color-ink-muted)] transition hover:bg-red-50 hover:text-red-600"
          aria-label="Remover"
        >
          <Trash2 className="size-4" />
        </button>
      </TooltipHost>
    </div>
  );
}
