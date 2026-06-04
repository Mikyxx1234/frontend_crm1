"use client";

/*
 * Dialog minimo para criar um deal direto da KanbanColumn.
 * Mantemos a UX enxuta: titulo + valor opcional. stage e pipeline
 * vem do caller (ja temos o contexto da coluna que disparou).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCreateDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  stageName?: string;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
}

export function AddDealDialog({
  open,
  onOpenChange,
  stageId,
  stageName,
  pipelineId,
  statusFilter = "OPEN",
}: AddDealDialogProps) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<string>("");
  const createMut = useCreateDeal(pipelineId, statusFilter);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setValue("");
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) {
      window.addEventListener("keydown", onEsc);
      return () => window.removeEventListener("keydown", onEsc);
    }
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const num = value.trim() ? Number(value.replace(",", ".")) : undefined;
    createMut.mutate(
      {
        title: t,
        stageId,
        value: Number.isFinite(num) ? (num as number) : undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-[420px] max-w-[90vw] rounded-[var(--radius-xl)] border p-5 shadow-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
        }}
      >
        <h3 className="mb-1 font-display text-base font-bold text-[var(--text-primary,#1a202c)]">
          Novo negocio
        </h3>
        {stageName ? (
          <p className="mb-4 text-[12px] text-[var(--text-muted,#718096)]">
            Estagio: <strong>{stageName}</strong>
          </p>
        ) : null}

        <label className="mb-3 block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted,#718096)]">
            Titulo *
          </span>
          <input
            type="text"
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Proposta Empresa X"
            className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-white px-3 py-2 text-[13px] text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted,#718096)]">
            Valor (opcional)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-white px-3 py-2 text-[13px] text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-1.5 font-display text-xs font-semibold text-[var(--text-secondary,#4a5568)] hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!title.trim() || createMut.isPending}
            className="rounded-full px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-60"
            style={{
              background: "var(--brand-primary, #5b6ff5)",
              boxShadow: "0 4px 14px rgba(91,111,245,0.35)",
            }}
          >
            {createMut.isPending ? "Criando..." : "Criar"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
