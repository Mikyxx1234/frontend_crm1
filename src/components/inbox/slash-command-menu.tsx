"use client";

/**
 * Slash Command Menu — quando o operador digita "/" no composer do
 * inbox, este menu aparece listando atalhos de mensagem prontos:
 *
 *   - Modelos internos (`/api/templates`) — texto livre + variáveis dotted-path
 *     (`{{contato.nome}}`, `{{negocio.titulo}}`...) interpoladas client-side.
 *   - Templates WhatsApp (Meta WABA, `/api/whatsapp-template-configs/agent-enabled`)
 *     — disparam o `pendingTemplate` flow existente (preview + variáveis Meta
 *     + envio via Cloud API). Não inserem texto livre porque o canal exige
 *     fluxo aprovado.
 *
 * Quem fica responsável pelo quê:
 *   - `useSlashMenu` (hook abaixo) detecta abertura/fechamento, mantém a
 *     lista filtrada, gerencia índice ativo e aplica seleção. Devolve um
 *     `onKeyDown` que o composer chama ANTES dos handlers de envio/escape;
 *     ele retorna `true` quando consumiu o evento (Up/Down/Enter/Esc enquanto
 *     o menu está aberto).
 *   - `SlashCommandMenu` (componente) é puramente apresentação: recebe
 *     `state` + `onSelectItem`.
 *
 * Compat: o menu só abre quando "/" está no INÍCIO do draft ou após
 * whitespace, e fecha automaticamente assim que o token deixa de
 * existir (ex.: o usuário apaga). Isso preserva o comportamento atual
 * de quem digita "/" no meio de uma URL.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  IconBolt as Bolt,
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconMessageQuestion as MessageSquareQuote,
  IconMessage2,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  interpolateInternalTemplate,
  type InternalTemplateContext,
} from "@/lib/internal-template-variables";
import type { OperatorVariableMeta } from "@/lib/meta-whatsapp/operator-template-variables";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type SlashItemKind = "internal-template" | "quick-reply" | "meta-template";

export type SlashItem =
  | {
      kind: "internal-template";
      id: string;
      name: string;
      content: string;
      category: string | null;
      channelType: string | null;
      mediaUrl: string | null;
      mediaName: string | null;
    }
  | {
      kind: "quick-reply";
      id: string;
      name: string;
      content: string;
      category: string | null;
      attachmentUrl: string | null;
    }
  | {
      kind: "meta-template";
      id: string;
      name: string;
      label: string;
      bodyPreview: string;
      category: string | null;
      language: string;
      hasButtons: boolean;
      buttonTypes: string[];
      hasVariables: boolean;
      flowAction: string | null;
      flowId: string | null;
      operatorVariables: OperatorVariableMeta[] | null;
    };

export type SlashSelectionResult =
  | { kind: "insert-text"; text: string }
  | { kind: "open-meta-template"; item: Extract<SlashItem, { kind: "meta-template" }> };

// ─────────────────────────────────────────────────────────────────
// Detecção de "/" no draft
// ─────────────────────────────────────────────────────────────────

/**
 * Verifica se a posição do cursor está dentro de um token "/...".
 * Retorna `{ start, end, query }` se sim, `null` se não.
 *
 *   - "/abc|"          → { start: 0, end: 4, query: "abc" }
 *   - "oi /abc|"       → { start: 3, end: 7, query: "abc" }
 *   - "url://foo|"     → null  (depois de letra+":" não conta como atalho)
 *   - "  /  "          → null  (espaço quebra o token)
 */
export function detectSlashTokenAt(
  text: string,
  cursorPos: number,
): { start: number; end: number; query: string } | null {
  if (cursorPos < 1 || cursorPos > text.length) return null;
  // Walk backwards finding the slash that opens the token.
  let start = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "/") {
      // Verifica se o caractere anterior é início ou whitespace.
      const prev = i === 0 ? "" : text[i - 1];
      if (i === 0 || /\s/.test(prev)) {
        start = i;
        break;
      }
      return null;
    }
    if (/\s/.test(ch)) {
      // Quebrou o token sem achar "/".
      return null;
    }
  }
  if (start === -1) return null;
  // Walk forward from cursor pra achar o fim do token (até whitespace).
  let end = cursorPos;
  while (end < text.length && !/\s/.test(text[end])) end++;
  const query = text.slice(start + 1, end);
  return { start, end, query };
}

// ─────────────────────────────────────────────────────────────────
// Fetchers
// ─────────────────────────────────────────────────────────────────

type InternalRow = {
  id: string;
  name: string;
  content: string;
  category: string | null;
  language?: string;
  status?: string;
  channelType: string | null;
  mediaUrl?: string | null;
  mediaName?: string | null;
};
type QuickReplyRow = {
  id: string;
  title: string;
  content: string;
  attachmentUrl?: string | null;
  group?: { name?: string | null } | null;
};
type MetaRow = {
  id: string;
  metaTemplateId: string;
  metaTemplateName: string;
  label: string;
  agentEnabled?: boolean;
  language: string;
  category: string | null;
  bodyPreview: string;
  hasButtons?: boolean;
  hasVariables?: boolean;
  buttonTypes?: string[];
  flowAction?: string | null;
  flowId?: string | null;
  operatorVariables?: OperatorVariableMeta[] | null;
};

async function fetchInternalTemplates(): Promise<InternalRow[]> {
  const r = await fetch(apiUrl("/api/templates"));
  if (!r.ok) return [];
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function fetchMetaTemplates(): Promise<MetaRow[]> {
  const r = await fetch(apiUrl("/api/whatsapp-template-configs/agent-enabled"));
  if (!r.ok) return [];
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function fetchQuickReplies(): Promise<QuickReplyRow[]> {
  const r = await fetch(apiUrl("/api/settings/quick-replies"));
  if (!r.ok) return [];
  const data = await r.json().catch(() => []);
  const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return list as QuickReplyRow[];
}

// ─────────────────────────────────────────────────────────────────
// Hook de estado
// ─────────────────────────────────────────────────────────────────

export type SlashMenuState = {
  open: boolean;
  query: string;
  /** Lista plana já filtrada/ordenada que o componente renderiza. */
  items: SlashItem[];
  activeIndex: number;
  isLoading: boolean;
};

export type UseSlashMenuOptions = {
  draft: string;
  setDraft: (next: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Contexto pra interpolação dos modelos internos. */
  templateContext?: InternalTemplateContext;
  /** Disparado quando o operador escolhe um template Meta — pai abre o flow. */
  onPickMetaTemplate: (item: Extract<SlashItem, { kind: "meta-template" }>) => void;
  /**
   * Quando fornecido, SUBSTITUI a ação padrão de selecionar um item
   * (inserir texto / abrir flow). O hook só remove o token "/..." do draft
   * e delega TODO o resto ao consumidor — usado pelo composer v2 para
   * ENVIAR direto o modelo/template. Aplica-se tanto a clique quanto a
   * teclado (Enter/Tab), mantendo o comportamento consistente.
   */
  onSelectOverride?: (item: SlashItem) => void;
  /**
   * Chamado quando o item escolhido tem mídia anexada (modelo interno ou
   * mensagem rápida). O composer usa isso para "encostar" o anexo que será
   * enviado junto com o texto no envio. Ignorado quando `onSelectOverride`
   * está definido (esse caminho cuida do envio por conta própria).
   */
  onInsertMedia?: (media: { url: string; name: string | null }) => void;
  /** Desliga totalmente o atalho (ex.: modo nota, anexo pendente). */
  disabled?: boolean;
};

export function useSlashMenu({
  draft,
  setDraft,
  textareaRef,
  templateContext,
  onPickMetaTemplate,
  onSelectOverride,
  onInsertMedia,
  disabled = false,
}: UseSlashMenuOptions) {
  const [open, setOpen] = React.useState(false);
  const [token, setToken] = React.useState<{ start: number; end: number; query: string } | null>(
    null,
  );
  const [activeIndex, setActiveIndex] = React.useState(0);

  const queriesEnabled = open && !disabled;

  const internalsQ = useQuery({
    queryKey: ["slash-internal-templates"],
    queryFn: fetchInternalTemplates,
    enabled: queriesEnabled,
    staleTime: 60_000,
  });
  const metasQ = useQuery({
    queryKey: ["slash-meta-templates"],
    queryFn: fetchMetaTemplates,
    enabled: queriesEnabled,
    staleTime: 60_000,
  });
  const quickRepliesQ = useQuery({
    queryKey: ["slash-quick-replies"],
    queryFn: fetchQuickReplies,
    enabled: queriesEnabled,
    staleTime: 60_000,
  });

  const isLoading =
    queriesEnabled &&
    (internalsQ.isLoading || metasQ.isLoading || quickRepliesQ.isLoading);

  const items = React.useMemo<SlashItem[]>(() => {
    const q = (token?.query ?? "").trim().toLowerCase();
    const matches = (s: string) => (q === "" ? true : s.toLowerCase().includes(q));

    const out: SlashItem[] = [];

    for (const t of internalsQ.data ?? []) {
      if (matches(t.name) || matches(t.content) || matches(t.category ?? "")) {
        out.push({
          kind: "internal-template",
          id: t.id,
          name: t.name,
          content: t.content,
          category: t.category,
          channelType: t.channelType,
          mediaUrl: t.mediaUrl ?? null,
          mediaName: t.mediaName ?? null,
        });
      }
    }

    for (const q2 of quickRepliesQ.data ?? []) {
      if (matches(q2.title) || matches(q2.content) || matches(q2.group?.name ?? "")) {
        out.push({
          kind: "quick-reply",
          id: q2.id,
          name: q2.title,
          content: q2.content,
          category: q2.group?.name ?? null,
          attachmentUrl: q2.attachmentUrl ?? null,
        });
      }
    }

    for (const m of metasQ.data ?? []) {
      const name = m.label || m.metaTemplateName;
      if (matches(name) || matches(m.bodyPreview ?? "") || matches(m.category ?? "")) {
        out.push({
          kind: "meta-template",
          id: m.metaTemplateId,
          name: m.metaTemplateName,
          label: m.label,
          bodyPreview: m.bodyPreview ?? "",
          category: m.category,
          language: m.language,
          hasButtons: m.hasButtons === true,
          buttonTypes: Array.isArray(m.buttonTypes)
            ? m.buttonTypes.filter((x): x is string => typeof x === "string")
            : [],
          hasVariables: m.hasVariables === true,
          flowAction: m.flowAction ?? null,
          flowId: m.flowId ?? null,
          operatorVariables: Array.isArray(m.operatorVariables) ? m.operatorVariables : null,
        });
      }
    }

    return out;
  }, [internalsQ.data, metasQ.data, quickRepliesQ.data, token]);

  // Reset activeIndex sempre que a query muda — sem isso o índice
  // pode cair fora do range da nova lista.
  React.useEffect(() => {
    setActiveIndex(0);
  }, [token?.query, items.length]);

  // Recalcula token sempre que `draft` muda. Isso roda também quando o
  // componente monta com texto pré-existente (paste, restore de draft, etc.).
  const recompute = React.useCallback(() => {
    if (disabled) {
      if (open) setOpen(false);
      setToken(null);
      return;
    }
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? draft.length;
    const found = detectSlashTokenAt(draft, cursor);
    if (found) {
      setToken(found);
      if (!open) setOpen(true);
    } else {
      setToken(null);
      if (open) setOpen(false);
    }
  }, [draft, textareaRef, disabled, open]);

  // Hook chama recompute em todo render — barato (string scan curto).
  React.useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, disabled]);

  const close = React.useCallback(() => {
    setOpen(false);
    setToken(null);
  }, []);

  const applyItem = React.useCallback(
    (item: SlashItem) => {
      if (!token) return;

      // Override (composer v2): remove o "/token" e delega o envio ao pai.
      if (onSelectOverride) {
        const before = draft.slice(0, token.start);
        const after = draft.slice(token.end);
        setDraft(before + after);
        close();
        onSelectOverride(item);
        return;
      }

      if (item.kind === "meta-template") {
        // Substitui o "/query" por nada — o pai vai abrir o pendingTemplate
        // panel; deixar o token no draft só atrapalha.
        const before = draft.slice(0, token.start);
        const after = draft.slice(token.end);
        setDraft(before + after);
        close();
        onPickMetaTemplate(item);
        return;
      }

      // internal-template → interpola variáveis; quick-reply → texto literal.
      const replacement =
        item.kind === "internal-template"
          ? interpolateInternalTemplate(item.content, templateContext ?? {})
          : item.content;

      const before = draft.slice(0, token.start);
      const after = draft.slice(token.end);
      const next = before + replacement + after;
      setDraft(next);
      close();

      // Encosta a mídia (se houver) pra ir junto no envio.
      const mediaUrl =
        item.kind === "internal-template" ? item.mediaUrl : item.attachmentUrl;
      const mediaName =
        item.kind === "internal-template" ? item.mediaName : null;
      if (mediaUrl) onInsertMedia?.({ url: mediaUrl, name: mediaName });

      // Move o cursor pro fim do texto inserido.
      const pos = (before + replacement).length;
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [draft, setDraft, token, close, onPickMetaTemplate, onSelectOverride, onInsertMedia, templateContext, textareaRef],
  );

  const applyActive = React.useCallback(() => {
    const item = items[activeIndex];
    if (item) applyItem(item);
  }, [items, activeIndex, applyItem]);

  /**
   * Handler de teclado pro composer. Retorna `true` quando consumiu o
   * evento — o pai deve dar `e.preventDefault()` e PARAR o handler de
   * envio/etc dele.
   */
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!open || items.length === 0) {
        if (open && e.key === "Escape") {
          e.preventDefault();
          close();
          return true;
        }
        return false;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        applyActive();
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return true;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        applyActive();
        return true;
      }
      return false;
    },
    [open, items.length, applyActive, close],
  );

  const state: SlashMenuState = {
    open: open && !!token,
    query: token?.query ?? "",
    items,
    activeIndex,
    isLoading: !!isLoading,
  };

  return {
    state,
    onKeyDown,
    onSelectItem: applyItem,
    setActiveIndex,
    close,
  };
}

// ─────────────────────────────────────────────────────────────────
// Componente visual — modal central (padrão AgentAutomationPickerModal)
// ─────────────────────────────────────────────────────────────────
//
// Refatorado do popover pequeno para uma modal central grande, espelhando
// o visual da AgentAutomationPickerModal (card glass centralizado, header
// com ícone gradiente + título + subtítulo + busca + fechar, corpo com
// <section>s agrupadas por eyebrow header e grid de cards).
//
// IMPORTANTE — o comportamento é 100% preservado: a busca continua sendo o
// que o operador digita APÓS "/" no textarea, e a navegação por teclado
// (↑/↓/Enter/Esc/Tab) continua sendo tratada pelo `useSlashMenu.onKeyDown`
// que o composer chama no textarea. Por isso o foco NUNCA sai do textarea:
// o campo de busca do header é apenas um reflexo de `state.query` e todos os
// cliques usam `onMouseDown preventDefault` para manter o foco no textarea.

const KIND_ORDER: SlashItemKind[] = ["internal-template", "quick-reply", "meta-template"];

const KIND_GROUP_LABEL: Record<SlashItemKind, string> = {
  "internal-template": "Modelos internos do CRM",
  "quick-reply": "Mensagens rápidas",
  "meta-template": "Templates WhatsApp (Meta)",
};

const KIND_GROUP_HINT: Record<SlashItemKind, string> = {
  "internal-template": "Mensagem do CRM com variáveis preenchidas no envio",
  "quick-reply": "Resposta pronta — envia o texto (e o anexo, se houver)",
  "meta-template": "Modelo aprovado na Meta — abre painel para confirmar envio",
};

const KIND_ICON: Record<SlashItemKind, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "internal-template": FileText,
  "quick-reply": Bolt,
  "meta-template": MessageSquareQuote,
};

/** Visual (fg/bg) por tipo — mesmos tokens glass da modal de automação. */
const KIND_VISUAL: Record<SlashItemKind, { fg: string; bg: string }> = {
  "internal-template": {
    fg: "text-[var(--color-info)]",
    bg: "bg-[var(--color-primary)]/8",
  },
  "quick-reply": {
    fg: "text-[var(--color-warn)]",
    bg: "bg-[var(--color-warn-bg)]",
  },
  "meta-template": {
    fg: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success-soft,rgba(16,185,129,0.1))]",
  },
};

export function SlashCommandMenu({
  open,
  state,
  onSelectItem,
  onHover,
  onClose,
}: {
  /** Controla a exibição da modal (com animação de entrada/saída). */
  open: boolean;
  state: SlashMenuState;
  onSelectItem: (item: SlashItem) => void;
  /** Atualiza activeIndex quando o mouse passa por um item. */
  onHover?: (index: number) => void;
  /** Fecha a modal (backdrop / botão / ESC). */
  onClose: () => void;
}) {
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // ESC fecha (paridade com a modal de automação). O composer também escuta
  // ESC/onKeyDown — chamadas duplicadas de onClose são idempotentes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Agrupa os itens por tipo na ordem fixa KIND_ORDER, mantendo o
  // índice GLOBAL de cada item (essencial pra que ↑/↓ continuem
  // navegando linearmente entre todos os itens, mesmo separados em
  // cabeçalhos de seção).
  type IndexedItem = { item: SlashItem; globalIndex: number };
  const byKind: Record<SlashItemKind, IndexedItem[]> = {
    "internal-template": [],
    "quick-reply": [],
    "meta-template": [],
  };
  state.items.forEach((item, i) => {
    byKind[item.kind].push({ item, globalIndex: i });
  });

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="slash-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={onClose}
            className="fixed inset-0 z-70 bg-black/30 backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            key="slash-modal"
            role="listbox"
            aria-label="Mensagens prontas"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "fixed left-1/2 top-1/2 z-71 -translate-x-1/2 -translate-y-1/2",
              "w-[min(720px,calc(100vw-32px))] max-h-[min(80vh,720px)]",
              "flex flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--glass-border)]",
              "bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow-lg)] backdrop-blur-xl",
            )}
            // Mantém o foco no textarea (o input real de envio/busca).
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-6 pt-6 pb-5 backdrop-blur-md sm:px-7">
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                    "bg-linear-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white",
                    "shadow-[var(--glass-shadow)] ring-1 ring-white/40",
                  )}
                >
                  <IconMessage2 className="size-5" strokeWidth={2.4} />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold leading-tight tracking-tighter text-[var(--text-primary)] sm:text-[22px]">
                    Mensagens prontas
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium tracking-tight text-[var(--text-muted)]">
                    Escolha um modelo ou template para inserir na conversa.
                  </p>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <SlashSearchDisplay query={state.query} count={state.items.length} />
                  <SlashCloseButton onClose={onClose} />
                </div>
                <div className="sm:hidden">
                  <SlashCloseButton onClose={onClose} />
                </div>
              </div>

              <div className="mt-3 sm:hidden">
                <SlashSearchDisplay query={state.query} count={state.items.length} />
              </div>
            </div>

            {/* Body */}
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {state.isLoading && state.items.length === 0 ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="size-6 animate-spin text-[var(--text-muted)]" />
                </div>
              ) : state.items.length === 0 ? (
                <div className="py-12 text-center text-[13px] tracking-tight text-[var(--text-muted)]">
                  {state.query
                    ? `Nenhuma mensagem pronta encontrada para "${state.query}".`
                    : "Nenhuma mensagem pronta disponível."}
                </div>
              ) : (
                KIND_ORDER.map((kind, idx) => {
                  const group = byKind[kind];
                  if (group.length === 0) return null;
                  const Icon = KIND_ICON[kind];
                  const visual = KIND_VISUAL[kind];
                  return (
                    <section key={kind} aria-label={KIND_GROUP_LABEL[kind]} className={cn(idx > 0 && "mt-6")}>
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center rounded-md",
                            visual.bg,
                            visual.fg,
                          )}
                        >
                          <Icon className="size-3" strokeWidth={2.6} />
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-widest",
                            visual.fg,
                          )}
                        >
                          {KIND_GROUP_LABEL[kind]}
                        </span>
                        <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-1.5 py-0.5 text-[9px] tabular-nums text-[var(--text-muted)]">
                          {group.length}
                        </span>
                        <span className="ml-auto hidden truncate text-[10px] tracking-tight text-[var(--text-muted)] sm:inline">
                          {KIND_GROUP_HINT[kind]}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {group.map(({ item, globalIndex }) => (
                          <SlashItemCard
                            key={`${item.kind}-${item.id}`}
                            item={item}
                            active={globalIndex === state.activeIndex}
                            onHover={() => onHover?.(globalIndex)}
                            onSelect={() => onSelectItem(item)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>

            {/* Footer — dicas de teclado */}
            <div className="flex shrink-0 items-center justify-between border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-6 py-3 text-[10.5px] tracking-tight text-[var(--text-muted)] sm:px-7">
              <span>
                <kbd className="rounded bg-[var(--glass-bg-strong)] px-1 py-0.5 font-mono text-[10px]">↑</kbd>{" "}
                <kbd className="rounded bg-[var(--glass-bg-strong)] px-1 py-0.5 font-mono text-[10px]">↓</kbd> navegar ·{" "}
                <kbd className="rounded bg-[var(--glass-bg-strong)] px-1 py-0.5 font-mono text-[10px]">Enter</kbd> inserir
              </span>
              <span>
                <kbd className="rounded bg-[var(--glass-bg-strong)] px-1 py-0.5 font-mono text-[10px]">Esc</kbd> fechar
              </span>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  );
}

function SlashItemCard({
  item,
  active,
  onHover,
  onSelect,
}: {
  item: SlashItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = KIND_ICON[item.kind];
  const visual = KIND_VISUAL[item.kind];
  const title = item.kind === "meta-template" ? item.label || item.name : item.name;
  const preview = item.kind === "meta-template" ? item.bodyPreview : item.content;
  const tag = item.category ?? null;
  const hasMedia =
    (item.kind === "internal-template" && !!item.mediaUrl) ||
    (item.kind === "quick-reply" && !!item.attachmentUrl);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      // Evita perder o foco do textarea (o input real de envio/busca).
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "group/card flex w-full items-start gap-3 rounded-2xl border bg-[var(--glass-bg-overlay)]",
        "px-3.5 py-3 text-left transition-all duration-150",
        active
          ? "border-[var(--brand-primary)]/40 shadow-[var(--glass-shadow)] ring-1 ring-[var(--brand-primary)]/30"
          : "border-[var(--glass-border-subtle)] hover:border-[var(--brand-primary)]/30 hover:shadow-[var(--glass-shadow)]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          "ring-1 ring-[var(--glass-border-subtle)] transition-all",
          visual.bg,
          visual.fg,
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </p>
          {hasMedia ? (
            <span className="shrink-0 text-[11px]" title="Inclui anexo">
              📎
            </span>
          ) : null}
          {tag ? (
            <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-1.5 py-px text-[9px] uppercase tracking-wide text-[var(--text-muted)]">
              {tag}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] font-medium leading-snug tracking-tight text-[var(--text-muted)]">
          {preview || "Sem preview."}
        </p>
      </div>
    </button>
  );
}

/**
 * Campo de busca do header — reflexo (read-only) do que o operador digita
 * após "/" no textarea. Mantém o foco no textarea via `onMouseDown`
 * preventDefault, preservando a detecção do token e a navegação por teclado.
 */
function SlashSearchDisplay({ query, count }: { query: string; count: number }) {
  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "relative flex h-9 items-center gap-1.5 rounded-full border border-[var(--glass-border)]",
        "bg-[var(--input-bg)] pl-3 pr-3 transition-colors",
        query && "border-[var(--brand-primary)]/50",
      )}
    >
      <IconSearch className="size-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={2.2} />
      <input
        type="text"
        value={query}
        readOnly
        tabIndex={-1}
        aria-label="Filtro (digite após / no campo de mensagem)"
        placeholder="Digite após / para filtrar…"
        className={cn(
          "h-full w-[200px] min-w-0 flex-1 cursor-default border-0 bg-transparent text-[13px]",
          "tracking-tight text-[var(--text-primary)] outline-none",
          "placeholder:font-medium placeholder:text-[var(--text-muted)]",
        )}
      />
      <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--text-muted)]">
        {count} {count === 1 ? "resultado" : "resultados"}
      </span>
    </div>
  );
}

function SlashCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Fechar"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full",
        "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
        "transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)] active:scale-95",
      )}
    >
      <IconX className="size-4" strokeWidth={2.2} />
    </button>
  );
}
