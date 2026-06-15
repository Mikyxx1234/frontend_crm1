"use client";

/*
 * Tab "Notas" do DealDetailPanel.
 * - Exibe nota fixada da conversa (pinnedNote) no topo, com badge âmbar.
 * - Editor de texto livre (notes) vinculado ao deal — salvo via useUpdateDeal.
 */

import { useEffect, useState } from "react";
import { IconPinFilled, IconLock } from "@tabler/icons-react";

import { useUpdateDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

interface PinnedNote {
  id: string;
  content: string;
  senderName?: string | null;
  time?: string | null;
}

interface DealNotesTabProps {
  dealId: string;
  notes: string | null;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  /** Nota fixada da conversa vinculada ao deal, se existir. */
  pinnedNote?: PinnedNote | null;
}

export function DealNotesTab({
  dealId,
  notes,
  pipelineId,
  statusFilter = "OPEN",
  pinnedNote,
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
      {/* ── Nota fixada da conversa ── */}
      {pinnedNote && (
        <div
          className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-warning/40 p-3"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(245,158,11,0.07) 100%)",
          }}
        >
          {/* Cabeçalho: badge + label */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5">
              <IconPinFilled size={10} className="text-warning" />
              <span className="font-display text-[9px] font-bold uppercase tracking-widest text-warning">
                Nota fixada
              </span>
            </span>
            <IconLock size={11} className="text-warning/60" />
            <span className="font-display text-[10px] text-warning/60">
              Nota interna da conversa
            </span>
          </div>

          {/* Conteúdo */}
          <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
            {pinnedNote.content}
          </p>

          {/* Rodapé: agente + hora */}
          {(pinnedNote.senderName || pinnedNote.time) && (
            <div className="flex items-center gap-2 pt-0.5">
              {pinnedNote.senderName && (
                <span className="font-display text-[11px] font-semibold text-warning/70">
                  {pinnedNote.senderName}
                </span>
              )}
              {pinnedNote.time && (
                <span className="font-body text-[10.5px] text-warning/50">
                  {pinnedNote.time}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Notas do negócio (texto livre) ── */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[13px] font-bold text-[var(--text-primary,#1a202c)]">
          {pinnedNote ? "Notas do negócio" : "Notas"}
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
        placeholder="Anote algo sobre este negócio..."
        className="flex-1 resize-none rounded-[var(--radius-lg)] border bg-white p-3 text-[13.5px] leading-relaxed text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
        style={{
          borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
          minHeight: pinnedNote ? 120 : 200,
        }}
      />
    </div>
  );
}
