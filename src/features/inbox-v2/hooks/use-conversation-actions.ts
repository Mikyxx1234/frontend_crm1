"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  markConversationRead,
  postBulkAction,
  postConversationAction,
  type BulkAction,
} from "../api";

/** Atribuir conversa (assign) — comportamento otimista. */
export function useAssignConversation() {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof postConversationAction>>,
    Error,
    { conversationId: string; assignedToId: string | null }
  >({
    mutationFn: (vars) =>
      postConversationAction(vars.conversationId, {
        action: "assign",
        assignedToId: vars.assignedToId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onError: (err) => toast.error(err.message || "Falha ao atribuir"),
  });
}

/** Resolver / reabrir conversa. */
export function useToggleConversationResolve() {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof postConversationAction>>,
    Error,
    { conversationId: string; action: "resolve" | "reopen" }
  >({
    mutationFn: (vars) =>
      postConversationAction(vars.conversationId, { action: vars.action }),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "resolve" ? "Conversa finalizada" : "Conversa reaberta");
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err) => toast.error(err.message),
  });
}

/** Marcar conversa como lida (swipe / ao abrir). */
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (conversationId) => markConversationRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onError: () => {
      // silencioso — marcar como lida não deve incomodar o operador
    },
  });
}

/** Ações em lote (bulk) — usadas no modo de seleção. */
export function useBulkConversationAction() {
  const qc = useQueryClient();
  return useMutation<void, Error, { ids: string[]; action: BulkAction }>({
    mutationFn: (vars) => postBulkAction(vars.ids, vars.action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      qc.invalidateQueries({ queryKey: ["conversations", "tab-counts"] });
    },
    onError: (err) => toast.error(err.message),
  });
}
