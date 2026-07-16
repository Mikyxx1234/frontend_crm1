"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconGripVertical as GripVertical, IconPlus as Plus, IconTrash as Trash2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
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

  // Setting "Permitir outro motivo". Default = true (mantém comportamento
  // histórico — quem já usava o botão "Outro…" no dialog não é quebrado).
  // Quando desligado, o botão "Outro…" some no dialog e o backend rejeita
  // motivos livres não cadastrados (services/deals.assertLostReasonAllowed).
  const { data: allowOtherRaw } = useQuery({
    queryKey: ["org-setting", "deals.loss_reason_allow_other"],
    queryFn: () => fetchSetting("deals.loss_reason_allow_other"),
  });
  const allowOther = allowOtherRaw !== "false";

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
      toast.success("Configuração salva", { position: "top-center" });
    },
  });

  const toggleAllowOther = useMutation({
    mutationFn: async (val: boolean) => {
      const res = await fetch(apiUrl("/api/settings/org"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "deals.loss_reason_allow_other",
          value: val ? "true" : "false",
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-setting", "deals.loss_reason_allow_other"],
      });
      toast.success("Configuração salva", { position: "top-center" });
    },
  });

  return (
    <div className="space-y-4">
      {/* Toggle obrigatório */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-5 py-4 shadow-[var(--glass-shadow-sm)]">
        <div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Motivo obrigatório</p>
          <p className="text-xs text-[var(--text-muted)]">Exigir um motivo ao marcar negócio como perdido</p>
        </div>
        <SwitchGlass
          checked={isRequired}
          onChange={(v) => toggleRequired.mutate(v)}
          disabled={toggleRequired.isPending}
          aria-label="Motivo obrigatório"
        />
      </div>

      {/* Toggle "Permitir outro motivo".
          Quando OFF, o dialog de "Marcar como perdido" some o botão "Outro…"
          e o backend rejeita motivos livres não cadastrados (defesa em
          profundidade — UI + service `assertLostReasonAllowed`). Recomendado
          desligar quando o histórico mostra crescimento desorganizado de
          motivos digitados livremente. */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-5 py-4 shadow-[var(--glass-shadow-sm)]">
        <div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Permitir motivo personalizado</p>
          <p className="text-xs text-[var(--text-muted)]">
            Mostra a opção “Outro…” no momento de marcar como perdido. Desligue para forçar uso apenas dos motivos cadastrados abaixo.
          </p>
        </div>
        <SwitchGlass
          checked={allowOther}
          onChange={(v) => toggleAllowOther.mutate(v)}
          disabled={toggleAllowOther.isPending}
          aria-label={allowOther ? "Desligar motivo personalizado" : "Ligar motivo personalizado"}
        />
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2">
        <InputGlass
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
        <ButtonGlass
          variant="primary"
          size="sm"
          onClick={() => newLabel.trim() && createMutation.mutate(newLabel.trim())}
          disabled={!newLabel.trim() || createMutation.isPending}
          className="h-10 gap-1.5 rounded-lg px-4"
        >
          <Plus className="size-4" />
          Adicionar
        </ButtonGlass>
      </div>

      {/* List */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded-lg bg-[var(--glass-bg-strong)]"
            />
          ))
        ) : reasons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhum motivo cadastrado</p>
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
        "flex items-center gap-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-3 transition",
        !reason.isActive && "opacity-50",
      )}
    >
      <GripVertical className="size-4 shrink-0 cursor-grab text-[var(--text-muted)]" />

      {editing ? (
        <InputGlass
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
          className="min-w-0 h-auto flex-1 rounded py-1 text-sm"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        >
          {reason.label}
        </button>
      )}

      <TooltipGlass label="Remover" side="left">
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="shrink-0 rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] hover:text-[var(--color-danger)]"
          aria-label="Remover"
        >
          <Trash2 className="size-4" />
        </button>
      </TooltipGlass>
    </div>
  );
}
