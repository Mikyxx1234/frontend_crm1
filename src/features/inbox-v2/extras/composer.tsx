"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  IconSend,
  IconMoodSmile,
  IconLock,
  IconSignature,
  IconPencil,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { ButtonGlass } from "@/components/crm/button-glass";
import {
  useSlashMenu,
  SlashCommandMenu,
  type SlashItem,
} from "@/components/inbox/slash-command-menu";
import { sendMessage, sendTemplate } from "@/features/inbox-v2/api";
import { messagesKey } from "@/features/inbox-v2/hooks";
import { interpolateInternalTemplate } from "@/lib/internal-template-variables";

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
  const qc = useQueryClient();

  // Ref para o textarea — exigido pelo useSlashMenu para movimentar o cursor
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Container do composer — usado para detectar clique-fora do slash menu.
  const rootRef = useRef<HTMLDivElement>(null);

  // ── Assinatura do agente (estilo WhatsApp) ───────────────────────
  // Toggle + nome personalizado, persistidos em localStorage (mesmas
  // chaves do /inbox v1 → o operador mantém a preferência ao migrar).
  // Quando ligada e fora do modo nota, prefixa `*Nome*: ` na mensagem.
  const { data: session } = useSession();
  const agentName = (session?.user?.name ?? "").trim();
  const [sigEnabled, setSigEnabled] = useState(true);
  const [sigValue, setSigValue] = useState("");
  const [sigEditing, setSigEditing] = useState(false);
  const [sigDraft, setSigDraft] = useState("");

  useEffect(() => {
    try {
      const e = window.localStorage.getItem("eduit:signature:enabled");
      const v = window.localStorage.getItem("eduit:signature:value");
      if (e !== null) setSigEnabled(e === "1");
      if (v !== null) setSigValue(v);
    } catch {
      /* ignore */
    }
  }, []);

  const effectiveSignature = (sigValue.trim() || agentName).trim();

  function persistSigEnabled(v: boolean) {
    setSigEnabled(v);
    try {
      window.localStorage.setItem("eduit:signature:enabled", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  function persistSigValue(v: string) {
    setSigValue(v);
    try {
      window.localStorage.setItem("eduit:signature:value", v);
    } catch {
      /* ignore */
    }
  }

  // Prefixa a assinatura de forma idempotente (não duplica se o texto já
  // vier assinado em qualquer um dos formatos usados historicamente).
  function applySignature(text: string): string {
    const sig = effectiveSignature;
    if (!sigEnabled || !sig) return text;
    const s = sig.toLowerCase();
    const lower = text.toLowerCase();
    const already =
      lower.startsWith(`*${s}:*`) ||
      lower.startsWith(`*${s}*:`) ||
      lower.startsWith(`*${s}*`) ||
      lower.startsWith(`${s}:`);
    return already ? text : `*${sig}*: ${text}`;
  }

  // ── Envio direto a partir do slash menu ("Mensagens prontas") ────
  // Igual ao menu "+": clicar/Enter no item ENVIA na hora. Modelos
  // internos viram mensagem de texto; templates Meta vão via Cloud API.
  const slashSend = useMutation({
    mutationFn: (item: SlashItem) => {
      if (!conversationId) throw new Error("Nenhuma conversa selecionada");
      if (item.kind === "internal-template") {
        const text = applySignature(interpolateInternalTemplate(item.content, {}));
        return sendMessage(conversationId, { content: text });
      }
      return sendTemplate(conversationId, {
        templateName: item.name,
        bodyPreview: item.bodyPreview,
      });
    },
    onSuccess: (_data, item) => {
      toast.success(
        item.kind === "meta-template" ? "Template enviado" : "Modelo enviado",
      );
      if (conversationId) {
        qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
        qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      }
    },
    onError: (err: Error) => toast.error(err.message || "Falha ao enviar"),
  });

  // ── Slash command (/modelos) ────────────────────────────────────
  const slash = useSlashMenu({
    draft: value,
    setDraft: onChange,
    textareaRef,
    // Desabilita o atalho em modo nota (não faz sentido inserir templates ali)
    disabled: disabled || noteMode,
    onPickMetaTemplate: () => {},
    // Override: clique/Enter no item envia direto (o hook já remove o "/").
    onSelectOverride: (item) => slashSend.mutate(item),
  });

  // Fechar o slash menu via ESC (mesmo sem foco no textarea) e ao clicar
  // fora do composer — o hook só fecha por teclado com o textarea focado.
  useEffect(() => {
    if (!slash.state.open) return;
    function onEsc(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") slash.close();
    }
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        slash.close();
      }
    }
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [slash.state.open, slash.close]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    if (noteMode && onSendNote) {
      onSendNote(trimmed);
    } else {
      onSend(applySignature(trimmed));
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
        onSend(applySignature(trimmed));
      }
    }
  }

  return (
    <div ref={rootRef} className="relative mx-[22px] mb-[22px]">
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

      {/* Barra de assinatura do agente — só no modo mensagem (não em nota) */}
      {!noteMode ? (
        <div className="mb-1.5 flex items-center gap-2 px-2">
          <button
            type="button"
            role="switch"
            aria-checked={sigEnabled}
            aria-label={sigEnabled ? "Desligar assinatura" : "Ligar assinatura"}
            onClick={() => persistSigEnabled(!sigEnabled)}
            className={cn(
              "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
              sigEnabled ? "bg-[var(--brand-primary)]" : "bg-[var(--text-muted)]/40",
            )}
          >
            <span
              className={cn(
                "inline-block size-3 rounded-full bg-white shadow transition-transform",
                sigEnabled ? "translate-x-[14px]" : "translate-x-[2px]",
              )}
            />
          </button>
          <IconSignature size={13} className="shrink-0 text-[var(--text-muted)]" />
          {sigEditing ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={sigDraft}
                onChange={(e) => setSigDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    persistSigValue(sigDraft.trim());
                    setSigEditing(false);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setSigEditing(false);
                  }
                }}
                placeholder={agentName || "Seu nome"}
                className="h-6 w-40 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2 font-body text-[11.5px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
              />
              <button
                type="button"
                aria-label="Salvar assinatura"
                onClick={() => {
                  persistSigValue(sigDraft.trim());
                  setSigEditing(false);
                }}
                className="rounded-[var(--radius-sm)] p-0.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
              >
                <IconCheck size={14} />
              </button>
              <button
                type="button"
                aria-label="Cancelar"
                onClick={() => setSigEditing(false)}
                className="rounded-[var(--radius-sm)] p-0.5 text-[var(--text-muted)] hover:bg-[var(--text-muted)]/10"
              >
                <IconX size={14} />
              </button>
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "max-w-[180px] truncate font-body text-[11.5px] font-semibold transition-colors",
                  sigEnabled
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] line-through",
                )}
                title={
                  effectiveSignature
                    ? `Assinando como ${effectiveSignature}`
                    : "Defina um nome para assinar"
                }
              >
                {effectiveSignature || "Sem assinatura"}
              </span>
              <button
                type="button"
                aria-label="Editar assinatura"
                onClick={() => {
                  setSigDraft(sigValue);
                  setSigEditing(true);
                }}
                className="rounded-[var(--radius-sm)] p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
              >
                <IconPencil size={12} />
              </button>
            </>
          )}
        </div>
      ) : null}

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
