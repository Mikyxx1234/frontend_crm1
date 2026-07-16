"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InputGlass } from "@/components/crm/input-glass";
import {
  IconAlertTriangle,
  IconBrandTelegram,
  IconCheck,
  IconCopy,
  IconLoader2,
  IconLogout,
  IconPencil,
  IconPhoneCheck,
} from "@tabler/icons-react";

import {
  connectApi4Com,
  disconnectApi4Com,
  getApi4ComStatus,
  type Api4ComStatus,
  type ConnectApi4ComResponse,
} from "../api/extensions";
import { useSoftphone } from "../hooks/use-softphone";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ButtonGlass } from "@/components/crm/button-glass";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

/** Inputs "soft" do alvo: fundo cinza suave, sem borda, radius grande. */
const SOFT_INPUT = "rounded-[var(--radius-lg)] border-transparent bg-[var(--glass-bg-subtle)]";

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
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-pretty break-words text-xs text-[var(--color-success)]/80">
        Conectado! Ramal: {api4com.ramal} ({api4com.domain}). O softphone
        está se registrando — acompanhe o chip no canto inferior direito.
      </p>

      {!webhook && (
        <p className="inline-flex items-start gap-1.5 text-pretty break-words text-xs text-[var(--color-warning)]/80">
          <IconAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          Webhook de chamadas não está configurado. Atualize o backend
          (commit 269af93+) e reconecte pra que ligações aparecem em /calls.
        </p>
      )}

      {webhook?.configured ? (
        <p className="inline-flex items-start gap-1.5 text-pretty break-words text-xs text-[var(--color-success)]/80">
          <IconCheck size={12} stroke={2.5} className="mt-0.5 flex-shrink-0" />
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
    <div className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] p-3">
      <div className="flex min-w-0 items-start gap-1.5 text-xs text-[var(--text-primary)]">
        <IconAlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--color-warning)]" />
        <span className="min-w-0 text-pretty break-words">
          <strong>Setup manual do webhook necessário.</strong> Não
          conseguimos configurar automaticamente: {reason}
        </span>
      </div>
      <p className="text-pretty break-words text-xs text-[var(--text-secondary)]">
        Cole esta URL no portal Api4Com →{" "}
        <em>Integrações → Webhook</em> (eventos:{" "}
        <code>channel-answer</code>, <code>channel-hangup</code>):
      </p>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2 py-1 font-mono text-[11px] text-[var(--text-primary)]">
          {webhookUrl}
        </code>
        <button
          type="button"
          onClick={() => onCopy(webhookUrl)}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          title="Copiar URL"
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="text-pretty break-words text-[11px] text-[var(--text-muted)]">
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
  onDisconnect,
  disconnecting,
}: {
  status: Api4ComStatus;
  copied: boolean;
  onCopy: (url: string) => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] p-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <IconPhoneCheck size={16} className="mt-0.5 flex-shrink-0 text-[var(--color-success)]" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="min-w-0 break-words text-pretty text-sm font-medium text-[var(--text-primary)]">
                Conectado{status.email ? ` como ${status.email}` : ""}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Ramal <strong>{status.ramal ?? "—"}</strong>
                {status.domain ? ` (${status.domain})` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:shrink-0">
            <ButtonGlass
              variant="glass"
              size="sm"
              onClick={onReconnect}
              disabled={disconnecting}
              title="Trocar de conta ou re-autenticar"
            >
              <IconPencil size={13} />
              Reconectar
            </ButtonGlass>
            <ButtonGlass
              variant="glass"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="!border-[var(--color-danger)]/30 !bg-[var(--color-danger)]/10 !text-[var(--color-danger)] hover:!bg-[var(--color-danger)]/20"
              title="Apaga o ramal salvo. Você poderá reconectar depois com outra conta."
            >
              {disconnecting ? (
                <IconLoader2 size={13} className="animate-spin" />
              ) : (
                <IconLogout size={13} />
              )}
              Desconectar
            </ButtonGlass>
          </div>
        </div>
      </div>

      {status.webhook.configured ? (
        <p className="inline-flex items-start gap-1.5 text-pretty break-words text-xs text-[var(--color-success)]/80">
          <IconCheck size={12} stroke={2.5} className="mt-0.5 flex-shrink-0" />
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
        <p className="inline-flex items-start gap-1.5 text-pretty break-words text-xs text-[var(--color-warning)]/80">
          <IconAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          Webhook de chamadas não configurado. Clique em &quot;Reconectar&quot;
          para tentar a configuração automática novamente.
        </p>
      )}
    </div>
  );
}

/**
 * Card "Status da conexão" — mostra o estado atual do ramal Api4Com.
 * Conectado → banner verde (ConnectedSummary) + linha do webhook.
 * Desconectado → aviso curto direcionando à Configuração do ramal.
 * "Reconectar" delega ao pai (`onReconnect`) para focar o form Api4Com.
 */
export function Api4ComStatusCard({ onReconnect }: { onReconnect?: () => void }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const softphone = useSoftphone();
  const { confirm, dialog } = useConfirm();

  const statusQuery = useQuery({
    queryKey: ["softphone", "api4com-status"],
    queryFn: getApi4ComStatus,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Desconectar = DELETE /api/sip-extensions/me + reset de caches +
  // hangup do JsSIP em runtime (sem isso o chip do softphone fica preso
  // como "Registered" no ramal antigo até o operador dar F5).
  const disconnectMutation = useMutation({
    mutationFn: disconnectApi4Com,
    onSuccess: async () => {
      // 1. Desliga o UA do JsSIP — sem isso o ramal antigo continua
      //    registrado e atende ligações.
      try {
        softphone.disconnect?.();
      } catch {
        /* fail-silent — hook pode não ter o método ainda */
      }
      // 2. Limpa cache de credenciais (404 vai começar a aparecer em
      //    GET /me/credentials, e o SoftphoneWidget para de tentar
      //    conectar automaticamente).
      queryClient.removeQueries({ queryKey: ["softphone", "credentials"] });
      // 3. Atualiza status pra mostrar o estado desconectado imediatamente.
      queryClient.setQueryData<Api4ComStatus>(["softphone", "api4com-status"], {
        connected: false,
        email: null,
        ramal: null,
        domain: null,
        webhook: { configured: false, webhookUrl: null },
      });
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

  if (statusQuery.isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <IconLoader2 size={12} className="animate-spin" />
        Carregando status do softphone…
      </div>
    );
  }

  const status = statusQuery.data;

  if (!status?.connected) {
    return (
      <div className="flex min-w-0 items-start gap-2 rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)] px-3.5 py-3 text-[13px] text-[var(--text-secondary)]">
        <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
        <span className="min-w-0 text-pretty break-words">
          Nenhum ramal conectado. Configure abaixo em{" "}
          <strong>Configuração do ramal</strong> para começar a fazer e receber
          chamadas.
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-2">
      <ConnectedSummary
        status={status}
        copied={copied}
        onCopy={copyUrl}
        onReconnect={() => onReconnect?.()}
        onDisconnect={async () => {
          const ok = await confirm({
            title: "Desconectar sua conta Api4Com?",
            description:
              "O ramal salvo será apagado e você precisará informar e-mail + senha de novo pra usar telefonia. Chamadas em andamento serão encerradas.",
            confirmLabel: "Desconectar",
            destructive: true,
          });
          if (ok) disconnectMutation.mutate();
        }}
        disconnecting={disconnectMutation.isPending}
      />
      {disconnectMutation.isError && (
        <p className="text-xs text-[var(--color-danger)]">
          {(disconnectMutation.error as Error)?.message ?? "Falha ao desconectar"}
        </p>
      )}
      {dialog}
    </div>
  );
}

/**
 * Formulário de conexão Api4Com (e-mail + senha) — vive no card
 * "Configuração do ramal" quando o tipo Api4Com está selecionado.
 * Quando já há conexão, o botão vira "Reconectar" e o e-mail salvo é
 * pré-preenchido.
 */
export function Api4ComConnectForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

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
      // 4. Limpa senha do state.
      setPassword("");
    },
  });

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard pode falhar em http (não-https). */
    }
  };

  // Pré-preenche o e-mail salvo (reconexão / troca de conta).
  useEffect(() => {
    if (statusQuery.data?.email && !email) {
      setEmail(statusQuery.data.email);
    }
  }, [statusQuery.data?.email, email]);

  const status = statusQuery.data;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email && password) mutation.mutate();
      }}
      className="flex min-w-0 w-full flex-col gap-4"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label>E-mail Api4Com</Label>
        <InputGlass
          type="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={SOFT_INPUT}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label>Senha Api4Com</Label>
        <PasswordInput
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={SOFT_INPUT}
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-[var(--color-danger)]">
          {(mutation.error as Error)?.message ?? "Falha ao conectar"}
        </p>
      )}

      {mutation.isSuccess && (
        <ConnectSuccessFeedback data={mutation.data} copied={copied} onCopy={copyUrl} />
      )}

      <div className="flex justify-end">
        <ButtonGlass
          type="submit"
          variant="primary"
          disabled={!email || !password || mutation.isPending}
        >
          {mutation.isPending ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconBrandTelegram size={14} />
          )}
          {status?.connected ? "Reconectar" : "Conectar Api4Com"}
        </ButtonGlass>
      </div>
    </form>
  );
}
