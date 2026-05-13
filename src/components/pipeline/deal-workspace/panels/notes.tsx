"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2, Send } from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";

import type { DealDetailNote } from "../shared";

type NotesPanelProps = {
  notes: DealDetailNote[];
  contactId: string | undefined;
  dealId: string;
  onCreated: () => void;
};

export function NotesPanel({ notes, contactId, dealId, onCreated }: NotesPanelProps) {
  const [draft, setDraft] = React.useState("");

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const endpoint = contactId
        ? `/api/contacts/${contactId}/notes`
        : `/api/deals/${dealId}/notes`;
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, dealId }),
      });
      if (!res.ok) throw new Error("Erro ao criar nota");
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      onCreated();
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f4f7fa]">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 size-12 text-slate-300" />
            <p className="text-[13px] font-medium tracking-tight text-slate-400">
              Nenhuma nota ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <article
                key={n.id}
                className={cn(
                  "rounded-2xl border border-slate-100 bg-white p-4",
                  "shadow-[0_40px_100px_-40px_rgba(13,27,62,0.10)]",
                )}
              >
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed tracking-tight text-slate-800">
                  {n.content}
                </p>
                <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] tracking-tight text-slate-400">
                  <span className="font-bold text-slate-600">{n.user.name}</span>
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
          "shrink-0 border-t border-slate-100 bg-white/85 p-3 backdrop-blur-md",
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
              "min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white",
              "px-3.5 py-2.5 text-[14px] tracking-tight text-slate-800 outline-none",
              "placeholder:text-slate-400",
              "focus-visible:border-[#507df1]/50 focus-visible:ring-2 focus-visible:ring-[#507df1]/20",
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
              "bg-[#507df1] text-white shadow-blue-glow",
              "transition-all hover:bg-[#4466d6] active:scale-95",
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
