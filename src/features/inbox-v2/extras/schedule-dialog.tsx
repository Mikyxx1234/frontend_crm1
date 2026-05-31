"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconX, IconClock } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { createScheduledMessage } from "@/features/inbox-v2/api";

/**
 * Dialog "Agendar mensagem": cria uma mensagem agendada na conversa
 * ativa (POST /api/scheduled-messages). Espelha a ação onSchedule do
 * composer do /inbox v1 (versão texto — sem anexo, mantendo simples).
 */
export function ScheduleDialog({
  open,
  onClose,
  conversationId,
  initialContent,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  initialContent?: string;
}) {
  const qc = useQueryClient();
  const [content, setContent] = useState(initialContent ?? "");
  const [scheduledAt, setScheduledAt] = useState("");

  const mutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!conversationId) throw new Error("Conversa inválida");
      const when = scheduledAt ? new Date(scheduledAt) : null;
      if (!when || Number.isNaN(when.getTime())) {
        throw new Error("Informe uma data/hora válida");
      }
      if (when.getTime() <= Date.now()) {
        throw new Error("A data precisa ser no futuro");
      }
      await createScheduledMessage({
        conversationId,
        content: content.trim(),
        scheduledAt: when.toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Mensagem agendada");
      qc.invalidateQueries({ queryKey: ["scheduled-messages", conversationId] });
      setContent("");
      setScheduledAt("");
      onClose();
    },
    onError: (err) => toast.error(err.message || "Falha ao agendar"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !scheduledAt || mutation.isPending) return;
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
            <IconClock size={18} /> Agendar mensagem
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
          Mensagem
        </label>
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Escreva a mensagem a ser enviada..."
          className="mb-3 w-full resize-none rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
        />

        <label className="mb-1 block font-body text-[12px] text-[var(--text-muted)]">
          Enviar em
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
            disabled={!content.trim() || !scheduledAt || mutation.isPending}
          >
            {mutation.isPending ? "Agendando..." : "Agendar"}
          </ButtonGlass>
        </div>
      </form>
    </div>
  );
}
