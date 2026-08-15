"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconCopy, IconLoader2 } from "@tabler/icons-react";

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
        Carregando…
      </div>
    );
  }

  const tokenReady = data.hasServiceToken || data.hasEnvToken;
  const webhookUrl = data.webhookUrl;

  async function copyUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-1.5">
        <Label>Token ADMIN</Label>
        <PasswordInput
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={data.hasServiceToken ? "Salvo — cole outro para trocar" : "Cole o token"}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Gateway</Label>
        <InputGlass
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
          placeholder="crm-eduit"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Webhook</Label>
        <div className="flex min-w-0 items-center gap-2">
          <InputGlass
            readOnly
            value={webhookUrl || "Defina NEXT_PUBLIC_APP_URL para gerar a URL"}
            className="min-w-0 flex-1 font-mono text-[12px]"
          />
          <ButtonGlass type="button" variant="glass" size="sm" onClick={() => void copyUrl()} className="shrink-0">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? "Copiado" : "Copiar"}
          </ButtonGlass>
        </div>
      </div>

      {mutation.isError && (
        <p className="text-[12px] text-[var(--color-danger)]">{(mutation.error as Error).message}</p>
      )}
      {data.webhookError && (
        <p className="text-[12px] text-[var(--color-danger)]" title={data.webhookError}>
          Falha ao registrar webhook
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span
          className={`text-[12px] ${tokenReady ? "text-[var(--color-success)]/80" : "text-[var(--color-warning)]/80"}`}
        >
          {tokenReady
            ? data.webhookRegistered
              ? "Conectado"
              : "Token salvo"
            : "Token pendente"}
        </span>
        <ButtonGlass type="submit" variant="primary" size="sm" disabled={mutation.isPending}>
          {mutation.isPending && <IconLoader2 size={12} className="animate-spin" />}
          Salvar
        </ButtonGlass>
      </div>
    </form>
  );
}
