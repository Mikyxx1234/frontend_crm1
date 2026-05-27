"use client";

/*
 * Tab "Notas" do DealDetailPanel. `notes` e um campo escalar do
 * proprio deal — salva via useUpdateDeal.
 */

import { useEffect, useState } from "react";

import { useUpdateDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

interface DealNotesTabProps {
  dealId: string;
  notes: string | null;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
}

export function DealNotesTab({
  dealId,
  notes,
  pipelineId,
  statusFilter = "OPEN",
}: DealNotesTabProps) {
  const [value, setValue] = useState(notes ?? "");
  const [dirty, setDirty] = useState(false);
  const updateMut = useUpdateDeal(pipelineId, statusFilter);

  // Quando o deal carregado muda (clicou outro card), sincroniza.
  useEffect(() => {
    setValue(notes ?? "");
    setDirty(false);
  }, [notes, dealId]);

  function handleSave() {
    updateMut.mutate(
      { dealId, payload: { notes: value } },
      { onSuccess: () => setDirty(false) },
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[13px] font-bold text-[var(--text-primary,#1a202c)]">
          Notas do negocio
        </h3>
        <button
          type="button"
          disabled={!dirty || updateMut.isPending}
          onClick={handleSave}
          className="rounded-full px-3.5 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-50"
          style={{
            background: "var(--brand-primary, #5b6ff5)",
            boxShadow: "0 4px 14px rgba(91,111,245,0.35)",
          }}
        >
          {updateMut.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        placeholder="Anote algo sobre este negocio..."
        className="flex-1 resize-none rounded-[var(--radius-lg)] border bg-white p-3 text-[13.5px] leading-relaxed text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
        style={{
          borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
          minHeight: 200,
        }}
      />
    </div>
  );
}
