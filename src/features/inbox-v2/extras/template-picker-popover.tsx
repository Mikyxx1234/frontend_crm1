"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  listAgentEnabledTemplates,
  sendTemplate,
  sendMessage,
  type WhatsappTemplate,
} from "@/features/inbox-v2/api";
import { messagesKey } from "@/features/inbox-v2/hooks";
import {
  interpolateInternalTemplate,
  type InternalTemplateContext,
} from "@/lib/internal-template-variables";
import { apiUrl } from "@/lib/api";

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
}: {
  conversationId: string;
  templateContext?: InternalTemplateContext;
  onClose?: () => void;
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
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Fechar
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
          Carregando...
        </div>
      ) : !data?.length ? (
        <div className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
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
                  onClick={() => sendMutation.mutate(tpl)}
                  className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left hover:bg-[var(--glass-bg-strong)] disabled:opacity-60"
                >
                  <div className="text-[12px] font-semibold text-[var(--text-primary)]">
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
 * `sendTemplate` ao clicar. Versao enxuta — sem preview de
 * components/flow (extensoes ficam pra uma 2a iteracao).
 */
export function TemplatePickerList({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose?: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: ["whatsapp-templates", "agent-enabled"],
    queryFn: listAgentEnabledTemplates,
    staleTime: 5 * 60_000,
  });

  const sendMutation = useMutation({
    mutationFn: (tpl: WhatsappTemplate) =>
      sendTemplate(conversationId, {
        templateName: tpl.name,
        bodyPreview: tpl.body,
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
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Fechar
          </button>
        ) : null}
      </div>
      {isLoading ? (
        <div className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
          Carregando...
        </div>
      ) : !data?.length ? (
        <div className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
          Nenhum template habilitado para este agente.
        </div>
      ) : (
        data.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate(tpl)}
            className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] disabled:opacity-60"
          >
            <div className="font-display text-[12px] font-bold text-[var(--text-primary)]">
              {tpl.name}
            </div>
            {tpl.body ? (
              <div className="mt-0.5 line-clamp-2 text-[11.5px] text-[var(--text-muted)]">
                {tpl.body}
              </div>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}
