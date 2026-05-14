"use client";

import { apiUrl } from "@/lib/api";
import type { ChannelProvider, ChannelType } from "@/lib/prisma-enum-types";
import {
  AtSign,
  Check,
  ChevronDown,
  ChevronLeft,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  Share2,
  Sparkles,
} from "lucide-react";
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
    description: "Mensagens e automaÃ§Ãµes",
    icon: MessageCircle,
    cardClass:
      "border-[#25D366]/30 bg-[#25D366]/[0.06] hover:border-[#25D366]/50",
  },
  {
    type: "INSTAGRAM",
    label: "Instagram",
    description: "Direct e comentÃ¡rios",
    icon: AtSign,
    cardClass:
      "border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-violet-500/10 hover:border-pink-500/40",
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    description: "Messenger e pÃ¡ginas",
    icon: Share2,
    cardClass: "border-blue-600/25 bg-blue-600/5 hover:border-blue-600/40",
  },
  {
    type: "EMAIL",
    label: "E-mail",
    description: "Caixa compartilhada",
    icon: Mail,
    cardClass: "border-border hover:border-primary/30",
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
  const [appSecret, setAppSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualConfig, setShowManualConfig] = useState(false);

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
    setAppSecret("");
    setError(null);
    setSubmitting(false);
    setShowManualConfig(false);
    embeddedSignup.reset();
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
    let config: Record<string, string> = {};

    if (prov === "META_CLOUD_API") {
      if (!accessToken.trim() || !phoneNumberId.trim() || !businessAccountId.trim() || !appSecret.trim()) {
        setError("Preencha Access Token, Phone Number ID, Business Account ID e App Secret.");
        return;
      }
      config = {
        accessToken: accessToken.trim(),
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        appSecret: appSecret.trim(),
      };
    }

    setSubmitting(true);
    setError(null);
    const phonePayload =
      prov === "BAILEYS_MD"
        ? ""
        : phoneNumber.trim() ||
          (prov === "META_CLOUD_API" && phoneNumberId.trim()
            ? phoneNumberId.trim()
            : "");

    try {
      const res = await fetch(apiUrl("/api/channels"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: channelType,
          provider: prov,
          config: Object.keys(config).length ? config : undefined,
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
        panelClassName="max-h-[90vh] overflow-y-auto"
        className="p-0"
      >
        <div className="p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Novo canal
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Escolha o tipo de canal."}
              {step === 2 && channelType === "WHATSAPP" && "Configure o provedor."}
              {step === 3 && "Finalize a configuraÃ§Ã£o."}
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
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "opacity-90 hover:opacity-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-8",
                        type === "WHATSAPP" && "text-[#25D366]"
                      )}
                    />
                    <span className="font-semibold text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {description}
                    </span>
                    {channelType === type ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
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
                    "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40",
                    provider === "META_CLOUD_API" &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <p className="font-semibold">Meta Cloud API (Oficial)</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    API oficial do WhatsApp Business. Requer token e IDs do Meta
                    Business. Templates, selo de verificado, cobranÃ§a por conversa.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("BAILEYS_MD")}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    "border-[#25D366]/20 bg-[#25D366]/5 hover:border-[#25D366]/40",
                    provider === "BAILEYS_MD" &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="size-5 text-[#25D366]" />
                    <p className="font-semibold">WhatsApp QR Code</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Conecte qualquer nÃºmero via QR code. Sem templates, sem
                    verificaÃ§Ã£o Meta. RÃ¡pido e direto.
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
                        <div className="rounded-xl border-2 border-blue-500/20 bg-blue-500/5 p-4">
                          <p className="text-sm font-medium text-foreground">
                            Conectar via Facebook
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Obtenha credenciais automaticamente com login Meta.
                            Token, Phone ID e WABA ID sÃ£o configurados de forma segura.
                            O App Secret Ã© lido de ConfiguraÃ§Ãµes â†’ IntegraÃ§Ãµes.
                          </p>
                          <Button
                            type="button"
                            className="mt-3 w-full gap-2 bg-[#1877F2] text-white hover:bg-[#166FE5]"
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
                          className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                          <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
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
                                placeholder="ID do nÃºmero no Meta"
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
                            <div className="space-y-2">
                              <Label htmlFor="ch-secret">App Secret do seu App</Label>
                              <Input
                                id="ch-secret"
                                type="password"
                                autoComplete="off"
                                value={appSecret}
                                onChange={(e) => setAppSecret(e.target.value)}
                                placeholder="Chave secreta do seu app Meta"
                              />
                              <p className="text-xs text-muted-foreground">
                                ConfiguraÃ§Ãµes â†’ BÃ¡sico no painel do seu app Meta. NecessÃ¡rio para verificar webhooks vindos do seu app.
                              </p>
                            </div>
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
                            placeholder="ID do nÃºmero no Meta"
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
                        <div className="space-y-2">
                          <Label htmlFor="ch-secret">App Secret do seu App</Label>
                          <Input
                            id="ch-secret"
                            type="password"
                            autoComplete="off"
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                            placeholder="Chave secreta do seu app Meta"
                          />
                          <p className="text-xs text-muted-foreground">
                            ConfiguraÃ§Ãµes â†’ BÃ¡sico no painel do seu app Meta. NecessÃ¡rio para verificar webhooks vindos do seu app.
                          </p>
                        </div>
                      </>
                    )}
                  </>
                ) : null}

                {effectiveProvider === "BAILEYS_MD" ? (
                  <div className="rounded-lg border border-[#25D366]/20 bg-[#25D366]/5 p-3">
                    <p className="text-sm text-muted-foreground">
                      ApÃ³s criar o canal, clique em <strong>Conectar</strong> e escaneie o QR code
                      com seu WhatsApp. O nÃºmero serÃ¡ detectado automaticamente.
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
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 border-t bg-muted/20 px-6 py-4">
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
          <div className="flex flex-1 justify-end gap-2">
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
    </Dialog>
  );
}
