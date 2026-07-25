"use client";

import { useState } from "react";
import { IconCircleCheck, IconRotateClockwise } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { RequirePermission } from "@/components/auth/require-permission";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";

import { TabulationDialog } from "./tabulation-dialog";

/**
 * Botão dedicado "Encerrar / Reabrir conversa" — usado na barra do composer.
 * Só ícone + TooltipGlass: Encerrar verde, Reabrir roxo.
 */
export function ConversationResolveButton({
  conversationId,
  isResolved,
  departmentId,
  requireTabulationOnClose,
  onReopenNewConversation,
  onResolved,
  disabled,
}: {
  conversationId: string | null;
  isResolved?: boolean;
  departmentId?: string | null;
  requireTabulationOnClose?: boolean;
  onReopenNewConversation?: (newConversationId: string) => void;
  /** Após Encerrar — atualiza sticky/status local sem refetch do id. */
  onResolved?: (conversationId: string) => void;
  disabled?: boolean;
}) {
  const [tabulationOpen, setTabulationOpen] = useState(false);
  const toggleResolve = useToggleConversationResolve({
    onNewConversation: (newId) => onReopenNewConversation?.(newId),
    onResolved: (id) => onResolved?.(id),
  });

  const label = isResolved ? "Reabrir conversa" : "Encerrar conversa";

  function handleClick() {
    if (!conversationId) return;
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
        <TooltipGlass label={label} side="top">
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled || !conversationId || toggleResolve.isPending}
            aria-label={label}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-50",
              isResolved
                ? "bg-violet-600 shadow-[0_2px_8px_rgba(124,58,237,0.35)] hover:bg-violet-500"
                : "bg-[color-mix(in_srgb,var(--color-success)_92%,transparent)] shadow-[0_2px_8px_rgba(16,185,129,0.35)] hover:brightness-95",
            )}
          >
            {isResolved ? (
              <IconRotateClockwise size={15} stroke={2.2} />
            ) : (
              <IconCircleCheck size={15} stroke={2.2} />
            )}
          </button>
        </TooltipGlass>

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
