"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconSend, IconMoodSmile, IconLock } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import {
  useSlashMenu,
  SlashCommandMenu,
} from "@/components/inbox/slash-command-menu";

import { AudioRecorderButton } from "./audio-recorder-button";
import { ComposerMenu } from "./composer-menu";

/**
 * Composer completo para o ChatArea. Substitui o footer estático
 * do v0 via prop `composerSlot`. Reúne:
 *  - ComposerMenu ("+" — anexo, template, nota, agendar, tarefa, resolver)
 *  - input controlado (com modo "nota interna")
 *  - Slash command menu — digitar "/" abre lista de modelos internos e
 *    templates WhatsApp (mesma UX já existente no /inbox legado)
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

  // Ref para o textarea — exigido pelo useSlashMenu para movimentar o cursor
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Slash command (/modelos) ────────────────────────────────────
  const slash = useSlashMenu({
    draft: value,
    setDraft: onChange,
    textareaRef,
    // Desabilita o atalho em modo nota (não faz sentido inserir templates ali)
    disabled: disabled || noteMode,
    onPickMetaTemplate: () => {
      // Quando o operador seleciona um template Meta, o Composer apenas
      // limpa o token "/" — o fluxo de "pendingTemplate" é aberto via
      // ComposerMenu que já tem essa lógica. Nada a fazer aqui.
    },
  });

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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Deixa o slash menu consumir Up/Down/Enter/Esc/Tab primeiro
    const consumed = slash.onKeyDown(e);
    if (consumed) return;

    // Enter sem Shift = envio
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || sending || disabled) return;
      if (noteMode && onSendNote) {
        onSendNote(trimmed);
      } else {
        onSend(trimmed);
      }
    }
  }

  return (
    <div className="relative mx-[22px] mb-[22px]">
      {/* Slash command menu — flutua acima do composer */}
      {slash.state.open && (
        <div className="absolute bottom-full left-0 mb-2 w-full">
          <SlashCommandMenu
            state={slash.state}
            onSelectItem={slash.onSelectItem}
            onHover={slash.setActiveIndex}
            className="w-full"
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-2 rounded-[var(--radius-2xl)] border px-[18px] py-2 backdrop-blur-md shadow-[var(--glass-shadow-sm)] ${
          noteMode
            ? "border-amber-400/60 bg-amber-400/10"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]"
        }`}
      >
        <ComposerMenu
          conversationId={conversationId}
          className="h-9 w-9 shrink-0"
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
          className="h-9 w-9 shrink-0"
          disabled
        >
          <IconMoodSmile size={20} />
        </ButtonGlass>

        <div className="flex flex-1 flex-col justify-center">
          {noteMode ? (
            <span className="mb-0.5 inline-flex items-center gap-1 self-start rounded-full bg-amber-400/20 px-2 py-0.5 font-display text-[11px] font-semibold text-amber-600">
              <IconLock size={12} /> Nota
            </span>
          ) : null}
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              noteMode
                ? "Nota interna (não enviada ao cliente)..."
                : placeholder ?? "Escreva uma mensagem ou / para modelos..."
            }
            disabled={disabled || sending}
            className="w-full resize-none overflow-hidden border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: "24px", maxHeight: "120px", lineHeight: "1.5" }}
          />
        </div>

        {!noteMode ? (
          <AudioRecorderButton conversationId={conversationId} className="h-9 w-9 shrink-0" />
        ) : null}
        <ButtonGlass
          type="submit"
          variant="primary"
          size="icon"
          title={noteMode ? "Salvar nota" : "Enviar"}
          className="h-9 w-9 shrink-0"
          disabled={!value.trim() || sending || disabled}
        >
          <IconSend size={18} />
        </ButtonGlass>
      </form>
    </div>
  );
}
