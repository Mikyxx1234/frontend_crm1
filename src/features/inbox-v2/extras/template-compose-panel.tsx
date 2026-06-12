"use client";

/*
 * Painel de validação de template do WhatsApp (DS v2).
 *
 * Comportamento (alinhado ao /inbox v1, porém no padrão visual v2):
 *  - O corpo do template NÃO é editável (canal exige modelo aprovado).
 *  - As variáveis `{{1}}`, `{{nome}}`... viram inputs que o agente preenche
 *    e valida antes do envio.
 *  - O preview mostra o corpo já com os valores substituídos em tempo real.
 *  - O envio é feito pelo botão "Enviar template" (não por clique no item),
 *    montando `components` no formato da Cloud API (evita code=132000).
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconLock, IconSend, IconX } from "@tabler/icons-react";

import { sendTemplate, type WhatsappTemplate } from "@/features/inbox-v2/api";
import { messagesKey } from "@/features/inbox-v2/hooks";
import type { OperatorVariableMeta } from "@/lib/meta-whatsapp/operator-template-variables";

/** Template selecionado, pronto para validação/envio. */
export interface PendingTemplate {
  /** Nome canônico WABA — vai em `templateName` no POST. */
  name: string;
  /** Rótulo de exibição (quando diferente do nome canônico). */
  label?: string;
  /** Corpo com placeholders `{{N}}`. */
  content: string;
  /** Id na Graph (Cloud API). */
  metaTemplateId?: string | null;
  /** Metadados das variáveis (rótulos/exemplos). */
  operatorVariables?: OperatorVariableMeta[] | null;
}

/** Normaliza um `WhatsappTemplate` (picker) em `PendingTemplate`. */
export function whatsappTemplateToPending(tpl: WhatsappTemplate): PendingTemplate {
  return {
    name: tpl.metaTemplateName ?? tpl.name,
    label: tpl.name,
    content: tpl.body ?? "",
    metaTemplateId: tpl.metaTemplateId ?? null,
    operatorVariables: tpl.operatorVariables ?? null,
  };
}

function extractPlaceholders(content: string, vars: OperatorVariableMeta[] | null | undefined): string[] {
  const fromMeta = vars?.map((v) => v.key).filter(Boolean) ?? [];
  if (fromMeta.length) return fromMeta;
  const set = new Set<string>();
  const re = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) set.add(m[1].trim());
  const keys = Array.from(set);
  // Ordena numéricos por valor ({{1}}, {{2}}...), mantém os demais na ordem.
  const numeric = keys.filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
  const named = keys.filter((k) => !/^\d+$/.test(k));
  return [...numeric, ...named];
}

export function TemplateComposePanel({
  conversationId,
  template,
  onCancel,
  onSent,
}: {
  conversationId: string;
  template: PendingTemplate;
  onCancel: () => void;
  onSent?: () => void;
}) {
  const qc = useQueryClient();
  const [vars, setVars] = useState<Record<string, string>>({});

  const placeholders = useMemo(
    () => extractPlaceholders(template.content, template.operatorVariables),
    [template],
  );

  // Reseta os valores ao trocar de template (preserva chaves iguais).
  useEffect(() => {
    setVars((prev) => {
      const next: Record<string, string> = {};
      for (const k of placeholders) next[k] = prev[k] ?? "";
      return next;
    });
  }, [placeholders]);

  const renderedPreview = useMemo(
    () =>
      template.content.replace(/\{\{([^}]+)\}\}/g, (_, raw: string) => {
        const k = raw.trim();
        const v = vars[k]?.trim();
        return v ? v : `{{${k}}}`;
      }),
    [template.content, vars],
  );

  const allFilled = placeholders.every((k) => vars[k]?.trim().length);

  const sendMutation = useMutation({
    mutationFn: () => {
      const components = placeholders.length
        ? [
            {
              type: "body",
              parameters: placeholders.map((k) => ({
                type: "text",
                text: vars[k] ?? "",
              })),
            },
          ]
        : undefined;
      return sendTemplate(conversationId, {
        templateName: template.name,
        bodyPreview: renderedPreview || template.content,
        components,
        templateGraphId: template.metaTemplateId ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Template enviado");
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      onSent?.();
    },
    onError: (err: Error) => toast.error(err.message || "Falha ao enviar template"),
  });

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--dropdown-solid-bg)] p-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
          <IconLock size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
            {template.label || template.name}
          </p>
          <p className="font-mono text-[10.5px] text-[var(--text-muted)]">
            Template do WhatsApp — corpo não editável
          </p>

          <p className="mt-2 max-h-[160px] overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--glass-border)]/60 bg-[var(--glass-bg-strong)] px-2.5 py-2 text-[12.5px] leading-relaxed text-[var(--text-primary)]">
            {renderedPreview || template.content}
          </p>

          {placeholders.length > 0 ? (
            <div className="mt-2.5 space-y-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Preencha e valide as variáveis
              </p>
              {placeholders.map((k) => {
                const meta = template.operatorVariables?.find((v) => v.key === k);
                const label = meta?.label?.trim() || `Variável {{${k}}}`;
                return (
                  <label key={k} className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {label}{" "}
                      <code className="font-mono text-[10.5px] text-[var(--text-primary)]">{`{{${k}}}`}</code>
                    </span>
                    <input
                      type="text"
                      value={vars[k] ?? ""}
                      onChange={(e) => setVars((prev) => ({ ...prev, [k]: e.target.value }))}
                      placeholder={meta?.example ? `Ex.: ${meta.example}` : `Valor para {{${k}}}`}
                      className="h-8 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
                    />
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar template"
          className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
        >
          <IconX size={15} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={sendMutation.isPending || !allFilled}
          title={!allFilled ? "Preencha todas as variáveis primeiro" : "Enviar template"}
          onClick={() => sendMutation.mutate()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-1.5 text-[12px] font-semibold text-white shadow-[var(--glass-shadow-sm)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <IconSend size={14} />
          {sendMutation.isPending ? "Enviando…" : "Enviar template"}
        </button>
      </div>
    </div>
  );
}
