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
import { useQuery } from "@tanstack/react-query";
import { IconFileText as FileText, IconLoader2 as Loader2, IconMessageQuestion as MessageSquareQuote } from "@tabler/icons-react";

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

export type SlashItemKind = "internal-template" | "meta-template";

export type SlashItem =
  | {
      kind: "internal-template";
      id: string;
      name: string;
      content: string;
      category: string | null;
      channelType: string | null;
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

  const isLoading =
    queriesEnabled && (internalsQ.isLoading || metasQ.isLoading);

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
  }, [internalsQ.data, metasQ.data, token]);

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

      const replacement = interpolateInternalTemplate(item.content, templateContext ?? {});

      const before = draft.slice(0, token.start);
      const after = draft.slice(token.end);
      const next = before + replacement + after;
      setDraft(next);
      close();

      // Move o cursor pro fim do texto inserido.
      const pos = (before + replacement).length;
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [draft, setDraft, token, close, onPickMetaTemplate, onSelectOverride, templateContext, textareaRef],
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
// Componente visual
// ─────────────────────────────────────────────────────────────────

const KIND_ORDER: SlashItemKind[] = ["internal-template", "meta-template"];

const KIND_GROUP_LABEL: Record<SlashItemKind, string> = {
  "internal-template": "Modelos internos do CRM",
  "meta-template": "Templates WhatsApp (Meta)",
};

const KIND_GROUP_HINT: Record<SlashItemKind, string> = {
  "internal-template": "Mensagem do CRM com variáveis preenchidas no envio",
  "meta-template": "Modelo aprovado na Meta — abre painel para confirmar envio",
};

const KIND_ICON: Record<SlashItemKind, React.ComponentType<{ className?: string }>> = {
  "internal-template": FileText,
  "meta-template": MessageSquareQuote,
};

const KIND_ICON_COLOR: Record<SlashItemKind, string> = {
  "internal-template": "text-primary",
  "meta-template": "text-emerald-600",
};

export function SlashCommandMenu({
  state,
  onSelectItem,
  onHover,
  className,
}: {
  state: SlashMenuState;
  onSelectItem: (item: SlashItem) => void;
  /** Atualiza activeIndex quando o mouse passa por um item. */
  onHover?: (index: number) => void;
  className?: string;
}) {
  if (!state.open) return null;

  // Agrupa os itens por tipo na ordem fixa KIND_ORDER, mantendo o
  // índice GLOBAL de cada item (essencial pra que ↑/↓ continuem
  // navegando linearmente entre todos os itens, mesmo separados em
  // cabeçalhos de seção).
  type IndexedItem = { item: SlashItem; globalIndex: number };
  const byKind: Record<SlashItemKind, IndexedItem[]> = {
    "internal-template": [],
    "meta-template": [],
  };
  state.items.forEach((item, i) => {
    byKind[item.kind].push({ item, globalIndex: i });
  });

  return (
    <div
      role="listbox"
      aria-label="Mensagens prontas"
      // Bug 29/mai/26: `bg-card` aqui ficava translúcido (40% opaco) porque
      // este design system define card como "glass" via
      // `--color-card: rgba(255,255,255,0.40)`. As mensagens do chat
      // atrás vazavam pelo menu. O sistema já tem token sólido
      // `--dropdown-solid-bg` (white em light, navy em dark) com esse
      // exato propósito — documentado em globals.css linhas 81–85.
      style={{ backgroundColor: "var(--dropdown-solid-bg)" }}
      className={cn(
        "z-50 max-h-[360px] w-[min(440px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-border p-1.5 shadow-2xl ring-1 ring-black/10 dark:ring-white/10",
        className,
      )}
    >
      <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mensagens prontas{state.query ? ` · "${state.query}"` : ""}
        </span>
        {state.items.length > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {state.items.length} {state.items.length === 1 ? "resultado" : "resultados"}
          </span>
        ) : null}
      </div>

      {state.isLoading && state.items.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Carregando…
        </div>
      ) : state.items.length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-muted-foreground">
          Nenhuma mensagem pronta encontrada.
        </div>
      ) : (
        <div className="space-y-1.5">
          {KIND_ORDER.map((kind) => {
            const group = byKind[kind];
            if (group.length === 0) return null;
            const Icon = KIND_ICON[kind];
            return (
              <section
                key={kind}
                aria-label={KIND_GROUP_LABEL[kind]}
                className="space-y-0.5"
              >
                <header className="flex items-baseline gap-2 border-b border-border/40 px-2 pb-1 pt-1">
                  <Icon className={cn("size-3.5 shrink-0", KIND_ICON_COLOR[kind])} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-foreground">
                    {KIND_GROUP_LABEL[kind]}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                    {group.length}
                  </span>
                  <span className="ml-auto truncate text-[10px] text-muted-foreground">
                    {KIND_GROUP_HINT[kind]}
                  </span>
                </header>
                <ul className="space-y-0.5">
                  {group.map(({ item, globalIndex }) => {
                    const active = globalIndex === state.activeIndex;
                    const title =
                      item.kind === "internal-template"
                        ? item.name
                        : item.label || item.name;
                    const preview =
                      item.kind === "internal-template"
                        ? item.content
                        : item.bodyPreview;
                    const tag = item.category ?? null;
                    return (
                      <li key={`${item.kind}-${item.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          // Evita perder foco do textarea (o input de envio).
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => onHover?.(globalIndex)}
                          onClick={() => onSelectItem(item)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                            active
                              ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                              : "text-foreground hover:bg-muted/70",
                          )}
                        >
                          <Icon
                            className={cn("mt-0.5 size-4 shrink-0", KIND_ICON_COLOR[item.kind])}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-[13px] font-semibold">
                                {title}
                              </span>
                              {tag ? (
                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                                  {tag}
                                </span>
                              ) : null}
                            </div>
                            {preview ? (
                              <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                                {preview}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between border-t border-border/40 px-2 pb-0.5 pt-1.5 text-[10px] text-muted-foreground">
        <span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↑</kbd>{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↓</kbd> navegar ·{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
          inserir
        </span>
        <span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> fechar
        </span>
      </div>
    </div>
  );
}
