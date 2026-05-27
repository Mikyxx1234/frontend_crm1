"use client";

/*
 * Popover de Responsável (Owner) do Deal.
 * Renderizado via createPortal em document.body para escapar dos
 * stacking contexts criados por @hello-pangea/dnd em cada Draggable.
 */

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTeamUsers, useUpdateDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

import { computePopoverPosition, usePortalPopover } from "./use-portal-popover";

interface AssigneePopoverProps {
  dealId: string | null;
  currentOwnerId?: string | null;
  currentOwnerName?: string | null;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  disabled?: boolean;
  trigger: ReactNode;
}

export function AssigneePopover({
  dealId,
  currentOwnerId,
  currentOwnerName,
  pipelineId,
  statusFilter = "OPEN",
  disabled,
  trigger,
}: AssigneePopoverProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } = usePortalPopover();
  const [filter, setFilter] = useState("");

  const { data: users = [], isLoading } = useTeamUsers(open);
  const update = useUpdateDeal(pipelineId, statusFilter);

  const filtered = users.filter((u) =>
    (u.name ?? u.email ?? "")
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );

  function handleSelect(userId: string | null) {
    if (!dealId) return;
    update.mutate(
      { dealId, payload: { ownerId: userId } },
      {
        onSuccess: () => {
          close();
          setFilter("");
        },
      },
    );
  }

  const position = computePopoverPosition(rect, 280);

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
        title={currentOwnerName ?? "Selecionar responsavel"}
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
              width: 256,
              zIndex: 9999,
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
              placeholder="Buscar pessoa…"
              className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {currentOwnerId && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelect(null)}
                    className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-warning)] hover:bg-black/5"
                  >
                    <span>Remover responsavel</span>
                  </button>
                </li>
              )}
              {isLoading && (
                <li className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                  Carregando…
                </li>
              )}
              {!isLoading && filtered.length === 0 && (
                <li className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                  Ninguem encontrado.
                </li>
              )}
              {filtered.map((u) => {
                const isActive = u.id === currentOwnerId;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={update.isPending}
                      onClick={() => handleSelect(u.id)}
                      className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] hover:bg-black/5 ${
                        isActive
                          ? "bg-[rgba(91,111,245,0.10)] text-[var(--brand-primary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="truncate">{u.name ?? u.email ?? "—"}</span>
                      {isActive && <span aria-hidden>✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
