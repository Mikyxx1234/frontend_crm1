"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  IconDotsVertical,
  IconSearch,
  IconCircleCheck,
  IconRotateClockwise,
  IconStarFilled,
} from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";
import { RequirePermission } from "@/components/auth/require-permission";
import { TabulationDialog } from "./tabulation-dialog";

interface ConversationActionsMenuProps {
  conversationId: string | null;
  isResolved: boolean;
  disabled?: boolean;
  /** Handler opcional pra "Buscar na conversa". Quando ausente, mostra toast "em breve". */
  onSearchInConversation?: () => void;
  /** Abre o painel "Mensagens favoritas" (estrelas do agente logado). */
  onOpenFavorites?: () => void;
  /**
   * Callback disparado quando "Reabrir" cria um novo ticket (modelo de ticket).
   * O caller (ex.: inbox) usa isso para selecionar/navegar para a nova conversa.
   * Recebe o id da nova conversa gerada; o id previo continua acessivel via
   * `conversationId` (que era o anterior).
   */
  onReopenNewConversation?: (newConversationId: string) => void;
  /** Departamento vinculado a conversa — usado para o modal de tabulacao. */
  departmentId?: string | null;
  /** Se true, o botao "Encerrar" abre um modal exigindo folha da arvore. */
  requireTabulationOnClose?: boolean;
}

export function ConversationActionsMenu({
  conversationId,
  isResolved,
  disabled,
  onSearchInConversation,
  onOpenFavorites,
  onReopenNewConversation,
  departmentId,
  requireTabulationOnClose,
}: ConversationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [tabulationOpen, setTabulationOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleResolve = useToggleConversationResolve({
    onNewConversation: (newId) => {
      onReopenNewConversation?.(newId);
    },
  });

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
    // Encerramento com departamento que exige tabulacao -> abre modal.
    if (!isResolved && requireTabulationOnClose && departmentId) {
      setOpen(false);
      setTabulationOpen(true);
      return;
    }
    toggleResolve.mutate(
      {
        conversationId,
        action: isResolved ? "reopen" : "resolve",
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleConfirmTabulation(tabulationId: string) {
    if (!conversationId) return;
    toggleResolve.mutate(
      { conversationId, action: "resolve", tabulationId },
      { onSuccess: () => setTabulationOpen(false) },
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

          {onOpenFavorites && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenFavorites();
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
            >
              <IconStarFilled size={16} className="shrink-0 text-amber-500" />
              <span>Mensagens favoritas</span>
            </button>
          )}

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
      <TabulationDialog
        open={tabulationOpen}
        onOpenChange={setTabulationOpen}
        departmentId={departmentId ?? null}
        submitting={toggleResolve.isPending}
        onConfirm={handleConfirmTabulation}
      />
    </div>
  );
}
