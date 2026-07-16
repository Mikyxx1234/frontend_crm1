"use client";

/*
 * Popover de Tags do Deal — renderizado via createPortal em
 * document.body para escapar dos stacking contexts do Draggable.
 */

import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
            className="rounded-[var(--radius-lg)] border p-2"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: 288,
              zIndex: "var(--z-popover)",
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderColor: "rgba(255, 255, 255, 0.7)",
              boxShadow:
                "0 12px 40px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)",
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
              className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {tagsQuery.isLoading && (
                <li className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                  Carregando…
                </li>
              )}
              {!tagsQuery.isLoading && filtered.length === 0 && !canCreate && (
                <li className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                  Nenhuma tag.
                </li>
              )}
              {filtered.map((t) => {
                const isActive = currentIds.has(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={addMutation.isPending || removeMutation.isPending}
                      onClick={() => handleToggle(t.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] hover:bg-black/5 ${
                        isActive
                          ? "bg-[rgba(91,111,245,0.10)] text-[var(--brand-primary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: t.color || "rgba(91,111,245,0.5)" }}
                          aria-hidden
                        />
                        <span className="truncate">{t.name}</span>
                      </span>
                      {isActive && <span aria-hidden>✓</span>}
                    </button>
                  </li>
                );
              })}
              {canCreate && (
                <li>
                  <button
                    type="button"
                    disabled={addMutation.isPending}
                    onClick={handleCreate}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--brand-primary)] hover:bg-black/5"
                  >
                    + Criar “{filter.trim()}”
                  </button>
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
