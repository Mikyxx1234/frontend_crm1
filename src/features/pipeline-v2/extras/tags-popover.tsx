"use client";

/*
 * Popover de Tags do Deal — renderizado via createPortal em
 * document.body para escapar dos stacking contexts do Draggable.
 */

import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { TagChipOptionsList } from "@/components/crm/tag-chip-options-list";
import {
  useAddDealTag,
  useDealTags,
  useRemoveDealTag,
} from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

import { computePopoverPosition, usePortalPopover } from "./use-portal-popover";

interface TagsPopoverProps {
  dealId: string | null;
  currentTags: { id: string; name: string; color?: string | null }[];
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  disabled?: boolean;
  trigger: ReactNode;
}

export function TagsPopover({
  dealId,
  currentTags,
  pipelineId,
  statusFilter = "OPEN",
  disabled,
  trigger,
}: TagsPopoverProps) {
  const { open, rect, triggerRef, popoverRef, toggle } = usePortalPopover();
  const [filter, setFilter] = useState("");

  const tagsQuery = useDealTags();
  const addMutation = useAddDealTag(pipelineId, statusFilter);
  const removeMutation = useRemoveDealTag(pipelineId, statusFilter);

  const currentIds = useMemo(
    () => new Set(currentTags.map((t) => t.id)),
    [currentTags],
  );

  const filtered = (tagsQuery.data ?? []).filter((t) =>
    t.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const canCreate =
    filter.trim().length > 0 &&
    !(tagsQuery.data ?? []).some(
      (t) => t.name.toLowerCase() === filter.trim().toLowerCase(),
    );

  function handleToggle(tagId: string) {
    if (!dealId) return;
    if (currentIds.has(tagId)) {
      removeMutation.mutate({ dealId, tagId });
    } else {
      addMutation.mutate({ dealId, tagId });
    }
  }

  function handleCreate() {
    if (!dealId) return;
    const name = filter.trim();
    if (!name) return;
    addMutation.mutate(
      { dealId, tagName: name },
      { onSuccess: () => setFilter("") },
    );
  }

  const position = computePopoverPosition(rect, 320, 288);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || !dealId}
        onClick={toggle}
        className="inline-flex"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-2 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: 288,
              zIndex: "var(--z-popover)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar ou criar tag…"
              className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <TagChipOptionsList
              tags={filtered}
              selectedIds={currentIds}
              onToggle={handleToggle}
              disabled={addMutation.isPending || removeMutation.isPending}
              isLoading={tagsQuery.isLoading}
              createLabel={canCreate ? `+ Criar “${filter.trim()}”` : null}
              onCreate={handleCreate}
              createDisabled={addMutation.isPending}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
