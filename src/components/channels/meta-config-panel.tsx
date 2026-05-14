"use client";

import { apiUrl } from "@/lib/api";
import { Check, Copy, ExternalLink, Eye, EyeOff, Loader2, RefreshCw, ShieldCheck, ShieldOff, Webhook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEmbeddedSignup } from "@/hooks/use-embedded-signup";

import type { ApiChannel } from "./types";
import { parseChannelConfigRecord } from "./types";

function maskSecret(value: string): string {
  const t = value.trim();
  if (t.length <= 8) return "••••••••";
  return `••••••••${t.slice(-4)}`;
}

/**
 * Gera verifyToken random de 40 chars (alfanumerico). Meta aceita ate
 * 256 chars; 40 da entropia mais que suficiente sem ficar gigante na UI.
 */
function generateVerifyToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(40);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

const META_DOCS_URL =
  "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started";

type StatusResponse = { status: string; phoneNumber?: string };

async function fetchStatus(channelId: string): Promise<StatusResponse> {
  const res = await fetch(apiUrl(`/api/channels/${channelId}/status`));
  const data = (await res.json()) as StatusResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? "Erro ao testar conexão.");
  }
  return data;
}

export type MetaConfigPanelProps = {
  channel: ApiChannel;
  onSaved?: () => void;
};

export function MetaConfigPanel({ channel, onSaved }: MetaConfigPanelProps) {
  const queryClient = useQueryClient();
  const cfg = useMemo(
    () => parseChannelConfigRecord(channel.config),
    [channel.config]
  );

  const initialToken = typeof cfg.accessToken === "string" ? cfg.accessToken : "";
  const initialPnId =
    typeof cfg.phoneNumberId === "string" ? cfg.phoneNumberId : "";
  const initialWaba =
    typeof cfg.businessAccountId === "string" ? cfg.businessAccountId : "";
  const initialAppName =
    typeof cfg.appName === "string" ? cfg.appName : "";
  const initialAppSecret =
    typeof cfg.appSecret === "string" ? cfg.appSecret : "";
  const initialVerifyToken =
    typeof cfg.verifyToken === "string" ? cfg.verifyToken : "";
  const wasEmbeddedSignup = cfg.embeddedSignup === true;

  const [channelName, setChannelName] = useState(channel.name);
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState(initialVerifyToken);
  const [phoneNumberId, setPhoneNumberId] = useState(initialPnId);
  const [businessAccountId, setBusinessAccountId] = useState(initialWaba);
  const [appName, setAppName] = useState(initialAppName);
  const [showTokenHint, setShowTokenHint] = useState(!!initialToken);
  const [revealAccessToken, setRevealAccessToken] = useState(false);
  const [revealAppSecret, setRevealAppSecret] = useState(false);
  const [esReconnecting, setEsReconnecting] = useState(false);
  const [esError, setEsError] = useState<string | null>(null);
  const [esSuccess, setEsSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const embeddedSignup = useEmbeddedSignup();

  useEffect(() => {
    setChannelName(channel.name);
    setPhoneNumberId(initialPnId);
    setBusinessAccountId(initialWaba);
    setAppName(initialAppName);
    setAccessToken("");
    setAppSecret("");
    setVerifyToken(initialVerifyToken);
    setShowTokenHint(!!initialToken);
  }, [channel.id, channel.name, initialPnId, initialWaba, initialAppName, initialToken, initialAppSecret, initialVerifyToken]);

  const webhookBase =
    typeof window !== "undefined" ? window.location.origin : "";

  // URL scoped por org (rota nova multi-tenant). Quando organizationSlug nao
  // veio (channel antigo carregado de cache?), cai pra rota legacy ate o
  // proximo refetch. Apos Deploy 2 a rota legacy sai e isso vira erro
  // visivel — desejavel pra forcar refresh do cache.
  const webhookUrl = channel.organizationSlug
    ? `${webhookBase}/api/webhooks/meta/${channel.organizationSlug}`
    : `${webhookBase}/api/webhooks/meta`;

  const copyToClipboard = (value: string, fieldName: string) => {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  const testQuery = useQuery({
    queryKey: ["channel-status-test", channel.id],
    enabled: false,
    queryFn: () => fetchStatus(channel.id),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextConfig = {
        ...cfg,
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        appName: appName.trim() || undefined,
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
        ...(appSecret.trim() ? { appSecret: appSecret.trim() } : {}),
        ...(verifyToken.trim() ? { verifyToken: verifyToken.trim() } : {}),
      };
      const res = await fetch(apiUrl(`/api/channels/${channel.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: channelName.trim(), config: nextConfig }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro ao salvar.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channels"] });
      void queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      setAccessToken("");
      setShowTokenHint(true);
      onSaved?.();
    },
  });

  const statusOk = testQuery.data?.status === "CONNECTED";
  const statusBad = testQuery.data?.status === "FAILED";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Meta Cloud API
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Credenciais do WhatsApp Business Platform. Os tokens são armazenados de
          forma segura; valores atuais aparecem mascarados.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <p className="font-medium text-foreground">Configuração atual</p>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li className="flex justify-between gap-2">
            <span>Access Token</span>
            <span className="font-mono text-xs text-foreground">
              {initialToken ? maskSecret(initialToken) : "—"}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Phone Number ID</span>
            <span className="font-mono text-xs text-foreground">
              {initialPnId || "—"}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Business Account ID</span>
            <span className="font-mono text-xs text-foreground">
              {initialWaba || "—"}
            </span>
          </li>
          {!wasEmbeddedSignup && (
            <li className="flex justify-between gap-2">
              <span>App Secret</span>
              <span className="font-mono text-xs text-foreground">
                {initialAppSecret ? maskSecret(initialAppSecret) : "—"}
              </span>
            </li>
          )}
          {wasEmbeddedSignup && (
            <li className="flex justify-between gap-2">
              <span>Origem</span>
              <span className="text-xs text-foreground">
                Embedded Signup (App Secret via Integrações)
              </span>
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-sm dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <Webhook className="size-5 shrink-0 text-blue-600" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-foreground">Webhook desta organizacao</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Configure ESTA URL e ESTE token no painel Meta (developers.facebook.com → seu app → WhatsApp → Configuracao).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Callback URL
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 px-3"
                  onClick={() => copyToClipboard(webhookUrl, "url")}
                  title="Copiar URL"
                >
                  {copiedField === "url" ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
              {!channel.organizationSlug ? (
                <p className="text-xs text-amber-600">
                  Organization slug ausente — recarregue a pagina.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verify Token
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Clique em 'Gerar' pra criar um token aleatorio"
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-3 text-xs"
                  onClick={() => setVerifyToken(generateVerifyToken())}
                  title="Gerar token aleatorio"
                >
                  Gerar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 px-3"
                  disabled={!verifyToken.trim()}
                  onClick={() => copyToClipboard(verifyToken, "token")}
                  title="Copiar token"
                >
                  {copiedField === "token" ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole o mesmo valor no campo &quot;Verify Token&quot; do painel Meta. Salve o canal aqui ANTES de clicar em &quot;Verify and save&quot; no painel da Meta.
              </p>
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium hover:text-foreground">
                Como configurar no painel Meta?
              </summary>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>Salve o canal aqui (botao &quot;Salvar&quot; abaixo) — verifyToken e appSecret precisam estar gravados no banco antes da Meta tentar verificar.</li>
                <li>No painel Meta: <span className="font-mono">developers.facebook.com</span> → seu app → WhatsApp → Configuracao.</li>
                <li>Em &quot;Webhook&quot; clique em &quot;Editar&quot;, cole a URL e o token acima e clique em &quot;Verify and save&quot;.</li>
                <li>Subscreva o campo <span className="font-mono">messages</span> (e <span className="font-mono">calls</span> se usar ligacoes).</li>
              </ol>
            </details>
          </div>
        </div>
      </div>

      {embeddedSignup.isConfigured ? (
        <>
          <Separator />
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {wasEmbeddedSignup ? "Reconectar" : "Conectar"} via Facebook
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {wasEmbeddedSignup
                  ? "Atualize o token e credenciais automaticamente."
                  : "Obtenha credenciais automaticamente via Embedded Signup."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={esReconnecting}
              onClick={() => {
                setEsError(null);
                setEsSuccess(false);
                setEsReconnecting(true);
                embeddedSignup
                  .launchSignup()
                  .then(async (result) => {
                    const res = await fetch(apiUrl("/api/channels/embedded-signup"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        code: result.code,
                        phoneNumberId: result.phoneNumberId,
                        wabaId: result.wabaId,
                        channelId: channel.id,
                      }),
                    });
                    const data = (await res.json()) as { message?: string };
                    if (!res.ok) throw new Error(data.message ?? "Erro.");
                    setEsSuccess(true);
                    void queryClient.invalidateQueries({ queryKey: ["channels"] });
                    void queryClient.invalidateQueries({
                      queryKey: ["channel", channel.id],
                    });
                    onSaved?.();
                  })
                  .catch((err: unknown) => {
                    setEsError(
                      err instanceof Error ? err.message : "Erro no Embedded Signup.",
                    );
                  })
                  .finally(() => setEsReconnecting(false));
              }}
            >
              {esReconnecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {wasEmbeddedSignup ? "Reconectar com Facebook" : "Conectar com Facebook"}
            </Button>
            {esError ? (
              <p className="text-sm text-destructive">{esError}</p>
            ) : null}
            {esSuccess ? (
              <p className="text-sm text-[#22c55e]">
                Credenciais atualizadas com sucesso.
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="meta-channel-name">Nome do Canal</Label>
          <Input
            id="meta-channel-name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Ex: WhatsApp Marketing, WhatsApp Vendas"
          />
          <p className="text-xs text-muted-foreground">
            Identificação interna do canal. Exibido nas conversas para o agente saber a origem.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-app-name">Nome do App (fonte do contato)</Label>
          <Input
            id="meta-app-name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Ex: WhatsApp Eduit, WhatsApp Comercial"
          />
          <p className="text-xs text-muted-foreground">
            Nome exibido como "Fonte" no contato quando criado por esta conexão.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-access-token">Access Token</Label>
          <div className="flex gap-2">
            <Input
              id="meta-access-token"
              name="metaAccessToken"
              type={revealAccessToken ? "text" : "password"}
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              spellCheck={false}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={
                showTokenHint
                  ? "Deixe em branco para manter o token atual"
                  : "Cole o token (começa com EAA...)"
              }
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => setRevealAccessToken((v) => !v)}
              title={revealAccessToken ? "Ocultar" : "Mostrar"}
              aria-label={revealAccessToken ? "Ocultar token" : "Mostrar token"}
            >
              {revealAccessToken ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
          {accessToken && accessToken.length < 50 ? (
            <p className="text-xs text-amber-600">
              Atenção: token muito curto ({accessToken.length} caracteres). Tokens válidos da Meta começam com <span className="font-mono">EAA</span> e têm 200+ caracteres.
            </p>
          ) : null}
          {showTokenHint && initialToken ? (
            <p className="text-xs text-muted-foreground">
              Valor salvo: <span className="font-mono">{maskSecret(initialToken)}</span>
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-pnid">Phone Number ID</Label>
          <Input
            id="meta-pnid"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-waba">Business Account ID</Label>
          <Input
            id="meta-waba"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
          />
        </div>
        {wasEmbeddedSignup ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Este canal foi conectado via Embedded Signup. O App Secret é gerenciado
              em <span className="font-medium text-foreground">Configurações → Integrações</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="meta-app-secret">App Secret do seu App</Label>
            <div className="flex gap-2">
              <Input
                id="meta-app-secret"
                name="metaAppSecret"
                type={revealAppSecret ? "text" : "password"}
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                spellCheck={false}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={
                  initialAppSecret
                    ? "Deixe em branco para manter o valor atual"
                    : "Chave secreta do seu app Meta (32 chars hex)"
                }
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-3"
                onClick={() => setRevealAppSecret((v) => !v)}
                title={revealAppSecret ? "Ocultar" : "Mostrar"}
                aria-label={revealAppSecret ? "Ocultar app secret" : "Mostrar app secret"}
              >
                {revealAppSecret ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            {initialAppSecret ? (
              <p className="text-xs text-muted-foreground">
                Valor salvo: <span className="font-mono">{maskSecret(initialAppSecret)}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Configurações → Básico no painel do seu app Meta. Necessário para verificar webhooks vindos do seu app.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void testQuery.refetch()}
          disabled={testQuery.isFetching}
        >
          {testQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Testar Conexão
        </Button>
        {testQuery.data ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              statusOk && "text-[#22c55e]",
              statusBad && "text-destructive",
              !statusOk && !statusBad && "text-muted-foreground"
            )}
          >
            {statusOk ? (
              <>
                <ShieldCheck className="size-4" />
                Conexão OK
              </>
            ) : statusBad ? (
              <>
                <ShieldOff className="size-4" />
                Falha na verificação
              </>
            ) : (
              <>Status: {testQuery.data.status}</>
            )}
          </span>
        ) : null}
      </div>

      <Separator />

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-medium text-foreground">WhatsApp Calling API</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          No Meta App, subscreva o webhook <code className="rounded bg-muted px-1">calls</code> além de{" "}
          <code className="rounded bg-muted px-1">messages</code>. Ative chamadas nas configurações do número de
          negócio e use um token com os escopos exigidos pela Meta para Calling. Este CRM grava eventos na conversa
          WhatsApp e oferece{" "}
          <code className="rounded bg-muted px-1">POST /api/conversations/{"{id}"}/whatsapp-calls</code> para o fluxo
          WebRTC (SDP offer / pre_accept / accept / reject / terminate).
        </p>
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/calling"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Documentação oficial — Calling
          <ExternalLink className="size-3" />
        </a>
      </div>

      <a
        href={META_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Documentação Meta Business / Cloud API
        <ExternalLink className="size-3.5" />
      </a>

      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        Salvar alterações
      </Button>

      {saveMutation.isError ? (
        <p className="text-sm text-destructive">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : "Erro ao salvar."}
        </p>
      ) : null}
    </div>
  );
}
