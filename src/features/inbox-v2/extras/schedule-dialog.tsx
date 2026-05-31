"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconX, IconClock } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { createScheduledMessage } from "@/features/inbox-v2/api";

const inputClass =
  "h-[var(--input-height)] w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 font-body text-[13px] text-[var(--input-text)] outline-none placeholder:text-[var(--input-placeholder)] backdrop-blur-sm transition-[border-color,box-shadow] duration-150 focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--input-ring-focus)]";

const textareaClass =
  "w-full resize-none rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 font-body text-[13px] text-[var(--input-text)] outline-none placeholder:text-[var(--input-placeholder)] backdrop-blur-sm transition-[border-color,box-shadow] duration-150 focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--input-ring-focus)]";

const labelClass = "mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

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
      if (!conversationId) throw new Error("Conversa invalida");
      const when = scheduledAt ? new Date(scheduledAt) : null;
      if (!when || Number.isNaN(when.getTime())) {
        throw new Error("Informe uma data/hora valida");
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glass-shadow)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 font-display text-[15px] font-semibold text-[var(--text-primary)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
              <IconClock size={15} />
            </span>
            Agendar mensagem
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

        {/* Mensagem */}
        <div className="mb-4">
          <label className={labelClass}>Mensagem</label>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Escreva a mensagem a ser enviada..."
            className={textareaClass}
          />
        </div>

        {/* Enviar em */}
        <div className="mb-6">
          <label className={labelClass}>Enviar em</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={inputClass}
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
            disabled={!content.trim() || !scheduledAt || mutation.isPending}
          >
            {mutation.isPending ? "Agendando..." : "Agendar"}
          </ButtonGlass>
        </div>
      </form>
    </div>,
    document.body,
  );
}
