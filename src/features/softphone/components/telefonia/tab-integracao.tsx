"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Copy, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getApi4ComIntegration, updateApi4ComIntegration } from "../../api/extensions";

export function TabIntegracao() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["api4com-integration"],
    queryFn: getApi4ComIntegration,
  });

  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");
  const [gateway, setGateway] = useState("");

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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Carregando…
      </div>
    );
  }

  const tokenSaved = data.hasServiceToken || data.hasEnvToken;
  const webhookUrl = data.webhookUrl;

  function copyWebhook() {
    if (!webhookUrl) return;
    void navigator.clipboard?.writeText(webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Field label="Token ADMIN" hint={tokenSaved ? "Salvo · cole outro para trocar" : undefined}>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={tokenSaved ? "••••••••••••••••••••" : "Cole o token de administrador"}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-border bg-secondary/60 pr-11 pl-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            aria-label={showToken ? "Ocultar token" : "Mostrar token"}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showToken ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </Field>

      <Field label="Gateway">
        <input
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
          placeholder="Api4Comm-Aad"
          className="h-11 w-full rounded-xl border border-border bg-secondary/60 px-4 font-mono text-sm text-foreground tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </Field>

      <Field label="Webhook" hint="Configure este endereço no painel do provedor.">
        <div className="flex items-stretch gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-border bg-secondary/60 px-4">
            <span className="truncate font-mono text-xs text-muted-foreground tabular-nums">
              {webhookUrl || "Defina NEXT_PUBLIC_APP_URL para gerar a URL"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={copyWebhook}
            disabled={!webhookUrl}
            className="h-11 shrink-0 rounded-xl px-3.5"
          >
            {copied ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </Field>

      {mutation.isError ? (
        <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
      ) : null}
      {data.webhookError ? (
        <p className="text-sm text-destructive" title={data.webhookError}>
          Falha ao registrar webhook
        </p>
      ) : null}

      <div className="mt-1 flex items-center justify-between border-t border-border pt-4">
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            tokenSaved ? "text-success" : "text-warning"
          }`}
        >
          {tokenSaved ? <Check className="size-4" aria-hidden="true" /> : null}
          {tokenSaved ? "Token salvo" : "Token pendente"}
        </span>
        <Button type="submit" size="lg" className="h-10 rounded-xl px-5" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
