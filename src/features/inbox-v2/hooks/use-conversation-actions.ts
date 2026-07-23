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

/**
 * Resolver / reabrir conversa.
 *
 * Modelo de ticket (15/jul/26): `reopen` NAO reabre o mesmo registro —
 * o backend cria uma nova conversa (#N+1) vinculada ao mesmo contato/canal
 * e retorna o id novo em `data.conversation.id`. Callers podem passar
 * `onNewConversation` para redirecionar/selecionar a nova conversa na UI
 * (ex.: inbox seta `?c=<newId>`; pipeline confia na invalidacao do
 * `deal-detail-v2` que ja traz `conversations[0]` mais recente).
 */
export function useToggleConversationResolve(
  callbacks?: {
    onNewConversation?: (newConversationId: string, previousConversationId: string) => void;
  },
) {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof postConversationAction>>,
    Error,
    {
      conversationId: string;
      action: "resolve" | "reopen";
      tabulationId?: string | null;
    }
  >({
    mutationFn: (vars) =>
      postConversationAction(
        vars.conversationId,
        vars.action === "resolve"
          ? { action: "resolve", tabulationId: vars.tabulationId ?? null }
          : { action: vars.action },
      ),
    onSuccess: (data, vars) => {
      const isReopen = vars.action === "reopen";
      const newId =
        isReopen && data.previousConversationId ? data.conversation?.id : null;

      toast.success(
        isReopen
          ? newId
            ? `Novo ticket #${data.conversation?.number ?? "—"} aberto`
            : "Conversa reaberta"
          : "Conversa finalizada",
      );

      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      // Atualiza timeline e activity-feed do deal vinculado à conversa.
      qc.invalidateQueries({ queryKey: ["deal-timeline-v2"] });
      qc.invalidateQueries({ queryKey: ["activity-feed"] });
      // Timeline propria da conversa (ConversationTimelineTab).
      qc.invalidateQueries({ queryKey: ["conversation-timeline", vars.conversationId] });
      if (newId) {
        qc.invalidateQueries({ queryKey: ["conversation-timeline", newId] });
      }
      // Detalhe do deal — inclui `contact.conversations[0].status/closedAt`,
      // que alimentam o chip "Encerrada" + marcador de fim de chat no
      // pipeline. Sem esta invalidacao a UI ficava travada ate refresh manual.
      qc.invalidateQueries({ queryKey: ["deal-detail-v2"] });

      if (newId && data.previousConversationId) {
        callbacks?.onNewConversation?.(newId, data.previousConversationId);
      }
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
  return useMutation<
    Awaited<ReturnType<typeof postBulkAction>>,
    Error,
    {
      ids: string[];
      action: BulkAction;
      /** true = encerrar TODAS as conversas do filtro atual (todas as páginas). */
      allInFilter?: boolean;
      tab?: string;
      search?: string;
      filters?: Record<string, unknown>;
    }
  >({
    mutationFn: (vars) =>
      postBulkAction(
        vars.ids,
        vars.action,
        vars.allInFilter
          ? {
              allInFilter: true,
              tab: vars.tab,
              search: vars.search,
              filters: vars.filters,
            }
          : undefined,
      ),
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      qc.invalidateQueries({ queryKey: ["conversations", "tab-counts"] });
      if (
        vars.action === "resolve" &&
        Array.isArray(result?.skipped) &&
        result.skipped.length > 0
      ) {
        toast.info(
          `${result.skipped.length} conversa(s) exigem tabulação e não foram encerradas. Encerre individualmente.`,
        );
      }
    },
    onError: (err) => toast.error(err.message),
  });
}
