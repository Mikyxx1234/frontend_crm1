"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  IconSend,
  IconMoodSmile,
  IconLock,
  IconMessage,
  IconSignature,
  IconPencil,
  IconCheck,
  IconX,
  IconCornerUpLeft,
  IconPaperclip,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { ButtonGlass } from "@/components/crm/button-glass";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  useSlashMenu,
  SlashCommandMenu,
} from "@/components/inbox/slash-command-menu";
import { getContact } from "@/features/inbox-v2/api/misc";
import { sendAttachment } from "@/features/inbox-v2/api";
import { apiUrl } from "@/lib/api";
import type { InternalTemplateContext } from "@/lib/internal-template-variables";

import { ActiveBotsButton } from "./active-bots-button";
import { AudioRecorderButton, type AudioRecordState } from "./audio-recorder-button";
import { ChannelSelector } from "./channel-selector";
import { ComposerMenu } from "./composer-menu";
import {
  TemplateComposePanel,
  whatsappTemplateToPending,
  type PendingTemplate,
} from "./template-compose-panel";
import type { OutboundChannelOption } from "@/features/inbox-v2/hooks/use-channels";

/**
 * Composer completo para o ChatArea. Substitui o footer estático
 * do v0 via prop `composerSlot`. Reúne:
 *  - ComposerMenu ("+" — anexo, template, nota, agendar, tarefa, resolver)
 *  - input controlado (com modo "nota interna")
 *  - Slash command menu — digitar "/" abre lista de modelos internos e
 *    templates WhatsApp.
 *
 * Comportamento de modelos/templates (jun/2026):
 *  - Modelo interno do CRM → INSERE o texto (interpolado) no campo de
 *    mensagem para o agente editar/validar; o envio é pelo botão de envio.
 *  - Template do WhatsApp → abre o `TemplateComposePanel` (corpo travado +
 *    inputs de variáveis para validação); o envio é pelo botão do painel.
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
  externalTemplate,
  onExternalTemplateConsumed,
  signatureAllowed = true,
  signatureEditable = true,
  availableChannels,
  selectedChannelId,
  conversationChannelId,
  onSelectChannel,
  replyTo,
  onCancelReply,
  departmentId,
  requireTabulationOnClose,
  onReopenNewConversation,
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
  /**
   * Template empurrado por um picker externo (ex.: modal de sessão expirada).
   * Quando muda para não-nulo, abre o painel de validação aqui dentro.
   */
  externalTemplate?: PendingTemplate | null;
  /** Avisado quando o `externalTemplate` foi absorvido (para o pai limpar). */
  onExternalTemplateConsumed?: () => void;
  /** Permissão org-level: agentes podem usar assinatura. Default true. */
  signatureAllowed?: boolean;
  /** Permissão org-level: agentes podem editar o texto da assinatura. Default true. */
  signatureEditable?: boolean;
  /**
   * Canais WhatsApp CONNECTED da org (para seletor de canal de envio).
   * O seletor só é renderizado quando `availableChannels.length > 1` —
   * orgs com 1 canal não precisam do widget.
   */
  availableChannels?: OutboundChannelOption[];
  /** Canal selecionado para o envio. Controlado pelo pai. */
  selectedChannelId?: string | null;
  /** Canal "atual" da conversa (último inbound) — destacado como referência. */
  conversationChannelId?: string | null;
  /** Callback quando o agente troca o canal de envio. */
  onSelectChannel?: (channelId: string) => void;
  /**
   * Mensagem selecionada para "responder" (estilo WhatsApp). Quando não
   * nula, o composer renderiza uma barra de preview acima do input com o
   * remetente citado + preview do texto. O caller é responsável por incluir
   * `replyToId: replyTo.id` no payload de `sendMessage` e limpar após o envio.
   */
  replyTo?: {
    id: string;
    preview: string;
    senderName?: string | null;
  } | null;
  /** Handler do X para cancelar a resposta. */
  onCancelReply?: () => void;
  /** Departamento da conversa — propagado ao ComposerMenu para abrir
   *  modal de tabulacao ao encerrar quando o dept exige. */
  departmentId?: string | null;
  requireTabulationOnClose?: boolean;
  /** Reabrir pelo menu "+" cria um NOVO ticket (modelo de ticket); troca o
   *  chat ativo pro id novo. Sem isto o reopen acontece no backend mas a UI
   *  fica presa no ticket resolvido (que some do colapso) — parece "não reabriu". */
  onReopenNewConversation?: (newConversationId: string) => void;
}) {
  const [noteMode, setNoteMode] = useState(false);
  const [audioRecState, setAudioRecState] = useState<AudioRecordState>("idle");
  const isAudioActive = audioRecState !== "idle";

  // Anexo "encostado" por um modelo interno / mensagem rápida escolhido no
  // "/" ou no menu "+". Vai junto com o texto quando o operador enviar.
  const [pendingMedia, setPendingMedia] = useState<{ url: string; name: string | null } | null>(
    null,
  );

  // ── Contexto para interpolação de templates internos ─────────────
  // Busca dados do contato quando contactId está disponível, para
  // substituir tokens {{contato.nome}}, {{negocio.valor}} etc.
  const { data: contactData } = useQuery({
    queryKey: ["contact-for-template", contactId],
    queryFn: () => getContact(contactId!),
    enabled: !!contactId,
    staleTime: 2 * 60_000,
  });

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

  // Contexto de interpolação: contact + deal + atendente atual
  const templateContext = useMemo<InternalTemplateContext>(() => {
    const firstDeal = contactData?.deals?.[0];
    return {
      contact: contactData
        ? {
            name: contactData.name,
            phone: contactData.phone,
            email: contactData.email,
            cpf: contactData.cpf,
            tags: contactData.tags ?? [],
          }
        : undefined,
      deal: firstDeal
        ? {
            id: firstDeal.id,
            title: firstDeal.title,
            value: firstDeal.value,
            stageName: firstDeal.stageName ?? undefined,
            productName: firstDeal.productName ?? undefined,
          }
        : undefined,
      agent: session?.user
        ? { name: session.user.name ?? undefined, email: session.user.email ?? undefined }
        : undefined,
    };
  }, [contactData, session]);
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

  // ── Template do WhatsApp pendente de validação/envio ─────────────
  // Aberto pelo slash menu (meta-template) ou pelo menu "+". O envio é
  // feito pelo botão do próprio painel após o agente validar as variáveis.
  const [pendingTemplate, setPendingTemplate] = useState<PendingTemplate | null>(null);

  // Template empurrado de fora (modal de sessão expirada) → abre o painel.
  useEffect(() => {
    if (externalTemplate) {
      setPendingTemplate(externalTemplate);
      onExternalTemplateConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTemplate]);

  // Foca o textarea quando o agente clica "Responder" numa mensagem — evita
  // um clique extra pra começar a digitar a resposta.
  useEffect(() => {
    if (replyTo?.id) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [replyTo?.id]);

  // Auto-resize centralizado: recalcula a altura sempre que `value` muda.
  // Cobre digitação, colar texto grande (capa em 120px + scroll) e o reset
  // após enviar (value → "" volta pra altura mínima, sem ficar "gigante").
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  // Insere o texto de um modelo interno no campo (editável) e foca o cursor.
  // Se `media` vier junto, encosta o anexo pra ser enviado com a mensagem.
  function insertTemplateText(
    text: string,
    media?: { url: string; name: string | null } | null,
  ) {
    if (media) setPendingMedia(media);
    const base = value;
    const next = base.trim()
      ? `${base}${base.endsWith("\n") ? "" : "\n"}${text}`
      : text;
    onChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    });
  }

  // ── Slash command (/modelos) ────────────────────────────────────
  // Modelo interno → o hook insere o texto interpolado no campo (editável).
  // Template Meta → abre o painel de validação.
  const slash = useSlashMenu({
    draft: value,
    setDraft: onChange,
    textareaRef,
    templateContext,
    // Desabilita o atalho em modo nota (não faz sentido inserir templates ali)
    disabled: disabled || noteMode,
    // Modelo/mensagem rápida com anexo → encosta a mídia pra ir junto no envio.
    onInsertMedia: (media) => setPendingMedia(media),
    onPickMetaTemplate: (item) =>
      setPendingTemplate({
        name: item.name,
        label: item.label || undefined,
        content: item.bodyPreview,
        metaTemplateId: item.id,
        operatorVariables: item.operatorVariables ?? null,
      }),
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

  // `disabled` vindo do caller representa restrição do canal de saída
  // (ex.: sessão WhatsApp de 24h expirada — só pode enviar template).
  // Nota interna NÃO é enviada ao cliente, é anotação interna do CRM,
  // então essa restrição não se aplica e o composer deve continuar
  // funcional no modo nota. Caller pode bloquear nota interna passando
  // `onSendNote=undefined`.
  const inputDisabled = noteMode ? false : !!disabled;

  // Envia o anexo encostado (mídia de modelo/mensagem rápida) logo após o
  // texto. Silencioso em erro — o texto já saiu.
  async function flushPendingMedia() {
    if (!pendingMedia || !conversationId) return;
    const media = pendingMedia;
    setPendingMedia(null);
    try {
      const res = await fetch(apiUrl(media.url));
      if (!res.ok) return;
      const blob = await res.blob();
      await sendAttachment(conversationId, blob, { fileName: media.name ?? undefined });
    } catch {
      /* texto já foi enviado; anexo falhou silenciosamente */
    }
  }

  function performSend() {
    const trimmed = value.trim();
    // Permite enviar quando há texto OU um anexo encostado.
    if ((!trimmed && !pendingMedia) || sending || inputDisabled) return;
    if (noteMode && onSendNote) {
      // Nota interna não carrega anexo de modelo.
      if (trimmed) onSendNote(trimmed);
      return;
    }
    if (trimmed) onSend(applySignature(trimmed));
    void flushPendingMedia();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    performSend();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Deixa o slash menu consumir Up/Down/Enter/Esc/Tab primeiro
    const consumed = slash.onKeyDown(e);
    if (consumed) return;

    // Enter sem Shift = envio
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      performSend();
    }
  }

  return (
    <div ref={rootRef} className="relative mx-5.5 mb-2 max-md:mx-3 max-md:mb-2">
      {/* Painel de validação do template do WhatsApp — flutua acima do composer */}
      {pendingTemplate && conversationId ? (
        <TemplateComposePanel
          conversationId={conversationId}
          template={pendingTemplate}
          onCancel={() => setPendingTemplate(null)}
          onSent={() => setPendingTemplate(null)}
        />
      ) : null}

      {/* Barra de preview do reply (estilo WhatsApp) — logo acima do input.
          Aparece quando o agente clicou "Responder" numa mensagem. O X limpa
          o estado no caller; o envio já inclui replyToId no payload. */}
      {replyTo && (
        <div className="mb-2 flex items-stretch gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3 py-2 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
          <div className="flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/12 p-1.5 text-[var(--brand-primary)]">
            <IconCornerUpLeft size={14} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 border-l-[3px] border-[var(--brand-primary)] pl-2">
            <span className="font-display text-[10.5px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              Respondendo {replyTo.senderName?.trim() ? `a ${replyTo.senderName.trim()}` : "mensagem"}
            </span>
            <span className="line-clamp-2 break-words font-body text-[12px] leading-snug text-[var(--text-secondary)]">
              {replyTo.preview}
            </span>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancelar resposta"
              className="shrink-0 self-start rounded-full p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      )}

      {/* Anexo encostado por um modelo/mensagem rápida — vai junto no envio. */}
      {pendingMedia && (
        <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3 py-2 shadow-[var(--glass-shadow-sm)]">
          <div className="flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/12 p-1.5 text-[var(--brand-primary)]">
            <IconPaperclip size={14} />
          </div>
          <span className="min-w-0 flex-1 truncate font-body text-[12px] text-[var(--text-secondary)]">
            {pendingMedia.name?.trim() || "Anexo do modelo"} · será enviado junto
          </span>
          <button
            type="button"
            onClick={() => setPendingMedia(null)}
            aria-label="Remover anexo"
            className="shrink-0 rounded-full p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Slash command menu — flutua acima do composer */}
      {!pendingTemplate && slash.state.open && (
        <div className="absolute bottom-full left-0 mb-2 w-full">
          <SlashCommandMenu
            state={slash.state}
            onSelectItem={slash.onSelectItem}
            onHover={slash.setActiveIndex}
            className="w-full"
          />
        </div>
      )}

      {/* ── Row: tabs (esq.) + seletor de canal + slot direito (assinatura ou badge nota) ── */}
      {(onSendNote ||
        (signatureAllowed && !noteMode) ||
        (!noteMode && (availableChannels?.length ?? 0) > 1)) && (
        <div className="mb-2 flex items-center gap-1.5 px-0.5">
          {/* Tabs Mensagem / Nota interna */}
          {onSendNote && (
            <>
              <button
                type="button"
                onClick={() => setNoteMode(false)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold transition-all",
                  !noteMode
                    ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_rgba(91,111,245,0.35)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
              >
                <IconMessage size={13} />
                Mensagem
              </button>
              <button
                type="button"
                onClick={() => setNoteMode(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold transition-all",
                  noteMode
                    ? "border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
              >
                <IconLock size={13} />
                Nota interna
              </button>
            </>
          )}

          {/* Espaçador */}
          <div className="flex-1" />

          {/* Seletor de canal — só quando há >1 WhatsApp CONNECTED e fora do modo nota.
              Notas internas não trafegam por canal. */}
          {!noteMode &&
            availableChannels &&
            availableChannels.length > 1 &&
            onSelectChannel ? (
            <ChannelSelector
              channels={availableChannels}
              selectedChannelId={selectedChannelId ?? null}
              conversationChannelId={conversationChannelId ?? null}
              onSelect={onSelectChannel}
              disabled={sending}
              className="mr-1"
            />
          ) : null}

          {/* Slot direito: badge "Nota" no modo nota, assinatura no modo mensagem */}
          {noteMode ? (
            /* Badge de nota — ocupa o mesmo espaço da assinatura */
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 font-display text-[11.5px] font-semibold text-warning ring-1 ring-inset ring-warning/25">
              <IconLock size={12} /> Nota
            </span>
          ) : signatureAllowed ? (
            /* Assinatura do agente */
            <div className="flex items-center gap-1.5">
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
                    onClick={() => { persistSigValue(sigDraft.trim()); setSigEditing(false); }}
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
                  <TooltipGlass
                    label={effectiveSignature ? `Assinando como ${effectiveSignature}` : "Defina um nome para assinar"}
                    side="top"
                  >
                    <span
                      className={cn(
                        "max-w-[140px] truncate font-body text-[11.5px] font-semibold transition-colors",
                        sigEnabled
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)] line-through",
                      )}
                    >
                      {effectiveSignature || "Sem assinatura"}
                    </span>
                  </TooltipGlass>
                  {signatureEditable && (
                    <button
                      type="button"
                      aria-label="Editar assinatura"
                      onClick={() => { setSigDraft(sigValue); setSigEditing(true); }}
                      className="rounded-[var(--radius-sm)] p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
                    >
                      <IconPencil size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex min-h-11 items-center gap-2 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4.5 py-2 backdrop-blur-md shadow-[var(--glass-shadow-sm)]"
      >
        {/* Controles padrão — ocultos durante gravação de áudio */}
        {!isAudioActive && (
          <>
            <ComposerMenu
              conversationId={conversationId}
              className="h-9 w-9 shrink-0"
              noteMode={noteMode}
              onToggleNote={onSendNote ? () => setNoteMode((v) => !v) : undefined}
              isResolved={isResolved}
              contactId={contactId}
              templateContext={templateContext}
              onPickInternal={insertTemplateText}
              onPickTemplate={(tpl) => setPendingTemplate(whatsappTemplateToPending(tpl))}
              departmentId={departmentId ?? null}
              requireTabulationOnClose={requireTabulationOnClose}
              onReopenNewConversation={onReopenNewConversation}
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
          </>
        )}

        {/* Área de texto — oculta durante gravação de áudio */}
        {!isAudioActive && (
          <div className="flex flex-1 flex-col justify-center">
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
                  : inputDisabled
                    ? "Sessão encerrada — use um template ou Nota interna"
                    : placeholder ?? "Escreva uma mensagem ou / para modelos..."
              }
              disabled={inputDisabled || sending}
              className="w-full resize-none overflow-y-auto border-none bg-transparent font-body text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ minHeight: "24px", maxHeight: "120px", lineHeight: "1.5" }}
            />
          </div>
        )}

        {/* AudioRecorderButton: microfone (idle) ou barra inline (recording/preview) */}
        {!noteMode && (
          <AudioRecorderButton
            conversationId={conversationId}
            className="h-9 w-9 shrink-0"
            onStateChange={setAudioRecState}
          />
        )}

        {/* Automações em execução — botão ao lado do enviar (inbox e deal). */}
        {!isAudioActive && contactId && (
          <ActiveBotsButton inline contactId={contactId} />
        )}

        {/* Botão enviar — oculto durante gravação (AudioRecorderButton tem o seu próprio) */}
        {!isAudioActive && (
          <ButtonGlass
            type="submit"
            variant="primary"
            size="icon"
            title={noteMode ? "Salvar nota" : "Enviar"}
            className="h-9 w-9 shrink-0"
            disabled={!value.trim() || sending || inputDisabled}
          >
            <IconSend size={18} />
          </ButtonGlass>
        )}
      </form>
    </div>
  );
}
