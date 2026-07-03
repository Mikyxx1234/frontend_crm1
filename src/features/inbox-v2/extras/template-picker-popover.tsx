"use client";

import { useMemo, useState } from "react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";

import {
  listAgentEnabledTemplates,
  sendTemplate,
  sendMessage,
  type WhatsappTemplate,
} from "@/features/inbox-v2/api";
import { messagesKey, useMessages } from "@/features/inbox-v2/hooks";
import type { InboxMessageDto } from "@/features/inbox-v2/api/types";
import {
  interpolateInternalTemplate,
  type InternalTemplateContext,
} from "@/lib/internal-template-variables";
import { apiUrl } from "@/lib/api";

/* ─────────────────────────────────────────────────────────────
   Detecção de envio anterior de template nesta conversa
───────────────────────────────────────────────────────────── */

interface PriorSend {
  sentAt: string; // ISO
  author: string; // "Automação" ou nome do agente
  repliedAt?: string; // ISO — se o lead respondeu depois
}

/**
 * Para um nome de template (ex.: "form__quali_estag_em"), procura nas
 * mensagens da conversa se ele já foi enviado antes.
 * A detecção usa o padrão de conteúdo que o backend grava:
 *   `📋 *<nome>*` ou `*<nome>*:`
 */
function usePriorSend(
  conversationId: string | null,
  templateName: string,
): PriorSend | null {
  const { data } = useMessages(conversationId);
  return useMemo(() => {
    const msgs = data?.messages ?? [];
    // Último OUT com este template
    const outMatch = [...msgs]
      .reverse()
      .find(
        (m: InboxMessageDto) =>
          m.direction === "out" &&
          m.messageType === "template" &&
          !!(m.content ?? "").match(
            new RegExp(`\\*${templateName}\\*|📋 \\*${templateName}\\*`, "i"),
          ),
      );
    if (!outMatch) return null;

    const sentAt = outMatch.createdAt;
    const author =
      outMatch.senderName === "Automação" || !outMatch.senderName
        ? "Automação"
        : outMatch.senderName;

    // Houve resposta IN interativa/form após esse envio?
    const repliedMsg = msgs.find(
      (m: InboxMessageDto) =>
        m.direction === "in" &&
        (m.messageType === "interactive" ||
          (m.content ?? "").includes("Resposta do formulário")) &&
        m.createdAt > sentAt,
    );

    return { sentAt, author, repliedAt: repliedMsg?.createdAt };
  }, [data?.messages, templateName]);
}

/** Formata data ISO para "dd/MM HH:mm" (horário local). */
function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

/* ─────────────────────────────────────────────────────────────
   Botão de template com confirmação de reenvio inline
───────────────────────────────────────────────────────────── */

function TemplateItemWithConfirm({
  tpl,
  conversationId,
  onSend,
  onPick,
  isPending,
}: {
  tpl: WhatsappTemplate;
  conversationId: string;
  onSend: () => void;
  /** Quando fornecido, clicar SELECIONA o template (abre painel de validação)
   * em vez de enviar direto — a confirmação de reenvio passa a ser o painel. */
  onPick?: () => void;
  isPending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  // O backend grava o nome canônico WABA (metaTemplateName) no conteúdo
  // da mensagem out — `tpl.name` pode ser o label (rótulo de exibição).
  // Fallback pra `tpl.name` mantém compat se o adapter não preencheu.
  const prior = usePriorSend(conversationId, tpl.metaTemplateName ?? tpl.name);

  if (confirming && prior) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] px-2.5 py-2.5">
        <div className="mb-2 flex items-start gap-1.5">
          <IconAlertTriangle size={14} className="mt-px shrink-0 text-[var(--color-warn)]" />
          <p className="text-[11.5px] leading-snug text-[var(--text-primary)]">
            <span className="font-semibold">&ldquo;{tpl.name}&rdquo;</span> já
            foi enviado por{" "}
            <span className="font-semibold">{prior.author}</span> em{" "}
            {fmtDate(prior.sentAt)}
            {prior.repliedAt && (
              <> e <span className="font-semibold">já foi respondido</span> em {fmtDate(prior.repliedAt)}</>
            )}
            . Reenviar mesmo assim?
          </p>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="ml-auto shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <IconX size={13} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setConfirming(false);
              onSend();
            }}
            className="rounded-full bg-[var(--color-warning)] px-3 py-1 text-[11.5px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            Reenviar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full px-3 py-1 text-[11.5px] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        // Com `onPick`, o painel de validação é o próprio passo de confirmação
        // — não exibimos o confirm inline de reenvio aqui.
        if (onPick) {
          onPick();
        } else if (prior) {
          setConfirming(true);
        } else {
          onSend();
        }
      }}
      className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] disabled:opacity-60"
    >
      <div className="flex items-center gap-1.5">
          <span className="font-display text-xs font-bold text-[var(--text-primary)]">
            {tpl.name}
          </span>
        {prior && (
          <TooltipGlass
            label={`Enviado por ${prior.author} em ${fmtDate(prior.sentAt)}${prior.repliedAt ? " · Respondido" : ""}`}
            side="top"
          >
            <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-warning)_20%,transparent)] px-1.5 py-px text-[9.5px] font-semibold text-[var(--color-warning)]">
              {prior.repliedAt ? "respondido" : "enviado"}
            </span>
          </TooltipGlass>
        )}
      </div>
      {tpl.body ? (
        <div className="mt-0.5 line-clamp-2 text-[11.5px] text-[var(--text-muted)]">
          {tpl.body}
        </div>
      ) : null}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Modelos Internos do CRM
───────────────────────────────────────────────────────────── */

interface InternalTemplate {
  id: string;
  name: string;
  content: string;
  category: string | null;
  channelType: string | null;
}

async function fetchInternalTemplates(): Promise<InternalTemplate[]> {
  const res = await fetch(apiUrl("/api/templates"));
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

/**
 * Lista templates internos do CRM e insere o texto interpolado
 * diretamente na conversa ao clicar.
 */
export function InternalTemplatePickerList({
  conversationId,
  templateContext,
  onClose,
  onPick,
}: {
  conversationId: string;
  templateContext?: InternalTemplateContext;
  onClose?: () => void;
  /**
   * Quando fornecido, clicar no modelo INSERE o texto interpolado no composer
   * (editável, envio pelo botão) em vez de enviar na hora.
   */
  onPick?: (text: string) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<InternalTemplate[]>({
    queryKey: ["internal-templates"],
    queryFn: fetchInternalTemplates,
    staleTime: 5 * 60_000,
  });

  const sendMutation = useMutation({
    mutationFn: (tpl: InternalTemplate) => {
      const text = interpolateInternalTemplate(tpl.content, templateContext ?? {});
      return sendMessage(conversationId, { content: text });
    },
    onSuccess: () => {
      toast.success("Modelo enviado");
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      onClose?.();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Falha ao enviar modelo"),
  });

  /* agrupa por categoria */
  const byCategory = (data ?? []).reduce<Record<string, InternalTemplate[]>>(
    (acc, tpl) => {
      const key = tpl.category ?? "Geral";
      if (!acc[key]) acc[key] = [];
      acc[key].push(tpl);
      return acc;
    },
    {},
  );

  return (
    <div
      style={{ backgroundColor: "var(--dropdown-solid-bg)" }}
      className="w-80 max-h-96 overflow-y-auto rounded-[var(--radius-lg)] border border-border p-2 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Modelos internos do CRM
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Fechar
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
          Carregando...
        </div>
      ) : !data?.length ? (
        <div className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
          Nenhum modelo interno cadastrado.
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(byCategory).map(([category, templates]) => (
            <div key={category}>
              <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {category}
              </div>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={sendMutation.isPending}
                  onClick={() => {
                    if (onPick) {
                      onPick(
                        interpolateInternalTemplate(tpl.content, templateContext ?? {}),
                      );
                      onClose?.();
                    } else {
                      sendMutation.mutate(tpl);
                    }
                  }}
                  className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left hover:bg-[var(--glass-bg-strong)] disabled:opacity-60"
                >
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {tpl.name}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[11.5px] text-[var(--text-muted)]">
                    {tpl.content}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Lista templates WhatsApp habilitados para o agente e dispara
 * `sendTemplate` ao clicar. Mostra badge "enviado/respondido" quando
 * o template já foi usado nesta conversa, com confirm antes de reenviar.
 */
export function TemplatePickerList({
  conversationId,
  onClose,
  onPick,
}: {
  conversationId: string;
  onClose?: () => void;
  /**
   * Quando fornecido, clicar no template ABRE o painel de validação no
   * composer (corpo travado + variáveis) em vez de enviar na hora.
   */
  onPick?: (tpl: WhatsappTemplate) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, error, isError } = useQuery<WhatsappTemplate[]>({
    queryKey: ["whatsapp-templates", "agent-enabled"],
    queryFn: async () => {
      const items = await listAgentEnabledTemplates();
      // Diagnóstico: logamos quantos templates voltaram. Útil quando o
      // operador relata "modal vazia": confirma se backend retornou lista
      // (sinal de `agentEnabled=false` em todos) ou se a chamada falhou
      // antes mesmo de montar a UI.
      console.info("[templates] agent-enabled returned", items?.length ?? 0, "items");
      return items;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isError) {
    console.error("[templates] agent-enabled fetch failed", error);
  }

  const sendMutation = useMutation({
    mutationFn: (tpl: WhatsappTemplate) =>
      sendTemplate(conversationId, {
        // O backend espera o nome canônico WABA em `templateName`. Quando
        // `metaTemplateName` está disponível (caminho normal), preferimos
        // ele — `tpl.name` pode ter sido derivado do `label`, que é só
        // exibição e não casa com o template aprovado na Graph.
        templateName: tpl.metaTemplateName ?? tpl.name,
        bodyPreview: tpl.body,
        // Garante que o backend mapeie pro template correto na Graph
        // mesmo quando há ambiguidade de nome entre orgs.
        templateGraphId: tpl.metaTemplateId ?? null,
      }),
    onSuccess: () => {
      toast.success("Template enviado");
      qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      onClose?.();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Falha ao enviar template"),
  });

  return (
    <div
      style={{ backgroundColor: "var(--dropdown-solid-bg)" }}
      className="w-80 max-h-96 overflow-y-auto rounded-[var(--radius-lg)] border border-border p-2 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Templates WhatsApp
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Fechar
          </button>
        ) : null}
      </div>
      {isLoading ? (
        <div className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
          Carregando...
        </div>
      ) : isError ? (
        <div className="px-2 py-3 text-center text-xs text-[var(--color-danger)]">
          Falha ao carregar templates
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {(error as Error)?.message ?? "Tente novamente."}
          </div>
        </div>
      ) : !data?.length ? (
        <div className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
          Nenhum template habilitado para este agente.
          <div className="mt-1 text-[11px] text-[var(--text-muted)]/70">
            Habilite em Configurações &gt; Templates do WhatsApp.
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {data.map((tpl) => (
            <TemplateItemWithConfirm
              key={tpl.id}
              tpl={tpl}
              conversationId={conversationId}
              onSend={() => sendMutation.mutate(tpl)}
              onPick={
                onPick
                  ? () => {
                      onPick(tpl);
                      onClose?.();
                    }
                  : undefined
              }
              isPending={sendMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
