"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBrandTelegram,
  IconCheck,
  IconCopy,
  IconLoader2,
  IconPencil,
  IconPhoneCheck,
} from "@tabler/icons-react";

import {
  connectApi4Com,
  getApi4ComStatus,
  type Api4ComStatus,
  type ConnectApi4ComResponse,
} from "../api/extensions";
import { useSoftphone } from "../hooks/use-softphone";

/**
 * Bloco de feedback pós-conexão — extraído pra que o discriminated
 * union do `webhook.configured` seja estreitado corretamente DENTRO
 * desta função. Inline no JSX, o TS perde o narrowing quando a
 * referência foge pra dentro de closures (ex.: onClick do botão de
 * copiar usa `webhook.webhookUrl`).
 */
function ConnectSuccessFeedback({
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

      {!webhook && (
        <p className="inline-flex items-center gap-1.5 text-xs text-amber-400">
          <IconAlertTriangle size={12} />
          Webhook de chamadas não está configurado. Atualize o backend
          (commit 269af93+) e reconecte pra que ligações aparecem em /calls.
        </p>
      )}

      {webhook?.configured ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
          <IconCheck size={12} stroke={2.5} />
          Webhook de chamadas configurado automaticamente — o histórico em
          /calls vai registrar cada ligação.
        </p>
      ) : webhook ? (
        <WebhookFallback
          webhookUrl={webhook.webhookUrl}
          reason={webhook.reason}
          copied={copied}
          onCopy={onCopy}
        />
      ) : null}
    </div>
  );
}

function WebhookFallback({
  webhookUrl,
  reason,
  copied,
  onCopy,
}: {
  webhookUrl: string;
  reason: string;
  copied: boolean;
  onCopy: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-amber-400/40 bg-amber-500/10 p-3 text-amber-100">
      <div className="inline-flex items-start gap-1.5 text-xs">
        <IconAlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Setup manual do webhook necessário.</strong> Não
          conseguimos configurar automaticamente: {reason}
        </span>
      </div>
      <p className="text-xs">
        Cole esta URL no portal Api4Com →{" "}
        <em>Integrações → Webhook</em> (eventos:{" "}
        <code>channel-answer</code>, <code>channel-hangup</code>):
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-black/30 px-2 py-1 font-mono text-[11px]">
          {webhookUrl}
        </code>
        <button
          type="button"
          onClick={() => onCopy(webhookUrl)}
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
  );
}

/**
 * Cabeçalho mostrado quando o operador JÁ está conectado (com ramal
 * salvo). Lê o estado via `GET /api/sip-extensions/me/api4com-status`
 * ao montar — sem isso, o operador via o form vazio toda vez e tinha
 * que reentrar email/senha pra confirmar que estava conectado.
 */
function ConnectedSummary({
  status,
  copied,
  onCopy,
  onReconnect,
}: {
  status: Api4ComStatus;
  copied: boolean;
  onCopy: (url: string) => void;
  onReconnect: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-emerald-400/30 bg-emerald-500/10 p-3 text-emerald-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <IconPhoneCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-300" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-emerald-50">
                Conectado{status.email ? ` como ${status.email}` : ""}
              </p>
              <p className="text-xs opacity-80">
                Ramal <strong>{status.ramal ?? "—"}</strong>
                {status.domain ? ` (${status.domain})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReconnect}
            className="inline-flex h-7 items-center gap-1 rounded bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20"
            title="Trocar de conta ou re-autenticar"
          >
            <IconPencil size={12} />
            Reconectar
          </button>
        </div>
      </div>

      {status.webhook.configured ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
          <IconCheck size={12} stroke={2.5} />
          Webhook de chamadas configurado — histórico em /calls registra
          cada ligação.
        </p>
      ) : status.webhook.webhookUrl ? (
        <WebhookFallback
          webhookUrl={status.webhook.webhookUrl}
          reason="Webhook ainda não confirmado pela Api4Com (provavelmente requer setup manual)."
          copied={copied}
          onCopy={onCopy}
        />
      ) : (
        <p className="inline-flex items-center gap-1.5 text-xs text-amber-400">
          <IconAlertTriangle size={12} />
          Webhook de chamadas não configurado. Clique em "Reconectar"
          para tentar a configuração automática novamente.
        </p>
      )}
    </div>
  );
}

export function Api4ComConnectForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  // `showForm` força mostrar o form mesmo quando há conexão ativa
  // (usuário clicou em "Reconectar" pra trocar conta).
  const [showForm, setShowForm] = useState(false);

  const queryClient = useQueryClient();
  const softphone = useSoftphone();

  const statusQuery = useQuery({
    queryKey: ["softphone", "api4com-status"],
    queryFn: getApi4ComStatus,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: () => connectApi4Com(email, password),
    onSuccess: async (data) => {
      // 1. Atualiza o cache de credenciais — o SoftphoneWidget
      //    escuta esse query e dispara o connect() automaticamente
      //    quando o `data` chega.
      await queryClient.invalidateQueries({ queryKey: ["softphone", "credentials"] });
      // 2. Atualiza o cache do status pra refletir email/ramal novos
      //    no próximo render (sem precisar refazer o GET manual).
      queryClient.setQueryData<Api4ComStatus>(["softphone", "api4com-status"], {
        connected: true,
        email,
        ramal: data.api4com.ramal,
        domain: data.api4com.domain,
        webhook: data.webhook?.configured
          ? { configured: true, webhookUrl: null }
          : {
              configured: false,
              webhookUrl: data.webhook?.webhookUrl ?? null,
            },
      });
      // 3. Se por algum motivo o widget não estiver montado nesta
      //    rota (defensivo — hoje vive no layout global), garante
      //    que o registro SIP suba imediatamente sem precisar de F5.
      void softphone.connect();
      // 4. Reseta UI de "Reconectar" e limpa senha do state.
      setPassword("");
      setShowForm(false);
    },
  });

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard pode falhar em http (não-https). Usuário pode
      // selecionar manualmente no <code> ainda.
    }
  };

  // Quando clica em "Reconectar", pré-preenche email salvo pra UX.
  useEffect(() => {
    if (showForm && statusQuery.data?.email && !email) {
      setEmail(statusQuery.data.email);
    }
  }, [showForm, statusQuery.data?.email, email]);

  // Estados de loading inicial — evita piscar o form vazio
  if (statusQuery.isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <IconLoader2 size={12} className="animate-spin" />
        Carregando status do softphone…
      </div>
    );
  }

  const status = statusQuery.data;
  const showConnectedView = status?.connected && !showForm;

  if (showConnectedView) {
    return (
      <ConnectedSummary
        status={status}
        copied={copied}
        onCopy={copyUrl}
        onReconnect={() => setShowForm(true)}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email && password) mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        {status?.connected
          ? "Reconectar Api4Com — informe a senha (e o e-mail se for trocar de conta)."
          : "Informe suas credenciais Api4Com. O CRM detectará automaticamente o ramal vinculado ao seu e-mail."}
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

      {mutation.isSuccess && (
        <ConnectSuccessFeedback data={mutation.data} copied={copied} onCopy={copyUrl} />
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!email || !password || mutation.isPending}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconBrandTelegram size={14} />
          )}
          {status?.connected ? "Reconectar" : "Conectar Api4Com"}
        </button>

        {status?.connected && showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setPassword("");
              mutation.reset();
            }}
            className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:bg-white/5"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
