"use client";

import { useEffect, useRef, useState } from "react";

import { Chip } from "@/components/crm/chip";
import {
  useAssignConversation,
  useTeamUsers,
} from "@/features/inbox-v2/hooks";

interface AssigneePopoverProps {
  conversationId: string | null;
  currentAssigneeName?: string;
  currentAssigneeId?: string | null;
  disabled?: boolean;
}

export function AssigneePopover({
  conversationId,
  currentAssigneeName,
  currentAssigneeId,
  disabled,
}: AssigneePopoverProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users = [], isLoading } = useTeamUsers(open);
  const assign = useAssignConversation();

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
    if (!conversationId) return;
    assign.mutate(
      { conversationId, assignedToId: userId },
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
      {currentAssigneeName ? (
        <button
          type="button"
          disabled={disabled || !conversationId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Chip variant="brand">{currentAssigneeName}</Chip>
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled || !conversationId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Chip variant="ghost">+Responsável</Chip>
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-2 backdrop-blur-md shadow-[var(--glass-shadow)]">
          <input
            autoFocus
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar pessoa…"
            className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto"
          >
            {currentAssigneeId && (
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-warning)] hover:bg-white/10"
                >
                  <span>Remover responsável</span>
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
                Ninguém encontrado.
              </li>
            )}
            {filtered.map((u) => {
              const isActive = u.id === currentAssigneeId;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={assign.isPending}
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
