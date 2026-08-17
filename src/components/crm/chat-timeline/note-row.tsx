"use client";

import type { ReactNode } from "react";
import { IconListCheck, IconLock, IconPin, IconPinFilled } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type NoteRowProps = {
  content: ReactNode;
  senderName?: string | null;
  time: string;
  isPinned?: boolean;
  className?: string;
  onPinNote?: (noteId: string | null) => void;
  onAddToLog?: (content: string) => void;
  noteId?: string;
  logContent?: string;
};

/**
 * Nota interna manual (humano). Card com cadeado + rótulo azul "NOTA".
 * Visual preservado do MessageBubble — distinto da linha de EVENT.
 */
export function NoteRow({
  content,
  senderName,
  time,
  isPinned,
  className,
  onPinNote,
  onAddToLog,
  noteId,
  logContent,
}: NoteRowProps) {
  const hasNoteActions = !!(onPinNote || onAddToLog);

  return (
    <div
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] border px-3.5 py-2 text-sm leading-[1.45] transition-colors",
        isPinned
          ? "border-[color-mix(in_srgb,var(--brand-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,var(--glass-bg-base))]"
          : "border-[color-mix(in_srgb,var(--text-muted)_18%,transparent)] bg-[color-mix(in_srgb,var(--text-muted)_7%,var(--glass-bg-base))]",
        className,
      )}
    >
      {isPinned && (
        <span className="absolute -top-1.5 right-8 flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_15%,var(--glass-bg-base))] px-1.5 py-0.5">
          <IconPinFilled size={9} className="text-[var(--brand-primary)]" />
          <span className="font-display text-[8px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
            fixada
          </span>
        </span>
      )}

      <span className="flex shrink-0 items-center gap-1.5">
        <IconLock
          size={13}
          className="text-[var(--brand-primary)]"
          aria-hidden
        />
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)]">
          Nota
        </span>
      </span>
      <span className="sr-only">Nota interna. </span>

      <span className="h-3.5 w-px shrink-0 bg-[color-mix(in_srgb,var(--text-muted)_25%,transparent)]" aria-hidden />

      <span className="min-w-0 flex-1 text-[var(--text-primary)]">{content}</span>

      {hasNoteActions && (
        <span className="ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onPinNote && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    isPinned ? onPinNote(null) : onPinNote(noteId ?? null)
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] hover:text-[var(--brand-primary)]"
                  aria-label={isPinned ? "Desafixar nota" : "Fixar nota"}
                >
                  {isPinned ? (
                    <IconPinFilled size={13} aria-hidden />
                  ) : (
                    <IconPin size={13} aria-hidden />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                {isPinned ? "Desafixar nota" : "Fixar nota"}
              </TooltipContent>
            </Tooltip>
          )}
          {onAddToLog && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onAddToLog(logContent ?? "")}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] hover:text-[var(--brand-primary)]"
                  aria-label="Adicionar ao log do negócio"
                >
                  <IconListCheck size={13} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                Adicionar ao log do negócio
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      )}

      <span className="ml-auto flex shrink-0 items-center gap-2">
        {senderName && (
          <span className="font-display text-[11px] font-semibold text-[var(--text-secondary)]">
            {senderName}
          </span>
        )}
        <time className="font-mono text-[10.5px] tabular-nums text-[var(--text-muted)]">
          {time}
        </time>
      </span>
    </div>
  );
}
