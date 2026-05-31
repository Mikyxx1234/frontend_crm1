"use client";

import { useState, type FormEvent } from "react";
import { IconSend, IconMoodSmile, IconLock } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";

import { AudioRecorderButton } from "./audio-recorder-button";
import { ComposerMenu } from "./composer-menu";

/**
 * Composer completo para o ChatArea. Substitui o footer estático
 * do v0 via prop `composerSlot`. Reúne:
 *  - ComposerMenu ("+" — anexo, template, nota, agendar, tarefa, resolver)
 *  - input controlado (com modo "nota interna")
 *  - AudioRecorderButton
 *  - botão de envio
 */
export function Composer({
  conversationId,
  value,
  onChange,
  onSend,
  onSendNote,
  sending,
  disabled,
  placeholder,
  isResolved,
  contactId,
}: {
  conversationId: string | null;
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  /** Envio como nota interna (isPrivate). Quando ausente, o item "Nota interna" não aparece no menu. */
  onSendNote?: (value: string) => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Quando definido, habilita o item Finalizar/Reabrir no menu "+". */
  isResolved?: boolean;
  contactId?: string | null;
}) {
  const [noteMode, setNoteMode] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    if (noteMode && onSendNote) {
      onSendNote(trimmed);
    } else {
      onSend(trimmed);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mx-[22px] mb-[22px] flex items-center gap-2 rounded-[var(--radius-2xl)] border px-[18px] py-2 backdrop-blur-md shadow-[var(--glass-shadow-sm)] ${
        noteMode
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]"
      }`}
    >
      <ComposerMenu
        conversationId={conversationId}
        className="h-9 w-9"
        noteMode={noteMode}
        onToggleNote={onSendNote ? () => setNoteMode((v) => !v) : undefined}
        isResolved={isResolved}
        contactId={contactId}
      />
      <ButtonGlass
        type="button"
        variant="icon"
        size="icon"
        title="Emoji"
        className="h-9 w-9"
        disabled
      >
        <IconMoodSmile size={20} />
      </ButtonGlass>
      {noteMode ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 font-display text-[11px] font-semibold text-amber-600">
          <IconLock size={12} /> Nota
        </span>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          noteMode
            ? "Nota interna (não enviada ao cliente)..."
            : placeholder ?? "Escreva sua mensagem..."
        }
        disabled={disabled || sending}
        className="flex-1 border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {!noteMode ? (
        <AudioRecorderButton conversationId={conversationId} className="h-9 w-9" />
      ) : null}
      <ButtonGlass
        type="submit"
        variant="primary"
        size="icon"
        title={noteMode ? "Salvar nota" : "Enviar"}
        className="h-9 w-9"
        disabled={!value.trim() || sending || disabled}
      >
        <IconSend size={18} />
      </ButtonGlass>
    </form>
  );
}
