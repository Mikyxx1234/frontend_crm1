"use client";

/**
 * Bloco de configuração do step "Webhook" — usado dentro do
 * `StepConfigPanel`. Componente isolado pra não inflar mais o
 * `step-config-panel.tsx` e pra permitir testes/refactor focados.
 *
 * Compatibilidade com config legado:
 *   - Antes existiam só `url` e `method`. Mantemos.
 *   - `headers` é um array de pares `{ key, value }` (string). Vazio = não
 *     envia headers customizados; o backend continua setando
 *     `Content-Type: application/json` automaticamente quando há body.
 *   - `body` é uma string template. Quando `body` é vazio/whitespace, o
 *     executor cai no payload legado (`{ event, contactId, dealId, data }`).
 *
 * O picker de variáveis insere tokens `{{caminho.aninhado}}` na posição
 * do cursor — consumido pelo backend via dotted-path resolver.
 */

import * as React from "react";
import { ChevronDown, Code2, Copy, Plus, Trash2, Variable } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_WEBHOOK_BODY_TEMPLATE,
  WEBHOOK_VARIABLE_GROUPS,
  WEBHOOK_VARIABLE_OPTIONS,
} from "@/lib/automation-webhook-variables";
import { cn } from "@/lib/utils";

export type WebhookHeaderEntry = { key: string; value: string };

type Draft = Record<string, unknown>;

type Props = {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
};

/** Normaliza headers do config legado (objeto plano) para o formato de array. */
function readHeadersFromDraft(draft: Draft): WebhookHeaderEntry[] {
  const raw = draft.headers;
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (h): h is WebhookHeaderEntry =>
          h !== null &&
          typeof h === "object" &&
          "key" in h &&
          "value" in h &&
          typeof (h as { key: unknown }).key === "string" &&
          typeof (h as { value: unknown }).value === "string",
      )
      .map((h) => ({ key: h.key, value: h.value }));
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => ({ key: k, value: String(v) }));
  }
  return [];
}

export function WebhookStepConfig({ draft, setDraft }: Props) {
  const url = String(draft.url ?? "");
  const method = String(draft.method ?? "POST");
  const body = String(draft.body ?? "");
  const headers = React.useMemo<WebhookHeaderEntry[]>(
    () => readHeadersFromDraft(draft),
    [draft],
  );

  const urlRef = React.useRef<HTMLInputElement | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);
  const headerValueRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

  type FocusTarget =
    | { type: "url" }
    | { type: "body" }
    | { type: "header-value"; index: number };
  const [focusTarget, setFocusTarget] = React.useState<FocusTarget>({ type: "body" });

  const setHeaders = (next: WebhookHeaderEntry[]) => {
    setDraft((d) => ({ ...d, headers: next }));
  };

  const updateHeader = (index: number, patch: Partial<WebhookHeaderEntry>) => {
    setHeaders(headers.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const insertTokenAt = (target: FocusTarget, token: string) => {
    if (target.type === "url") {
      const el = urlRef.current;
      const start = el?.selectionStart ?? url.length;
      const end = el?.selectionEnd ?? url.length;
      const next = url.slice(0, start) + token + url.slice(end);
      setDraft((d) => ({ ...d, url: next }));
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + token.length;
        el?.setSelectionRange(pos, pos);
      });
      return;
    }
    if (target.type === "body") {
      const el = bodyRef.current;
      const start = el?.selectionStart ?? body.length;
      const end = el?.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setDraft((d) => ({ ...d, body: next }));
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + token.length;
        el?.setSelectionRange(pos, pos);
      });
      return;
    }
    if (target.type === "header-value") {
      const i = target.index;
      const el = headerValueRefs.current[i];
      const current = headers[i]?.value ?? "";
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const next = current.slice(0, start) + token + current.slice(end);
      updateHeader(i, { value: next });
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + token.length;
        el?.setSelectionRange(pos, pos);
      });
    }
  };

  const insertSampleBody = () => {
    setDraft((d) => ({ ...d, body: DEFAULT_WEBHOOK_BODY_TEMPLATE }));
    setFocusTarget({ type: "body" });
  };

  const focusLabel: string =
    focusTarget.type === "url"
      ? "URL"
      : focusTarget.type === "body"
        ? "Body"
        : `Header #${focusTarget.index + 1}`;

  return (
    <div className="space-y-5">
      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="sc-wh-url">URL</Label>
        <Input
          id="sc-wh-url"
          ref={urlRef}
          value={url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
          onFocus={() => setFocusTarget({ type: "url" })}
          placeholder="https://exemplo.com/hooks/n8n-id"
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground">
          Aceita variáveis também na URL — útil pra rotas com IDs (ex.:
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[10px]">
            /api/leads/{"{{contact.id}}"}
          </code>
          ).
        </p>
      </div>

      {/* Método */}
      <div className="space-y-2">
        <Label htmlFor="sc-wh-method">Método</Label>
        <SelectNative
          id="sc-wh-method"
          value={method}
          onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </SelectNative>
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={addHeader}
          >
            <Plus className="size-3.5" />
            Adicionar
          </Button>
        </div>
        {headers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Nenhum header customizado. <code className="rounded bg-muted px-1">Content-Type: application/json</code>{" "}
            é setado automaticamente quando há body.
          </p>
        ) : (
          <div className="space-y-1.5">
            {headers.map((h, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Input
                  value={h.key}
                  onChange={(e) => updateHeader(i, { key: e.target.value })}
                  placeholder="Authorization"
                  className="font-mono text-xs"
                  autoComplete="off"
                />
                <Input
                  ref={(el) => {
                    headerValueRefs.current[i] = el;
                  }}
                  value={h.value}
                  onChange={(e) => updateHeader(i, { value: e.target.value })}
                  onFocus={() => setFocusTarget({ type: "header-value", index: i })}
                  placeholder="Bearer ..."
                  className="font-mono text-xs"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeHeader(i)}
                  aria-label={`Remover header ${h.key || i + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body + Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="sc-wh-body">Body</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={insertSampleBody}
              title="Substituir o body por um exemplo padrão"
            >
              <Copy className="size-3.5" />
              Modelo padrão
            </Button>
          </div>
        </div>
        <Textarea
          id="sc-wh-body"
          ref={bodyRef}
          rows={10}
          value={body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          onFocus={() => setFocusTarget({ type: "body" })}
          placeholder={`{\n  "event": "{{event}}",\n  "contact": "{{contact.name}}"\n}`}
          className="font-mono text-xs leading-relaxed"
        />
        <p className="text-[11px] text-muted-foreground">
          JSON ou texto livre. Variáveis no formato{" "}
          <code className="rounded bg-muted px-1">{"{{caminho.aninhado}}"}</code> são substituídas no momento do
          disparo. Body vazio = envia o payload legado (compat).
        </p>
      </div>

      {/* Picker */}
      <VariablePicker focusLabel={focusLabel} onSelect={(token) => insertTokenAt(focusTarget, token)} />
    </div>
  );
}

function VariablePicker({
  focusLabel,
  onSelect,
}: {
  focusLabel: string;
  onSelect: (token: string) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const grouped = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return WEBHOOK_VARIABLE_GROUPS.map((group) => ({
      group,
      items: WEBHOOK_VARIABLE_OPTIONS.filter(
        (opt) =>
          opt.group === group &&
          (q === "" ||
            opt.label.toLowerCase().includes(q) ||
            opt.token.toLowerCase().includes(q) ||
            (opt.hint?.toLowerCase().includes(q) ?? false)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Variable className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Variáveis disponíveis</span>
          <span className="truncate text-[11px] text-muted-foreground">
            · inserir em <span className="font-mono">{focusLabel}</span>
          </span>
        </div>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 p-3">
          <div className="relative">
            <Code2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar variável (ex.: ctwa, campaign, telefone)"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {grouped.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-muted-foreground">
              Nada encontrado para &quot;{search}&quot;.
            </p>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {grouped.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.group}
                  </div>
                  <div className="grid gap-1">
                    {g.items.map((opt) => (
                      <button
                        key={opt.token}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelect(opt.token)}
                        className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                        title={opt.hint}
                      >
                        <code className="mt-0.5 shrink-0 rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-sm">
                          {opt.token}
                        </code>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {opt.label}
                          </span>
                          {opt.hint && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {opt.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
