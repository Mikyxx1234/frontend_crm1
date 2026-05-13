"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Loader2, Pencil, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * Balão de rascunho gerado por um agente de IA em modo DRAFT.
 *
 * O operador humano pode:
 *  - aprovar e enviar (opcionalmente editando o texto antes)
 *  - descartar (remove a mensagem do histórico)
 *
 * O card fica inline no chat-window, antes das outras mensagens,
 * enquanto não é aprovado/descartado.
 */
export function AIDraftCard({
  messageId,
  content,
  createdAt,
  senderName,
  conversationId,
}: {
  messageId: string;
  content: string;
  createdAt: string | null;
  senderName: string | null;
  conversationId: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(content);
  const [error, setError] = React.useState<string | null>(null);

  const approveMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/ai-agents/drafts/${messageId}/approve`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draft.trim() }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Falha no envio.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", conversationId],
      });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro"),
  });

  const discardMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/ai-agents/drafts/${messageId}/discard`),
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Falha ao descartar.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", conversationId],
      });
    },
  });

  const busy = approveMut.isPending || discardMut.isPending;

  return (
    <div className="flex w-full justify-end px-2">
      <div className="w-full max-w-[92%] rounded-xl border border-indigo-300/60 bg-indigo-50/60 p-3 text-sm shadow-sm dark:border-indigo-700/60 dark:bg-indigo-950/30 md:max-w-[85%]">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          <Bot className="size-3.5" />
          Rascunho do agente IA
          {senderName && (
            <span className="text-indigo-500/80 dark:text-indigo-400/70 normal-case">
              • {senderName}
            </span>
          )}
          {createdAt && (
            <span className="ml-auto font-normal text-indigo-500/70 dark:text-indigo-400/70 normal-case">
              {new Date(createdAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(8, Math.max(3, draft.split("\n").length))}
            className="w-full resize-none rounded-lg border border-indigo-200 bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-indigo-800"
          />
        ) : (
          <p className="whitespace-pre-wrap text-foreground/90">{draft}</p>
        )}

        {error && (
          <div className="mt-2 rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
            {error}
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => discardMut.mutate()}
            disabled={busy}
            className="gap-1 text-destructive/80 hover:text-destructive"
          >
            <X className="size-3.5" /> Descartar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing((v) => !v)}
            disabled={busy}
            className="gap-1"
          >
            <Pencil className="size-3.5" /> {editing ? "Cancelar edição" : "Editar"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => approveMut.mutate()}
            disabled={busy || !draft.trim()}
            className="gap-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {approveMut.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Aprovar e enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
