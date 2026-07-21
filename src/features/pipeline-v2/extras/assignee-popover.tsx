"use client";

/*
 * Popover de Responsável (Owner) do Deal.
 * Renderizado via createPortal em document.body para escapar dos
 * stacking contexts criados por @hello-pangea/dnd em cada Draggable.
 */

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

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

  const position = computePopoverPosition(rect, 280, 256);

  return (
    <>
      <TooltipGlass label={currentOwnerName ?? "Selecionar responsável"} side="top">
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
      </TooltipGlass>

      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-2 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: 256,
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
              placeholder="Buscar pessoa…"
              className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {currentOwnerId && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelect(null)}
                    className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-warning)] hover:bg-[var(--glass-bg-strong)]"
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
                      className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] hover:bg-[var(--glass-bg-strong)] ${
                        isActive
                          ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
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
