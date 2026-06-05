"use client";

/*
 * Edição inline genérica para campos escalares do Deal.
 * Usado em "Origem", "Previsão", "Notas", etc.
 *
 * - PUT /api/deals/:id via useUpdateDeal
 *
 * Visual: clica → vira input → Enter salva, Esc cancela, blur salva.
 * Preserva o look-and-feel do v0 (sem framework visual extra).
 */

import { useEffect, useRef, useState } from "react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

import { useUpdateDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter, UpdateDealPayload } from "@/features/pipeline-v2/api";

interface InlineEditTextProps {
  dealId: string | null;
  field: keyof UpdateDealPayload;
  value: string | null | undefined;
  placeholder?: string;
  type?: "text" | "date";
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  display?: (current: string | null | undefined) => React.ReactNode;
  inputClassName?: string;
}

export function InlineEditText({
  dealId,
  field,
  value,
  placeholder = "Adicionar",
  type = "text",
  pipelineId,
  statusFilter = "OPEN",
  display,
  inputClassName,
}: InlineEditTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useUpdateDeal(pipelineId, statusFilter);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    if (!dealId) {
      setEditing(false);
      return;
    }
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    const prev = value ?? null;
    if (next === prev) {
      setEditing(false);
      return;
    }
    update.mutate(
      { dealId, payload: { [field]: next } as UpdateDealPayload },
      {
        onSuccess: () => setEditing(false),
        onError: () => {
          setDraft(value ?? "");
          setEditing(false);
        },
      },
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        disabled={update.isPending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        className={
          inputClassName ??
          "w-full rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-right font-display text-[13px] font-semibold text-[var(--text-primary)] outline-none"
        }
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      className="cursor-pointer"
    >
      {display
        ? display(value)
        : value && value.trim()
          ? value
          : placeholder}
    </span>
  );
}
