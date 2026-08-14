"use client";

import { useState } from "react";

import { useUserRole } from "@/hooks/use-user-role";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";

import { TabulationDialog } from "./tabulation-dialog";
import { ResolveConfirmDialog } from "./skip-automations-option";

/**
 * Encerrar / reabrir conversa com opção de pular automações (ADMIN).
 *
 * - Não-admin: mesmo fluxo de hoje (tabulação se exigida, senão encerra direto).
 * - Admin sem tabulação: confirm com checkbox.
 * - Admin com tabulação: o mesmo modal de tabulação, com o checkbox.
 */
export function useResolveConversationFlow(opts: {
  conversationId: string | null;
  isResolved?: boolean;
  departmentId?: string | null;
  requireTabulationOnClose?: boolean;
  onReopenNewConversation?: (newConversationId: string) => void;
  onResolved?: (conversationId: string) => void;
}) {
  const { role, isSuperAdmin } = useUserRole();
  const canSkipAutomations = isSuperAdmin || role === "ADMIN";
  const [tabulationOpen, setTabulationOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tabulationDeptId, setTabulationDeptId] = useState<string | null>(null);

  const toggleResolve = useToggleConversationResolve({
    onNewConversation: (newId) => opts.onReopenNewConversation?.(newId),
    onResolved: (id) => opts.onResolved?.(id),
    onTabulationRequired: ({ departmentId: deptFromApi }) => {
      setTabulationDeptId(deptFromApi ?? opts.departmentId ?? null);
      setConfirmOpen(false);
      setTabulationOpen(true);
    },
  });

  function mutateResolve(extra?: {
    tabulationId?: string | null;
    skipAutomations?: boolean;
  }) {
    if (!opts.conversationId) return;
    toggleResolve.mutate(
      {
        conversationId: opts.conversationId,
        action: "resolve",
        tabulationId: extra?.tabulationId,
        skipAutomations:
          canSkipAutomations && extra?.skipAutomations ? true : undefined,
      },
      {
        onSuccess: () => {
          setTabulationOpen(false);
          setConfirmOpen(false);
        },
      },
    );
  }

  function handleToggleResolve() {
    if (!opts.conversationId) return;
    if (opts.isResolved) {
      toggleResolve.mutate({
        conversationId: opts.conversationId,
        action: "reopen",
      });
      return;
    }
    if (opts.requireTabulationOnClose && opts.departmentId) {
      setTabulationDeptId(opts.departmentId);
      setTabulationOpen(true);
      return;
    }
    if (canSkipAutomations) {
      setConfirmOpen(true);
      return;
    }
    mutateResolve();
  }

  const dialogs = (
    <>
      <TabulationDialog
        open={tabulationOpen}
        onOpenChange={setTabulationOpen}
        departmentId={tabulationDeptId ?? opts.departmentId ?? null}
        submitting={toggleResolve.isPending}
        allowSkipAutomations={canSkipAutomations}
        onConfirm={(tabulationId, extra) => {
          mutateResolve({
            tabulationId,
            skipAutomations: extra?.skipAutomations,
          });
        }}
      />
      <ResolveConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        submitting={toggleResolve.isPending}
        onConfirm={(skipAutomations) => mutateResolve({ skipAutomations })}
      />
    </>
  );

  return { handleToggleResolve, toggleResolve, dialogs, canSkipAutomations };
}
