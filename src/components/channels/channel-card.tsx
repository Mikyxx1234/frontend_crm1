"use client";

import type { ChannelProvider, ChannelStatus, ChannelType } from "@/lib/prisma-enum-types";
import {
  AtSign,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  Settings,
  Share2,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/crm/glass-card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn, formatDateTime } from "@/lib/utils";

import type { ApiChannel } from "./types";

const PROVIDER_LABELS: Record<ChannelProvider, string> = {
  META_CLOUD_API: "Cloud API",
  BAILEYS_MD: "QR Code",
};

const TYPE_LABELS: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "E-mail",
  WEBCHAT: "Webchat",
};

function TypeIcon({ type, className }: { type: ChannelType; className?: string }) {
  const cnBase = cn("size-5 shrink-0", className);
  switch (type) {
    case "WHATSAPP":
      return <MessageCircle className={cnBase} style={{ color: "#25D366" }} />;
    case "INSTAGRAM":
      return <AtSign className={cn(cnBase, "text-pink-600")} />;
    case "FACEBOOK":
      return <Share2 className={cnBase} style={{ color: "#1877F2" }} />;
    case "EMAIL":
      return <Mail className={cnBase} />;
    case "WEBCHAT":
      return <Globe className={cnBase} />;
    default:
      return <MessageCircle className={cnBase} />;
  }
}

function statusBadgeVariant(
  status: ChannelStatus,
): "success" | "secondary" | "warning" | "default" | "destructive" {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "DISCONNECTED":
      return "secondary";
    case "CONNECTING":
      return "warning";
    case "QR_READY":
      return "default";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

function statusLabel(status: ChannelStatus): string {
  switch (status) {
    case "CONNECTED":
      return "Conectado";
    case "DISCONNECTED":
      return "Desconectado";
    case "CONNECTING":
      return "Conectando";
    case "QR_READY":
      return "Aguardando QR";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

export type ChannelCardProps = {
  channel: ApiChannel;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConfigure: (channel: ApiChannel) => void;
  onDelete: (id: string) => void;
  onOpenQr: (channel: ApiChannel) => void;
  isConnectPending?: boolean;
  isDisconnectPending?: boolean;
  isDeletePending?: boolean;
};

/**
 * ChannelCard v2
 * ──────────────
 * Layout compacto DS v2:
 *  - header com icon + nome + tipo/provedor + status badge
 *  - body com telefone e ultima conexao
 *  - footer com Switch (ativo/inativo) a esquerda e botoes de acao icon-only
 *    (engrenagem = configurar, lixeira = excluir) a direita
 *  - QR/CONNECTING mostra botao dedicado "Ver QR"
 *  - FAILED mostra CTA "Reconectar"
 *
 * O toggle mapeia CONNECTED <-> DISCONNECTED. Estados intermediarios
 * (CONNECTING, QR_READY) o toggle fica desabilitado -- o usuario resolve
 * via botao "Ver QR" ou "Reconectar".
 */
export function ChannelCard({
  channel,
  onConnect,
  onDisconnect,
  onConfigure,
  onDelete,
  onOpenQr,
  isConnectPending,
  isDisconnectPending,
  isDeletePending,
}: ChannelCardProps) {
  const { status, id } = channel;
  const lastAt = channel.lastConnectedAt
    ? formatDateTime(channel.lastConnectedAt)
    : "—";

  const isActive = status === "CONNECTED";
  const isTogglePending = isConnectPending || isDisconnectPending;
  const isIntermediate = status === "CONNECTING" || status === "QR_READY";
  const canToggle = !isTogglePending && !isIntermediate;

  const handleToggle = (next: boolean) => {
    if (!canToggle) return;
    if (next) {
      onConnect(id);
    } else {
      onDisconnect(id);
    }
  };

  return (
    <GlassCard className="flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-[var(--glass-shadow-lg)]">
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border bg-[var(--glass-bg-overlay)]",
              channel.type === "WHATSAPP" && "border-[#25D366]/25 bg-[#25D366]/5",
            )}
          >
            <TypeIcon type={channel.type} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-[var(--text-primary)]">
              {channel.name}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
              <span>{TYPE_LABELS[channel.type]}</span>
              <span className="text-muted-foreground/60">·</span>
              <span
                className={cn(
                  "font-medium",
                  channel.provider === "BAILEYS_MD"
                    ? "text-[#25D366]"
                    : "text-[var(--text-muted)]",
                )}
              >
                {PROVIDER_LABELS[channel.provider]}
              </span>
            </div>
          </div>
        </div>

        {status === "CONNECTED" ? (
          <Badge
            variant="success"
            className="shrink-0 gap-1.5 border-transparent shadow-none"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            Conectado
          </Badge>
        ) : (
          <Badge variant={statusBadgeVariant(status)} className="shrink-0">
            {statusLabel(status)}
          </Badge>
        )}
      </div>

      <Separator />

      <div className="flex flex-1 flex-col gap-2 px-5 py-4 text-sm text-[var(--text-muted)]">
        <div className="flex justify-between gap-2">
          <span>Telefone</span>
          <span className="truncate font-medium text-[var(--text-primary)]">
            {channel.phoneNumber ?? "—"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Última conexão</span>
          <span className="shrink-0 font-medium text-[var(--text-primary)]">
            {lastAt}
          </span>
        </div>
        {status === "FAILED" ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">
            Falha na conexão. Verifique credenciais ou tente reconectar.
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={!canToggle}
            aria-label={isActive ? "Desativar canal" : "Ativar canal"}
          />
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {isTogglePending ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                {isActive ? "Desativando…" : "Ativando…"}
              </span>
            ) : isActive ? (
              "Ativo"
            ) : (
              "Inativo"
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {status === "QR_READY" || status === "CONNECTING" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-blue-500/40 bg-blue-500/10 px-2.5 text-blue-700 hover:bg-blue-500/20 dark:text-blue-100"
              onClick={() => onOpenQr(channel)}
            >
              <QrCode className="size-3.5" />
              QR
            </Button>
          ) : null}

          {status === "FAILED" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 px-2.5 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
              onClick={() => onConnect(id)}
              disabled={isConnectPending}
            >
              {isConnectPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Reconectar
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-[var(--text-muted)] hover:bg-[var(--glass-bg-subtle)] hover:text-[var(--text-primary)]"
            onClick={() => onConfigure(channel)}
            aria-label="Configurar canal"
            title="Configurar"
          >
            <Settings className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-[var(--text-muted)] hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(id)}
            disabled={isDeletePending}
            aria-label="Excluir canal"
            title="Excluir"
          >
            {isDeletePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
