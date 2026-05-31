"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconX, IconCheckbox } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { createActivity, type ActivityPayload } from "@/features/inbox-v2/api";

const TYPE_OPTIONS: { value: ActivityPayload["type"]; label: string }[] = [
  { value: "TASK", label: "Tarefa" },
  { value: "CALL", label: "Ligação" },
  { value: "MEETING", label: "Reunião" },
  { value: "OTHER", label: "Outro" },
];

/**
 * Dialog "Nova tarefa": cria uma atividade vinculada à conversa
 * (e ao contato, quando disponível). Espelha a ação onTask do
 * composer do /inbox v1.
 */
export function TaskDialog({
  open,
  onClose,
  conversationId,
  contactId,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  contactId?: string | null;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityPayload["type"]>("TASK");
  const [scheduledAt, setScheduledAt] = useState("");

  const mutation = useMutation<void, Error, void>({
    mutationFn: () =>
      createActivity({
        type,
        title: title.trim(),
        ...(conversationId ? { conversationId } : {}),
        ...(contactId ? { contactId } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      }),
    onSuccess: () => {
      toast.success("Tarefa criada");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["contact-sidebar"] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.message || "Falha ao criar tarefa"),
  });

  function reset() {
    setTitle("");
    setType("TASK");
    setScheduledAt("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || mutation.isPending) return;
    mutation.mutate();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-5 shadow-[var(--glass-shadow)] backdrop-blur-md"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 font-display text-[15px] font-semibold text-[var(--text-primary)]">
            <IconCheckbox size={18} /> Nova tarefa
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
            aria-label="Fechar"
          >
            <IconX size={16} />
          </button>
        </div>

        <label className="mb-1 block font-body text-[12px] text-[var(--text-muted)]">
          Título
        </label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Ligar para o cliente"
          className="mb-3 h-9 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-body text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
        />

        <label className="mb-1 block font-body text-[12px] text-[var(--text-muted)]">
          Tipo
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityPayload["type"])}
          className="mb-3 h-9 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block font-body text-[12px] text-[var(--text-muted)]">
          Agendar para (opcional)
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mb-5 h-9 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />

        <div className="flex justify-end gap-2">
          <ButtonGlass type="button" variant="glass" onClick={onClose}>
            Cancelar
          </ButtonGlass>
          <ButtonGlass
            type="submit"
            variant="primary"
            disabled={!title.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Criando..." : "Criar tarefa"}
          </ButtonGlass>
        </div>
      </form>
    </div>
  );
}
