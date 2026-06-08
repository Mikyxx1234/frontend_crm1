"use client";

/*
 * Tab "Notas" do DealDetailPanel.
 * Usa GET/POST /api/deals/:id/notes — retorna Note[] com author e timestamp.
 * Cada nota criada aqui é logada na timeline via NOTE_ADDED (feito pelo backend).
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconNote, IconSend } from "@tabler/icons-react";
import { toast } from "sonner";

/* ─── Tipos ──────────────────────────────────────────────────── */

interface NoteAuthor {
  id: string;
  name: string;
}

interface Note {
  id: string;
  content: string;
  dealId?: string | null;
  contactId?: string | null;
  userId: string;
  user?: NoteAuthor | null;
  createdAt: string;
  updatedAt: string;
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "#5b6ff5", "#a78bfa", "#f59e0b", "#10b981", "#ec4899", "#3b82f6",
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/* ─── Query key ──────────────────────────────────────────────── */

function notesKey(dealId: string) {
  return ["deal-notes-v2", dealId];
}

/* ─── Props ───────────────────────────────────────────────────── */

interface DealNotesTabProps {
  dealId: string;
}

/* ─── Componente ─────────────────────────────────────────────── */

export function DealNotesTab({ dealId }: DealNotesTabProps) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  /* Fetch notas */
  const {
    data: notes = [],
    isLoading,
    isError,
  } = useQuery<Note[]>({
    queryKey: notesKey(dealId),
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/notes`);
      if (!res.ok) throw new Error("Erro ao carregar notas");
      return res.json();
    },
    enabled: !!dealId,
    staleTime: 15_000,
  });

  /* Criar nota */
  const createMut = useMutation<Note, Error, string>({
    mutationFn: async (content) => {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao salvar nota");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notesKey(dealId) });
      // Invalida a timeline também — backend loga NOTE_ADDED
      qc.invalidateQueries({ queryKey: ["deal-timeline-v2", dealId] });
      setText("");
      toast.success("Nota salva");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    createMut.mutate(trimmed);
  }

  /* Ctrl+Enter para enviar */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      const trimmed = text.trim();
      if (trimmed) createMut.mutate(trimmed);
    }
  }

  const borderStyle = { borderColor: "var(--glass-border,rgba(0,0,0,0.08))" };

  return (
    <div className="flex h-full flex-col gap-3 p-[22px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[13px] font-bold text-[var(--text-primary,#1a202c)]">
          Notas
          {notes.length > 0 && (
            <span className="ml-1.5 rounded-full bg-[var(--brand-primary,#5b6ff5)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {notes.length}
            </span>
          )}
        </h3>
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma nota… (Ctrl+Enter para salvar)"
          rows={3}
          className="w-full resize-none rounded-[var(--radius-lg)] border bg-white px-3 py-2.5 pr-10 text-[13px] leading-relaxed text-[var(--text-primary,#1a202c)] outline-none transition focus:border-[var(--brand-primary,#5b6ff5)]"
          style={borderStyle}
        />
        <button
          type="submit"
          disabled={!text.trim() || createMut.isPending}
          className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-30"
          style={{ background: "var(--brand-primary,#5b6ff5)" }}
          title="Salvar nota (Ctrl+Enter)"
        >
          <IconSend size={13} />
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <p className="text-[12.5px] text-[var(--text-muted,#718096)]">Carregando notas...</p>
      )}

      {/* Erro */}
      {isError && (
        <p className="text-[12.5px] text-[var(--color-danger,#ef4444)]">
          Erro ao carregar notas.
        </p>
      )}

      {/* Vazio */}
      {!isLoading && !isError && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-[var(--text-muted,#718096)]">
          <IconNote size={32} className="opacity-40" />
          <p className="text-[12px]">Nenhuma nota ainda. Escreva a primeira acima.</p>
        </div>
      )}

      {/* Lista de notas */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {notes.map((note) => {
          const author = note.user?.name ?? "—";
          const color = avatarColor(note.userId);
          return (
            <div
              key={note.id}
              className="flex gap-2.5 rounded-[var(--radius-lg)] border p-3"
              style={{
                background: "var(--glass-bg-overlay,rgba(255,255,255,0.6))",
                ...borderStyle,
              }}
            >
              {/* Avatar */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: color }}
                title={author}
              >
                {initials(author)}
              </div>

              {/* Conteúdo */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[12px] font-semibold text-[var(--text-primary,#1a202c)]">
                    {author}
                  </span>
                  <span className="text-[10.5px] text-[var(--text-muted,#718096)]">
                    {relativeTime(note.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--text-secondary,#4a5568)]">
                  {note.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
