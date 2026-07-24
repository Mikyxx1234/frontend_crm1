"use client";

import { useState } from "react";
import { IconCircleCheck, IconRotateClockwise } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { RequirePermission } from "@/components/auth/require-permission";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";

import { TabulationDialog } from "./tabulation-dialog";

/**
 * Botão dedicado "Encerrar / Reabrir conversa" — usado no topo do composer
 * (acima do botão enviar) para dar acesso direto ao operador, sem depender do
 * menu "+".
 *
 * Gateado por `conversation:resolve` (chave real do preset; MEMBER a possui).
 * Reaproveita o mesmo fluxo do menu de ações: encerramento com tabulação
 * obrigatória abre o `TabulationDialog`; reabrir cria um novo ticket.
 */
export function ConversationResolveButton({
  conversationId,
  isResolved,
  departmentId,
  requireTabulationOnClose,
  onReopenNewConversation,
  disabled,
}: {
  conversationId: string | null;
  isResolved?: boolean;
  departmentId?: string | null;
  requireTabulationOnClose?: boolean;
  onReopenNewConversation?: (newConversationId: string) => void;
  disabled?: boolean;
}) {
  const [tabulationOpen, setTabulationOpen] = useState(false);
  const toggleResolve = useToggleConversationResolve({
    onNewConversation: (newId) => onReopenNewConversation?.(newId),
  });

  function handleClick() {
    if (!conversationId) return;
    // Encerramento com departamento que exige tabulação → abre modal.
    if (!isResolved && requireTabulationOnClose && departmentId) {
      setTabulationOpen(true);
      return;
    }
    toggleResolve.mutate({
      conversationId,
      action: isResolved ? "reopen" : "resolve",
    });
  }

  function handleConfirmTabulation(tabulationId: string) {
    if (!conversationId) return;
    toggleResolve.mutate(
      { conversationId, action: "resolve", tabulationId },
      { onSuccess: () => setTabulationOpen(false) },
    );
  }

  return (
    <RequirePermission permission="conversation:resolve">
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || !conversationId || toggleResolve.isPending}
          title={isResolved ? "Reabrir conversa" : "Encerrar conversa"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold transition-all disabled:opacity-50",
            isResolved
              ? "border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md hover:bg-[var(--glass-bg-overlay)]"
              : "bg-[color-mix(in_srgb,var(--color-success)_92%,transparent)] text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] hover:brightness-95",
          )}
        >
          {isResolved ? (
            <IconRotateClockwise size={14} />
          ) : (
            <IconCircleCheck size={14} />
          )}
          {isResolved ? "Reabrir" : "Encerrar"}
        </button>

        <TabulationDialog
          open={tabulationOpen}
          onOpenChange={setTabulationOpen}
          departmentId={departmentId ?? null}
          submitting={toggleResolve.isPending}
          onConfirm={handleConfirmTabulation}
        />
      </>
    </RequirePermission>
  );
}
