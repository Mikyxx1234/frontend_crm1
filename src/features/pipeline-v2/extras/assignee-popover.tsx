"use client";

/*
 * Popover de Responsável (Owner) do Deal.
 * Usado pelo DealDetailPanel (/pipeline/kanban-v2) na sidebar > Negocio.
 *
 * - GET /api/users via useTeamUsers
 * - PUT /api/deals/:id { ownerId } via useUpdateDeal
 *
 * Aceita `trigger` como ReactNode para se encaixar dentro do
 * DetailRow do panel sem quebrar o layout.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useTeamUsers, useUpdateDeal } from "@/features/pipeline-v2/hooks";
import type { StatusFilter } from "@/features/pipeline-v2/api";

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
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users = [], isLoading } = useTeamUsers(open);
  const update = useUpdateDeal(pipelineId, statusFilter);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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
          setOpen(false);
          setFilter("");
        },
      },
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || !dealId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={currentOwnerName ?? "Selecionar responsavel"}
      >
        {trigger}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-[var(--radius-lg)] border p-2"
          style={{
            // Fundo OPACO (98% branco) — diferente do interior do
            // DealDetailPanel onde glass-bg-strong funciona bem. Dentro
            // de um DealCard pequeno sobre outros cards e mesh, qualquer
            // transparencia deixa o popover ilegivel.
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "rgba(255, 255, 255, 0.7)",
            boxShadow:
              "0 12px 40px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)",
            isolation: "isolate",
          }}
        >
          <input
            autoFocus
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar pessoa…"
            className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <ul role="listbox" className="max-h-56 overflow-y-auto">
            {currentOwnerId && (
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-warning)] hover:bg-white/10"
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
                    className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] hover:bg-white/10 ${
                      isActive
                        ? "bg-white/10 text-[var(--brand-primary)]"
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
        </div>
      )}
    </div>
  );
}
