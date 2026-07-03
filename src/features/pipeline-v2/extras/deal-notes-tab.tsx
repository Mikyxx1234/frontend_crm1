"use client";

/*
 * Tab "Notas" do DealDetailPanel.
 *
 * Modelo atual: lista de notas individuais persistidas via
 * `GET/POST /api/deals/:id/notes`, mesmo padrão usado pelo
 * `deal-workspace/panels/notes.tsx` e pela timeline (cada criação
 * dispara `NOTE_ADDED`). Cada nota guarda autor e timestamp.
 *
 * O `pinnedNote` (nota fixada da conversa vinculada) continua sendo
 * exibido no topo, com seu badge âmbar característico — é uma
 * informação de origem distinta (vem da conversa, não do deal).
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPinFilled, IconLock, IconLoader2, IconSend, IconFileText } from "@tabler/icons-react";
import { toast } from "sonner";

import { apiUrl } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

interface PinnedNote {
  id: string;
  content: string;
  senderName?: string | null;
  time?: string | null;
}

interface DealNote {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; email?: string | null };
}

interface DealNotesTabProps {
  dealId: string;
  /** @deprecated mantido por compat — o campo `notes` (string única)
   *  do deal não é mais usado; agora carregamos a lista do backend. */
  notes?: string | null;
  pipelineId?: string | null;
  statusFilter?: unknown;
  /** Nota fixada da conversa vinculada ao deal, se existir. */
  pinnedNote?: PinnedNote | null;
}

const dealNotesKey = (dealId: string) => ["deal-notes", dealId] as const;

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DealNotesTab({ dealId, pinnedNote }: DealNotesTabProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: notes = [], isLoading } = useQuery<DealNote[]>({
    queryKey: dealNotesKey(dealId),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/notes`));
      if (!res.ok) throw new Error("Erro ao carregar notas");
      const json = await res.json().catch(() => ({}));
      return Array.isArray(json) ? json : (json.items ?? []);
    },
    enabled: Boolean(dealId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/notes`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data?.message === "string" ? data.message : "Erro ao criar nota",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: dealNotesKey(dealId) });
      // Invalida timeline também (o backend dispara NOTE_ADDED).
      queryClient.invalidateQueries({ queryKey: ["deal-timeline", dealId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao salvar nota");
    },
  });

  const handleSubmit = useCallback(() => {
    const content = draft.trim();
    if (!content || mutation.isPending) return;
    mutation.mutate(content);
  }, [draft, mutation]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Nota fixada da conversa ── */}
      {pinnedNote && (
        <div className="px-5.5 pt-5.5">
          <div
            className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 p-3"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--color-warning) 10%, transparent) 0%, color-mix(in srgb, var(--color-warning) 7%, transparent) 100%)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5">
                <IconPinFilled size={10} className="text-[var(--color-warning)]" />
                <span className="font-display text-[9px] font-bold uppercase tracking-widest text-[var(--color-warning)]">
                  Nota fixada
                </span>
              </span>
              <IconLock size={11} className="text-[var(--color-warning)]/60" />
              <span className="font-display text-[10px] text-[var(--color-warning)]/60">
                Nota interna da conversa
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
              {pinnedNote.content}
            </p>
            {(pinnedNote.senderName || pinnedNote.time) && (
              <div className="flex items-center gap-2 pt-0.5">
                {pinnedNote.senderName && (
                  <span className="font-display text-[11px] font-semibold text-[var(--color-warning)]/70">
                    {pinnedNote.senderName}
                  </span>
                )}
                {pinnedNote.time && (
                  <span className="font-body text-[10.5px] text-[var(--color-warning)]/50">
                    {pinnedNote.time}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Lista de notas do deal ── */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <IconLoader2 size={20} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]">
            <IconFileText size={36} className="opacity-30" />
            <p className="mt-2 font-display text-[13px] font-semibold">
              Nenhuma nota ainda
            </p>
            <p className="mt-1 max-w-xs text-[12px]">
              Anote algo sobre este negócio — fica visível para o time e aparece
              na timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => (
              <article
                key={n.id}
                className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white p-3.5 shadow-[var(--glass-shadow-sm)]"
              >
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--text-primary)]">
                  {n.content}
                </p>
                <p className="mt-2 border-t border-[var(--glass-border)] pt-2 text-[11px] text-[var(--text-muted)]">
                  <span className="font-display font-semibold text-[var(--text-secondary)]">
                    {n.user?.name ?? "—"}
                  </span>
                  {" · "}
                  {formatDateTime(n.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ── Composer fixo ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="shrink-0 border-t border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma nota..."
            rows={2}
            className="min-h-[44px] flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || mutation.isPending}
            aria-label="Salvar nota"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--brand-primary, #5b6ff5)",
              boxShadow: "0 4px 14px rgba(91,111,245,0.35)",
            }}
          >
            {mutation.isPending ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : (
              <IconSend size={16} stroke={2.2} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
