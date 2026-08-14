"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconCopy, IconLoader2, IconWebhook } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

import { getApi4ComIntegration, updateApi4ComIntegration } from "../api/extensions";

export function Api4ComIntegrationForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["api4com-integration"],
    queryFn: getApi4ComIntegration,
  });

  const [token, setToken] = useState("");
  const [gateway, setGateway] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data?.gateway) setGateway(data.gateway);
  }, [data?.gateway]);

  const mutation = useMutation({
    mutationFn: () =>
      updateApi4ComIntegration({
        serviceToken: token.trim() ? token.trim() : undefined,
        gateway: gateway.trim(),
      }),
    onSuccess: () => {
      setToken("");
      queryClient.invalidateQueries({ queryKey: ["api4com-integration"] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <IconLoader2 size={14} className="animate-spin" />
        Carregando integração da organização…
      </div>
    );
  }

  const webhookUrl = data.webhookUrl;
  const tokenReady = data.hasServiceToken || data.hasEnvToken;

  async function copyUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-1.5">
        <Label>Token ADMIN da API4Comm</Label>
        <PasswordInput
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={data.hasServiceToken ? "Token salvo nesta org — cole outro para trocar" : "Cole o token ADMIN (ttl -1)"}
          autoComplete="off"
        />
        <p className="text-[12px] text-[var(--text-muted)]">
          {data.hasServiceToken
            ? "Token da organização já está salvo. O valor não é exibido de novo."
            : data.hasEnvToken
              ? "Nenhum token nesta org — o backend ainda usa o token do ambiente como fallback."
              : "Obrigatório para criar usuários e ramais pelo CRM. Gere em POST /users/accessTokens com ttl -1."}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label>Gateway da integração</Label>
        <InputGlass
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
          placeholder="crm-integrado"
        />
        <p className="text-[12px] text-[var(--text-muted)]">
          Identificador enviado no webhook e em cada discagem. Precisa ser o mesmo nos dois lados.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label>Webhook desta organização</Label>
        <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-2">
          <IconWebhook size={14} className="shrink-0 text-[var(--text-muted)]" />
          <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--text-primary)]">
            {webhookUrl || "URL ainda sem domínio público (NEXT_PUBLIC_APP_URL)"}
          </code>
          <ButtonGlass type="button" variant="glass" size="sm" onClick={() => void copyUrl()} className="shrink-0">
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? "Copiado" : "Copiar"}
          </ButtonGlass>
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">
          Criado automaticamente para esta org. Ao salvar o token, o CRM registra essa URL na API4Comm
          (eventos channel-answer e channel-hangup).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs ${tokenReady ? "text-[var(--color-success)]/80" : "text-[var(--color-warning)]/80"}`}
        >
          {tokenReady ? "Token pronto" : "Token pendente"}
        </span>
        {data.webhookRegistered === true && (
          <span className="text-xs text-[var(--color-success)]/80">Webhook registrado na API4Comm</span>
        )}
        {data.webhookError && (
          <span className="text-xs text-[var(--color-danger)]" title={data.webhookError}>
            Falha ao registrar webhook
          </span>
        )}
      </div>

      {mutation.isError && (
        <p className="text-[11px] text-[var(--color-danger)]">{(mutation.error as Error).message}</p>
      )}

      <div>
        <ButtonGlass type="submit" variant="primary" size="sm" disabled={mutation.isPending}>
          {mutation.isPending && <IconLoader2 size={12} className="animate-spin" />}
          Salvar integração
        </ButtonGlass>
      </div>
    </form>
  );
}
