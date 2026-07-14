"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  IconDotsVertical,
  IconSearch,
  IconCircleCheck,
  IconRotateClockwise,
} from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";
import { RequirePermission } from "@/components/auth/require-permission";

interface ConversationActionsMenuProps {
  conversationId: string | null;
  isResolved: boolean;
  disabled?: boolean;
  /** Handler opcional pra "Buscar na conversa". Quando ausente, mostra toast "em breve". */
  onSearchInConversation?: () => void;
}

export function ConversationActionsMenu({
  conversationId,
  isResolved,
  disabled,
  onSearchInConversation,
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

  function handleSearch() {
    setOpen(false);
    if (onSearchInConversation) {
      onSearchInConversation();
    } else {
      toast.info("Busca dentro da conversa: em breve.");
    }
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
        // Dropdown limpo (fundo branco solido, sombra suave) para casar
        // com o padrao dos menus contextuais do CRM. Icones a esquerda,
        // labels a direita — legibilidade + affordance clara.
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] v2-dark:bg-[#1a1f2e]">
          <button
            type="button"
            onClick={handleSearch}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            <IconSearch size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
            <span>Buscar na conversa</span>
          </button>

          <RequirePermission permission="conversation:close">
            <button
              type="button"
              disabled={toggleResolve.isPending}
              onClick={handleToggleResolve}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
            >
              {isResolved ? (
                <IconRotateClockwise size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
              ) : (
                <IconCircleCheck size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
              )}
              <span>{isResolved ? "Reabrir conversa" : "Encerrar conversa"}</span>
            </button>
          </RequirePermission>
        </div>
      )}
    </div>
  );
}
