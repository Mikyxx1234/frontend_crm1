"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconX, IconCheckbox } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { Input } from "@/components/ui/input";
import { createActivity, type ActivityPayload } from "@/features/inbox-v2/api";

const TYPE_OPTIONS: { value: ActivityPayload["type"]; label: string }[] = [
  { value: "TASK",    label: "Tarefa" },
  { value: "CALL",    label: "Ligacao" },
  { value: "MEETING", label: "Reuniao" },
  { value: "OTHER",   label: "Outro" },
];

const labelClass = "mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

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

  return createPortal(
    <div
      className="fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-6 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 font-display text-[15px] font-semibold text-[var(--text-primary)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
              <IconCheckbox size={15} />
            </span>
            Nova tarefa
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            aria-label="Fechar"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Titulo */}
        <div className="mb-4">
          <label className={labelClass}>Titulo</label>
          <Input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Ligar para o cliente"
          />
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <label className={labelClass}>Tipo</label>
          <DropdownGlass
            triggerClassName="w-full"
            value={type}
            onValueChange={(v) => setType(v as ActivityPayload["type"])}
            options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>

        {/* Agendar para */}
        <div className="mb-6">
          <label className={labelClass}>
            Agendar para{" "}
            <span className="font-body text-[10px] font-normal normal-case tracking-normal text-[var(--text-muted)]">
              (opcional)
            </span>
          </label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* Acoes */}
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
    </div>,
    document.body,
  );
}
