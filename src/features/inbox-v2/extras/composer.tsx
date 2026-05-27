"use client";

import { type FormEvent } from "react";
import { IconSend, IconMoodSmile } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";

import { AudioRecorderButton } from "./audio-recorder-button";
import { ComposerMenu } from "./composer-menu";

/**
 * Composer completo para o ChatArea. Substitui o footer estático
 * do v0 via prop `composerSlot`. Reúne:
 *  - ComposerMenu (anexo / quick reply / template)
 *  - input controlado
 *  - AudioRecorderButton
 *  - botão de envio
 */
export function Composer({
  conversationId,
  value,
  onChange,
  onSend,
  sending,
  disabled,
  placeholder,
}: {
  conversationId: string | null;
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    onSend(trimmed);
  }

  function insertText(snippet: string) {
    onChange(value ? `${value}\n${snippet}` : snippet);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-[22px] mb-[22px] flex items-center gap-2 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-[18px] py-2 backdrop-blur-md shadow-[var(--glass-shadow-sm)]"
    >
      <ComposerMenu
        conversationId={conversationId}
        onInsertText={insertText}
        className="h-9 w-9"
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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Escreva sua mensagem..."}
        disabled={disabled || sending}
        className="flex-1 border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      <AudioRecorderButton conversationId={conversationId} className="h-9 w-9" />
      <ButtonGlass
        type="submit"
        variant="primary"
        size="icon"
        title="Enviar"
        className="h-9 w-9"
        disabled={!value.trim() || sending || disabled}
      >
        <IconSend size={18} />
      </ButtonGlass>
    </form>
  );
}
