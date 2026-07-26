"use client";

/*
 * Popover de Tags do Deal — renderizado via createPortal em
 * document.body para escapar dos stacking contexts do Draggable.
 *
 * Seleção local durante a sessão do popover: o toggle NÃO lê
 * `currentTags` do parent (board otimista) para decidir add/remove.
 * Isso evita que o reflow/reclassificação das chips no meio do gesto
 * dispare mutações em tagIds diferentes ("1 clique → N requests").
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
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

function idsFromTags(tags: { id: string }[]): Set<string> {
  return new Set(tags.map((t) => t.id));
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
  /** Seleção espelhada ao abrir; toggles atualizam só este Set. */
  const [localSelected, setLocalSelected] = useState<Set<string>>(() =>
    idsFromTags(currentTags),
  );
  /** Tags com mutation em voo — bloqueia só aquela chip, não a lista. */
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const wasOpenRef = useRef(false);
  const syncedDealIdRef = useRef<string | null>(null);

  const tagsQuery = useDealTags();
  const addMutation = useAddDealTag(pipelineId, statusFilter);
  const removeMutation = useRemoveDealTag(pipelineId, statusFilter);

  // Sincroniza com o board só ao abrir (ou ao trocar de deal).
  // NÃO re-sincroniza quando `currentTags` muda por update otimista —
  // essa reclassificação no meio do clique era a raiz do bug.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      syncedDealIdRef.current = null;
      return;
    }
    const justOpened = !wasOpenRef.current;
    const dealChanged = dealId !== syncedDealIdRef.current;
    wasOpenRef.current = true;
    if (justOpened || dealChanged) {
      syncedDealIdRef.current = dealId;
      setLocalSelected(idsFromTags(currentTags));
      pendingIdsRef.current = new Set();
      setPendingIds(new Set());
    }
  }, [open, dealId, currentTags]);

  const filtered = (tagsQuery.data ?? []).filter((t) =>
    t.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const canCreate =
    filter.trim().length > 0 &&
    !(tagsQuery.data ?? []).some(
      (t) => t.name.toLowerCase() === filter.trim().toLowerCase(),
    );

  function markPending(tagId: string, pending: boolean) {
    if (pending) pendingIdsRef.current.add(tagId);
    else pendingIdsRef.current.delete(tagId);
    setPendingIds(new Set(pendingIdsRef.current));
  }

  function handleToggle(tagId: string) {
    if (!dealId) return;
    if (pendingIdsRef.current.has(tagId)) return;

    const wasSelected = localSelected.has(tagId);
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (wasSelected) next.delete(tagId);
      else next.add(tagId);
      return next;
    });

    markPending(tagId, true);
    const onSettled = () => markPending(tagId, false);

    if (wasSelected) {
      removeMutation.mutate({ dealId, tagId }, { onSettled });
    } else {
      addMutation.mutate({ dealId, tagId }, { onSettled });
    }
  }

  function handleCreate() {
    if (!dealId) return;
    const name = filter.trim();
    if (!name) return;
    addMutation.mutate(
      { dealId, tagName: name },
      {
        onSuccess: () => {
          setFilter("");
          const catalog = tagsQuery.data ?? [];
          const created = catalog.find(
            (t) => t.name.toLowerCase() === name.toLowerCase(),
          );
          if (created) {
            setLocalSelected((prev) => new Set(prev).add(created.id));
          }
        },
      },
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
              selectedIds={localSelected}
              pendingIds={pendingIds}
              onToggle={handleToggle}
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
