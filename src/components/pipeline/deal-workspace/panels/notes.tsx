"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Send } from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";

import type { DealDetailNote } from "../shared";

const notesKey = (dealId: string) => ["deal-notes", dealId] as const;

type NotesPanelProps = {
  dealId: string;
  contactId: string | undefined;
  notes?: DealDetailNote[]; // @deprecated — ignorado internamente
  onCreated?: () => void;
};

export function NotesPanel({ dealId, contactId, onCreated }: NotesPanelProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState("");

  const { data: notes = [], isLoading } = useQuery<DealDetailNote[]>({
    queryKey: notesKey(dealId),
    queryFn: async () => {
      const url = contactId
        ? `/api/contacts/${contactId}/notes`
        : `/api/deals/${dealId}/notes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao carregar notas");
      const json = await res.json().catch(() => ({}));
      return Array.isArray(json) ? json : (json.items ?? []);
    },
    enabled: Boolean(dealId),
    staleTime: 30_000,
  });

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notesKey(dealId) });
    onCreated?.();
  }, [dealId, queryClient, onCreated]);

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const endpoint = contactId
        ? `/api/contacts/${contactId}/notes`
        : `/api/deals/${dealId}/notes`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, dealId }),
      });
      if (!res.ok) throw new Error("Erro ao criar nota");
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-chat-bg)]">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-[var(--color-ink-muted)]" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 size-12 text-slate-300" />
            <p className="text-[13px] font-medium tracking-tight text-[var(--color-ink-muted)]">
              Nenhuma nota ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <article
                key={n.id}
                className={cn(
                  "rounded-2xl border border-border bg-card p-4",
                  "shadow-[var(--shadow-sm)]",
                )}
              >
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed tracking-tight text-slate-800">
                  {n.content}
                </p>
                <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] tracking-tight text-[var(--color-ink-muted)]">
                  <span className="font-bold text-[var(--color-ink-soft)]">{n.user.name}</span>
                  {" · "}
                  {formatDateTime(n.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Composer fixo no rodape */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) mutation.mutate(draft.trim());
        }}
        className={cn(
          "shrink-0 border-t border-border bg-card/85 p-3 backdrop-blur-md",
          "pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:p-4",
        )}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma nota..."
            rows={2}
            className={cn(
              "min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-white",
              "px-3.5 py-2.5 text-[14px] tracking-tight text-slate-800 outline-none",
              "placeholder:text-[var(--color-ink-muted)]",
              "focus-visible:border-[var(--color-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) mutation.mutate(draft.trim());
              }
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || mutation.isPending}
            aria-label="Salvar nota"
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
              "bg-primary text-white shadow-[var(--shadow-indigo-glow)]",
              "transition-all hover:bg-[var(--color-primary-dark)] active:scale-95",
              "disabled:opacity-50 disabled:shadow-none",
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-4" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
