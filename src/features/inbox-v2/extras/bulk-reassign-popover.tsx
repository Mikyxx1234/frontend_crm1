"use client";

/*
 * BulkReassignPopover — ação em massa "Reatribuir" na barra de seleção do Inbox.
 * Reusa o seletor de agentes (UserAvatar + useTeamUsers) e aplica assign
 * individual via Promise.allSettled (backend bulk não cobre `assign`).
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import { IconUserPlus, IconUserOff } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { UserAvatar } from "@/components/crm/user-avatar";
import {
  useBulkAssignConversations,
  useTeamUsers,
} from "@/features/inbox-v2/hooks";
import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";

interface BulkReassignPopoverProps {
  conversationIds: string[];
  disabled?: boolean;
  /** Tooltip quando o botão está desabilitado (ex.: modo "todas do filtro"). */
  disabledReason?: string;
  /** Chamado após conclusão com ao menos um êxito — tipicamente sai do modo seleção. */
  onDone?: () => void;
}

export function BulkReassignPopover({
  conversationIds,
  disabled,
  disabledReason,
  onDone,
}: BulkReassignPopoverProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();
  const [filter, setFilter] = useState("");

  const { data: users = [], isLoading } = useTeamUsers(open);
  const bulkAssign = useBulkAssignConversations();

  const filtered = users.filter((u) =>
    (u.name ?? u.email ?? "")
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );

  function handleSelect(userId: string | null) {
    if (conversationIds.length === 0 || bulkAssign.isPending) return;
    bulkAssign.mutate(
      { ids: conversationIds, assignedToId: userId },
      {
        onSuccess: (result) => {
          close();
          setFilter("");
          // Só sai do modo seleção se houve ao menos um êxito (paridade Encerrar/Reabrir).
          if (result.succeeded > 0) onDone?.();
        },
        onError: () => {
          close();
          setFilter("");
        },
      },
    );
  }

  const pos = computePopoverPosition(rect, 280, 320);
  const busy = bulkAssign.isPending || disabled || conversationIds.length === 0;

  return (
    <>
      <ButtonGlass
        ref={triggerRef}
        type="button"
        variant="glass"
        size="sm"
        disabled={busy}
        title={busy && disabledReason ? disabledReason : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (busy) return;
          toggle();
        }}
      >
        <IconUserPlus size={14} />
        <span className="ml-1.5">Reatribuir</span>
      </ButtonGlass>

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
                width: 280,
                isolation: "isolate",
              }}
              className="z-(--z-popover) rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-2 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
            >
              <p className="mb-1.5 px-1 text-[11px] text-[var(--text-muted)]">
                Atribuir {conversationIds.length} conversa
                {conversationIds.length > 1 ? "s" : ""} a…
              </p>
              <input
                autoFocus
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar pessoa…"
                onKeyDown={(e) => {
                  if (e.key === "Escape") close();
                }}
                className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]/40"
              />
              <ul className="max-h-64 overflow-y-auto">
                <li>
                  <button
                    type="button"
                    disabled={bulkAssign.isPending}
                    onClick={() => handleSelect(null)}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/10"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-strong)] text-[var(--text-muted)]">
                      <IconUserOff size={13} stroke={2.2} />
                    </span>
                    Sem responsável
                  </button>
                </li>
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
                  const name = u.name ?? u.email ?? "—";
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        disabled={bulkAssign.isPending}
                        onClick={() => handleSelect(u.id)}
                        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-strong)]"
                      >
                        <UserAvatar
                          name={name}
                          imageUrl={u.avatarUrl ?? null}
                          size={24}
                        />
                        <span className="min-w-0 truncate">{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
