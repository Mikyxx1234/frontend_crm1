"use client";

import { apiUrl } from "@/lib/api";
import type { ChannelProvider, ChannelType } from "@/lib/prisma-enum-types";
import { IconAt as AtSign, IconCheck as Check, IconChevronDown as ChevronDown, IconChevronLeft as ChevronLeft, IconCopy as Copy, IconExternalLink as ExternalLink, IconGlobe as Globe, IconLoader2 as Loader2, IconMail as Mail, IconMessageCircle as MessageCircle, IconQrcode as QrCode, IconShare2 as Share2, IconSparkles as Sparkles, IconWebhook as Webhook } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useEmbeddedSignup } from "@/hooks/use-embedded-signup";

type Step = 1 | 2 | 3;

const TYPES: {
  type: ChannelType;
  label: string;
  description: string;
  icon: typeof MessageCircle;
  cardClass: string;
}[] = [
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    description: "Mensagens e automações",
    icon: MessageCircle,
    cardClass:
      "border-[var(--channel-whatsapp)]/30 bg-[var(--channel-whatsapp)]/[0.06] hover:border-[var(--channel-whatsapp)]/50",
  },
  {
    type: "INSTAGRAM",
    label: "Instagram",
    description: "Direct e comentários",
    icon: AtSign,
    cardClass:
      "border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-violet-500/10 hover:border-pink-500/40",
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    description: "Messenger e páginas",
    icon: Share2,
    cardClass: "border-blue-600/25 bg-blue-600/5 hover:border-blue-600/40",
  },
  {
    type: "EMAIL",
    label: "E-mail",
    description: "Caixa compartilhada",
    icon: Mail,
      cardClass: "border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30",
  },
  {
    type: "WEBCHAT",
    label: "Webchat",
    description: "Widget no site",
    icon: Globe,
    cardClass: "border-cyan-500/25 bg-cyan-500/5 hover:border-cyan-500/40",
  },
];

function providerForType(
  _type: ChannelType,
  selected: ChannelProvider | null
): ChannelProvider {
  return selected ?? "META_CLOUD_API";
}

export type CreateChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function CreateChannelDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateChannelDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [channelType, setChannelType] = useState<ChannelType | null>(null);
  const [provider, setProvider] = useState<ChannelProvider | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualConfig, setShowManualConfig] = useState(false);
  // Webhook opcional para clientes que preferem usar o proprio App Meta:
  // "Webhook" gera Callback URL + Verify Token e persiste o token no
  // canal ao clicar "Criar canal" (Channel.config.verifyToken).
  const [webhookInfo, setWebhookInfo] = useState<{
    channelId: string;
    callbackUrl: string;
    verifyToken: string;
    webhookId: string;
    warning?: string | null;
  } | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // App Secret do App Meta proprio do cliente (necessario pra validar
  // assinatura x-hub-signature-256 dos POSTs recebidos). Coletado no modal
  // Webhook porque o fluxo manual usa o App Meta proprio do cliente.
  const [appSecret, setAppSecret] = useState("");

  const embeddedSignup = useEmbeddedSignup();

  function reset() {
    setStep(1);
    setChannelType(null);
    setProvider(null);
    setName("");
    setPhoneNumber("");
    setAccessToken("");
    setPhoneNumberId("");
    setBusinessAccountId("");
    setError(null);
    setSubmitting(false);
    setShowManualConfig(false);
    setWebhookInfo(null);
    setWebhookLoading(false);
    setWebhookModalOpen(false);
    setCopiedField(null);
    setAppSecret("");
    embeddedSignup.reset();
  }

  async function fetchWebhookInfo() {
    // Se ja temos, so reabre o modal.
    if (webhookInfo) {
      setWebhookModalOpen(true);
      return;
    }
    setWebhookLoading(true);
    setError(null);
    try {
      // POST pre-cria o canal em status CONNECTING pra que o handshake
      // Meta encontre o webhookId no banco no "Verify and save".
      const res = await fetch(apiUrl("/api/channels/meta/webhook-info"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = (await res.json()) as {
        channelId?: string;
        callbackUrl?: string;
        verifyToken?: string;
        webhookId?: string;
        warning?: string | null;
        message?: string;
      };
      if (
        !res.ok ||
        !data.channelId ||
        !data.callbackUrl ||
        !data.verifyToken ||
        !data.webhookId
      ) {
        throw new Error(data.message ?? "Falha ao gerar dados de webhook.");
      }
      setWebhookInfo({
        channelId: data.channelId,
        callbackUrl: data.callbackUrl,
        verifyToken: data.verifyToken,
        webhookId: data.webhookId,
        warning: data.warning ?? null,
      });
      setWebhookModalOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao gerar webhook.");
    } finally {
      setWebhookLoading(false);
    }
  }

  function copyToClipboard(value: string, field: string) {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function canAdvanceFromStep2(): boolean {
    if (!channelType) return false;
    return true;
  }

  async function handleEmbeddedSignup() {
    if (!name.trim()) {
      setError("Preencha o nome do canal antes de conectar.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await embeddedSignup.launchSignup();
      const res = await fetch(apiUrl("/api/channels/embedded-signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: result.code,
          phoneNumberId: result.phoneNumberId,
          wabaId: result.wabaId,
          name: name.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro no Embedded Signup.");
      }
      onCreated?.();
      handleOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro no Embedded Signup.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!channelType || !name.trim()) {
      setError("Preencha o nome do canal.");
      return;
    }
    const prov = providerForType(channelType, provider);

    // Meta Cloud API manual: usa a rota dedicada que provisiona o webhook
    // automaticamente (subscribed_apps no App Meta global do CRM) e retorna
    // o canal ja CONNECTED. Sem App Secret e sem passos manuais no painel Meta.
    if (prov === "META_CLOUD_API") {
      if (!accessToken.trim() || !phoneNumberId.trim() || !businessAccountId.trim()) {
        setError(
          "Preencha Token de acesso, ID do número de telefone e WABA ID.",
        );
        return;
      }
      // Se o usuario abriu o modal Webhook (App Meta proprio), o App Secret
      // e obrigatorio pra validar assinatura dos POSTs recebidos.
      if (webhookInfo && !appSecret.trim()) {
        setError(
          "Cole o App Secret do seu App Meta no botão Webhook antes de criar o canal.",
        );
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(apiUrl("/api/channels/manual-cloud"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            accessToken: accessToken.trim(),
            phoneNumberId: phoneNumberId.trim(),
            wabaId: businessAccountId.trim(),
            // Se o usuario abriu o painel Webhook, o canal ja foi
            // pre-criado (status CONNECTING) com webhookId+verifyToken.
            // Passar channelId aqui faz manual-cloud fazer UPDATE em vez
            // de criar duplicado.
            channelId: webhookInfo?.channelId,
            verifyToken: webhookInfo?.verifyToken,
            webhookId: webhookInfo?.webhookId,
            appSecret: appSecret.trim() || undefined,
          }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          throw new Error(data.message ?? "Erro ao conectar canal.");
        }
        onCreated?.();
        handleOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao conectar canal.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setError(null);
    const phonePayload =
      prov === "BAILEYS_MD" ? "" : phoneNumber.trim() || "";

    try {
      const res = await fetch(apiUrl("/api/channels"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: channelType,
          provider: prov,
          phoneNumber: phonePayload || undefined,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro ao criar canal.");
      }
      onCreated?.();
      handleOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar canal.");
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveProvider = channelType
    ? providerForType(channelType, provider)
    : null;

  const showEmbeddedSignup =
    effectiveProvider === "META_CLOUD_API" && embeddedSignup.isConfigured;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="lg"
        panelClassName="max-h-[90vh]"
        className="p-0"
      >
        <div className="p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--brand-primary)]" />
              Novo canal
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Escolha o tipo de canal."}
              {step === 2 && channelType === "WHATSAPP" && "Configure o provedor."}
              {step === 3 && "Finalize a configuração."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {step === 1 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {TYPES.map(({ type, label, description, icon: Icon, cardClass }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setChannelType(type);
                      if (type !== "WHATSAPP") setProvider("META_CLOUD_API");
                    }}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                      cardClass,
                      channelType === type
                        ? "ring-2 ring-[var(--brand-primary)] ring-offset-2"
                        : "opacity-90 hover:opacity-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-8",
                        type === "WHATSAPP" && "text-[var(--channel-whatsapp)]"
                      )}
                    />
                    <span className="font-semibold text-[var(--text-primary)]">{label}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {description}
                    </span>
                    {channelType === type ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)]">
                        <Check className="size-3.5" />
                        Selecionado
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {step === 2 && channelType === "WHATSAPP" ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setProvider("META_CLOUD_API")}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    "border-blue-500/20 bg-[var(--color-info)]/5 hover:border-blue-500/40",
                    provider === "META_CLOUD_API" &&
                      "ring-2 ring-[var(--brand-primary)] ring-offset-2"
                  )}
                >
                  <p className="font-semibold">Meta Cloud API (Oficial)</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    API oficial do WhatsApp Business. Requer token e IDs do Meta
                    Business. Templates, selo de verificado, cobrança por conversa.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("BAILEYS_MD")}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    "border-[var(--channel-whatsapp)]/20 bg-[var(--channel-whatsapp)]/5 hover:border-[var(--channel-whatsapp)]/40",
                    provider === "BAILEYS_MD" &&
                      "ring-2 ring-[var(--brand-primary)] ring-offset-2"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="size-5 text-[var(--channel-whatsapp)]" />
                    <p className="font-semibold">WhatsApp QR Code</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Conecte qualquer número via QR code. Sem templates, sem
                    verificação Meta. Rápido e direto.
                  </p>
                </button>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ch-name">Nome do canal</Label>
                  <Input
                    id="ch-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: WhatsApp Vendas"
                  />
                </div>

                {effectiveProvider === "META_CLOUD_API" ? (
                  <>
                    {showEmbeddedSignup ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border-2 border-blue-500/20 bg-[var(--color-info)]/5 p-4">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Conectar via Facebook
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            Obtenha credenciais automaticamente com login Meta.
                            Token, Phone ID e WABA ID são configurados de forma segura.
                          </p>
                          <Button
                            type="button"
                            className="mt-3 w-full gap-2 bg-[var(--channel-facebook)] text-white hover:bg-[var(--channel-facebook)]"
                            disabled={submitting || !name.trim()}
                            onClick={() => void handleEmbeddedSignup()}
                          >
                            {submitting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <svg
                                className="size-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                            )}
                            Conectar com Facebook
                          </Button>
                        </div>

                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          onClick={() => setShowManualConfig(!showManualConfig)}
                        >
                          <ChevronDown
                            className={cn(
                              "size-3.5 transition-transform",
                              showManualConfig && "rotate-180",
                            )}
                          />
                          Ou configure manualmente
                        </button>

                        {showManualConfig ? (
                          <div className="space-y-3 rounded-lg border bg-[var(--glass-bg-overlay)] p-3">
                            <div className="space-y-2">
                              <Label htmlFor="ch-token">Access Token</Label>
                              <Input
                                id="ch-token"
                                type="password"
                                autoComplete="off"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                placeholder="Token permanente ou de sistema"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ch-pnid">Phone Number ID</Label>
                              <Input
                                id="ch-pnid"
                                value={phoneNumberId}
                                onChange={(e) => setPhoneNumberId(e.target.value)}
                                placeholder="ID do número no Meta"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ch-waba">
                                Business Account ID (WABA)
                              </Label>
                              <Input
                                id="ch-waba"
                                value={businessAccountId}
                                onChange={(e) =>
                                  setBusinessAccountId(e.target.value)
                                }
                                placeholder="ID da conta WhatsApp Business"
                              />
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                              O webhook é configurado automaticamente pelo CRM ao finalizar. Você não precisa mexer no painel Meta.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="ch-token">Access Token</Label>
                          <Input
                            id="ch-token"
                            type="password"
                            autoComplete="off"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder="Token permanente ou de sistema"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ch-pnid">Phone Number ID</Label>
                          <Input
                            id="ch-pnid"
                            value={phoneNumberId}
                            onChange={(e) => setPhoneNumberId(e.target.value)}
                            placeholder="ID do número no Meta"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ch-waba">
                            Business Account ID (WABA)
                          </Label>
                          <Input
                            id="ch-waba"
                            value={businessAccountId}
                            onChange={(e) => setBusinessAccountId(e.target.value)}
                            placeholder="ID da conta WhatsApp Business"
                          />
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          O webhook é configurado automaticamente pelo CRM ao finalizar. Você não precisa mexer no painel Meta.
                        </p>
                      </>
                    )}
                  </>
                ) : null}

                {effectiveProvider === "BAILEYS_MD" ? (
                  <div className="rounded-lg border border-[var(--channel-whatsapp)]/20 bg-[var(--channel-whatsapp)]/5 p-3">
                    <p className="text-sm text-[var(--text-muted)]">
                      Após criar o canal, clique em <strong>Conectar</strong> e escaneie o QR code
                      com seu WhatsApp. O número será detectado automaticamente.
                    </p>
                  </div>
                ) : null}

                {effectiveProvider !== "META_CLOUD_API" && effectiveProvider !== "BAILEYS_MD" ? (
                  <div className="space-y-2">
                    <Label htmlFor="ch-phone">Telefone (opcional)</Label>
                    <Input
                      id="ch-phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-[var(--color-danger-text)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 border-t bg-[var(--glass-bg-overlay)] px-6 py-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="gap-1"
              onClick={() => {
                if (step === 3) {
                  if (channelType === "WHATSAPP") setStep(2);
                  else setStep(1);
                } else if (step === 2) {
                  setStep(1);
                }
              }}
            >
              <ChevronLeft className="size-4" />
              Voltar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            {step === 3 && effectiveProvider === "META_CLOUD_API" ? (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                disabled={webhookLoading}
                onClick={() => void fetchWebhookInfo()}
              >
                {webhookLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Webhook className="size-3.5" />
                )}
                Webhook
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                disabled={
                  step === 1
                    ? !channelType
                    : step === 2
                      ? !canAdvanceFromStep2()
                      : false
                }
                onClick={() => {
                  if (step === 1 && channelType) {
                    if (channelType === "WHATSAPP") setStep(2);
                    else setStep(3);
                  } else if (step === 2) {
                    setStep(3);
                  }
                }}
              >
                Continuar
              </Button>
            ) : (showEmbeddedSignup && !showManualConfig) ? null : (
              <Button type="button" onClick={() => void submit()} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Criar canal
              </Button>
            )}
          </div>
        </DialogFooter>
        <DialogClose />
      </DialogContent>

      <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
        <DialogContent size="md" panelClassName="max-h-[90vh]">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="size-5 text-[var(--brand-primary)]" />
              Webhook
            </DialogTitle>
            <DialogDescription>
              Visualizar webhook da conexão
            </DialogDescription>
          </DialogHeader>

          {webhookInfo ? (
            <div className="mt-2 space-y-5">
              {webhookInfo.warning ? (
                <div className="rounded-md border border-amber-300 bg-[var(--color-warn-bg)] p-3 text-xs text-[var(--color-warn-text)] dark:border-amber-700 dark:bg-amber-950 dark:text-[var(--color-warning)]/70">
                  <strong>Atenção:</strong> {webhookInfo.warning} Confira se a
                  URL abaixo aponta pro domínio público do backend antes de
                  colar no painel Meta.
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookInfo.callbackUrl}
                    className="font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-3"
                    onClick={() => copyToClipboard(webhookInfo.callbackUrl, "url")}
                    aria-label="Copiar Webhook URL"
                  >
                    {copiedField === "url" ? (
                      <Check className="size-3.5 text-[var(--color-success)]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Token de verificação
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookInfo.verifyToken}
                    className="font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-3"
                    onClick={() => copyToClipboard(webhookInfo.verifyToken, "token")}
                    aria-label="Copiar Token de verificação"
                  >
                    {copiedField === "token" ? (
                      <Check className="size-3.5 text-[var(--color-success)]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Este token será salvo no canal ao clicar em &quot;Criar canal&quot;.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  App Secret
                </Label>
                <Input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="App Secret do seu App Meta (obrigatório)"
                  className="font-mono text-xs"
                  autoComplete="off"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Meta Developers → Configurações → Básico → App Secret →
                  &quot;Mostrar&quot;. Usado para validar a assinatura dos
                  webhooks recebidos.
                </p>
              </div>

              <div className="flex justify-center">
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Meta Developers
                </a>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Com as informações acima, configure:
                </p>
                <ol className="mt-2 ml-5 list-decimal space-y-1 text-xs text-[var(--text-muted)]">
                  <li>Acessar Meta Developers</li>
                  <li>No menu à esquerda, clique em &quot;WhatsApp &gt; Configuração&quot;</li>
                  <li>Clique em &quot;Editar&quot;, na área de Webhook</li>
                  <li>Informe o valor de &quot;Webhook URL&quot; no campo &quot;URL de retorno de chamada&quot;</li>
                  <li>Informe o valor de &quot;Token de verificação&quot; no campo &quot;Verificar token&quot;</li>
                  <li>Clique em &quot;Verificar e salvar&quot; para finalizar a configuração</li>
                </ol>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4 flex-row justify-end gap-2 border-t bg-[var(--glass-bg-overlay)] px-6 py-3">
            <Button type="button" onClick={() => setWebhookModalOpen(false)}>
              Voltar
            </Button>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
