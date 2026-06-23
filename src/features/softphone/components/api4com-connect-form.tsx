"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBrandTelegram,
  IconCheck,
  IconCopy,
  IconLoader2,
} from "@tabler/icons-react";

import { connectApi4Com, type ConnectApi4ComResponse } from "../api/extensions";
import { useSoftphone } from "../hooks/use-softphone";

/**
 * Bloco de feedback pós-conexão — extraído pra que o discriminated
 * union do `webhook.configured` seja estreitado corretamente DENTRO
 * desta função. Inline no JSX, o TS perde o narrowing quando a
 * referência foge pra dentro de closures (ex.: onClick do botão de
 * copiar usa `webhook.webhookUrl`).
 */
function SuccessFeedback({
  data,
  copied,
  onCopy,
}: {
  data: ConnectApi4ComResponse;
  copied: boolean;
  onCopy: (url: string) => void;
}) {
  const { api4com, webhook } = data;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-emerald-400">
        Conectado! Ramal: {api4com.ramal} ({api4com.domain}). O softphone
        está se registrando — acompanhe o chip no canto inferior direito.
      </p>

      {webhook.configured ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
          <IconCheck size={12} stroke={2.5} />
          Webhook de chamadas configurado automaticamente — o histórico em
          /calls vai registrar cada ligação.
        </p>
      ) : (
        <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-amber-400/40 bg-amber-500/10 p-3 text-amber-100">
          <div className="inline-flex items-start gap-1.5 text-xs">
            <IconAlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>Setup manual do webhook necessário.</strong> Não
              conseguimos configurar automaticamente: {webhook.reason}
            </span>
          </div>
          <p className="text-xs">
            Cole esta URL no portal Api4Com →{" "}
            <em>Integrações → Webhook</em> (eventos:{" "}
            <code>channel-answer</code>, <code>channel-hangup</code>):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-black/30 px-2 py-1 font-mono text-[11px]">
              {webhook.webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => onCopy(webhook.webhookUrl)}
              className="inline-flex h-7 items-center gap-1 rounded bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20"
              title="Copiar URL"
            >
              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-[11px] opacity-80">
            Sem isso, as chamadas funcionam mas não aparecem na lista
            /calls. Após colar a URL, próximas ligações serão registradas.
          </p>
        </div>
      )}
    </div>
  );
}

export function Api4ComConnectForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();
  const softphone = useSoftphone();

  const mutation = useMutation({
    mutationFn: () => connectApi4Com(email, password),
    onSuccess: async () => {
      // 1. Atualiza o cache de credenciais — o SoftphoneWidget
      //    escuta esse query e dispara o connect() automaticamente
      //    quando o `data` chega.
      await queryClient.invalidateQueries({ queryKey: ["softphone", "credentials"] });

      // 2. Se por algum motivo o widget não estiver montado nesta
      //    rota (defensivo — hoje vive no layout global), garante
      //    que o registro SIP suba imediatamente sem precisar de F5.
      void softphone.connect();
    },
  });

  const copyWebhookUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard pode falhar em http (não-https). Usuário pode
      // selecionar manualmente no <code> ainda.
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email && password) mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        Informe suas credenciais Api4Com. O CRM detectará automaticamente o ramal vinculado ao seu e-mail.
      </p>

      <input
        type="email"
        placeholder="E-mail Api4Com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      />

      <input
        type="password"
        placeholder="Senha Api4Com"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      />

      {mutation.isError && (
        <p className="text-xs text-red-400">
          {(mutation.error as Error)?.message ?? "Falha ao conectar"}
        </p>
      )}

      {mutation.isSuccess && <SuccessFeedback data={mutation.data} copied={copied} onCopy={copyWebhookUrl} />}

      <button
        type="submit"
        disabled={!email || !password || mutation.isPending}
        className="flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : (
          <IconBrandTelegram size={14} />
        )}
        Conectar Api4Com
      </button>
    </form>
  );
}
