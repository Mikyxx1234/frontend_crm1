"use client";

import { useEffect, useRef, useState } from "react";

import { IconDotsVertical } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";
import { RequirePermission } from "@/components/auth/require-permission";

interface ConversationActionsMenuProps {
  conversationId: string | null;
  isResolved: boolean;
  disabled?: boolean;
}

export function ConversationActionsMenu({
  conversationId,
  isResolved,
  disabled,
}: ConversationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleResolve = useToggleConversationResolve();

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

  function handleToggleResolve() {
    if (!conversationId) return;
    toggleResolve.mutate(
      {
        conversationId,
        action: isResolved ? "reopen" : "resolve",
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <ButtonGlass
        variant="glass"
        size="icon"
        title="Mais"
        disabled={disabled || !conversationId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconDotsVertical size={18} />
      </ButtonGlass>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 backdrop-blur-md shadow-[var(--glass-shadow)]">
          <RequirePermission permission="conversation:close">
            <button
              type="button"
              disabled={toggleResolve.isPending}
              onClick={handleToggleResolve}
              className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] text-[var(--text-primary)] hover:bg-white/10 disabled:opacity-50"
            >
              <span>
                {isResolved ? "Reabrir conversa" : "Finalizar conversa"}
              </span>
            </button>
          </RequirePermission>
        </div>
      )}
    </div>
  );
}
