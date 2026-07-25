"use client";

/*
 * DealTagsPopover — popover de tags ligado a um DEAL (negócio).
 * Espelho funcional de ContactTagsPopover, mas persiste em
 * POST/DELETE /api/deals/:id/tags em vez das tags do contato.
 */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { TagChipOptionsList } from "@/components/crm/tag-chip-options-list";
import { addDealTag, removeDealTag, listTags, type DealTag } from "@/features/pipeline-v2/api/deal-tags";
import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";

interface DealTagsPopoverProps {
  dealId: string | null;
  currentTags: DealTag[];
  disabled?: boolean;
}

export function DealTagsPopover({
  dealId,
  currentTags,
  disabled,
}: DealTagsPopoverProps) {
  const qc = useQueryClient();
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();
  const [filter, setFilter] = useState("");

  const tagsQuery = useQuery<DealTag[]>({
    queryKey: ["pipeline-v2-tags"],
    queryFn: listTags,
    enabled: open,
    staleTime: 60_000,
  });

  const selectedIds = useMemo(
    () => new Set(currentTags.map((t) => t.id)),
    [currentTags],
  );

  function invalidateAfterTagChange() {
    qc.invalidateQueries({ queryKey: ["deal-detail-v2"] });
    qc.invalidateQueries({ queryKey: ["contact-sidebar"] });
    qc.invalidateQueries({ queryKey: ["pipeline-board"] });
  }

  const setTagsMutation = useMutation<
    unknown,
    Error,
    { tagId: string; action: "add" | "remove" }
  >({
    mutationFn: (vars) => {
      if (!dealId) return Promise.reject(new Error("Sem deal"));
      return vars.action === "add"
        ? addDealTag(dealId, { tagId: vars.tagId })
        : removeDealTag(dealId, vars.tagId);
    },
    onSuccess: invalidateAfterTagChange,
    onError: (err) => toast.error(err.message || "Falha ao salvar tag"),
  });

  function toggleTag(tagId: string) {
    if (!dealId) return;
    const action = selectedIds.has(tagId) ? "remove" : "add";
    setTagsMutation.mutate({ tagId, action });
  }

  const allTags = tagsQuery.data ?? [];
  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const pos = computePopoverPosition(rect, 280, 256);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || !dealId}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="inline-flex"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Editar tags do negócio"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[12px] font-bold leading-none text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]">
          +
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 256,
                isolation: "isolate",
              }}
              className="z-(--z-popover) rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-2 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
            >
              <div className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Tags do negócio
              </div>
              <input
                autoFocus
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar tag…"
                onKeyDown={(e) => {
                  if (e.key === "Escape") close();
                }}
                className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]/40"
              />
              <TagChipOptionsList
                tags={filtered}
                selectedIds={selectedIds}
                onToggle={toggleTag}
                disabled={setTagsMutation.isPending}
                isLoading={tagsQuery.isLoading}
                emptyLabel="Nenhuma tag encontrada."
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
