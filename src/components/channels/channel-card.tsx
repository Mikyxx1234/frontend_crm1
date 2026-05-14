"use client";

import type { ChannelProvider, ChannelStatus, ChannelType } from "@prisma/client";
import {
  AtSign,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  Settings2,
  Share2,
  Trash2,
  Unplug,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  status: ChannelStatus
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
      return "QR pronto";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

function StatusDot({
  status,
  pulse,
}: {
  status: ChannelStatus;
  pulse?: boolean;
}) {
  const color =
    status === "CONNECTED"
      ? "bg-[#22c55e]"
      : status === "QR_READY"
        ? "bg-blue-500"
        : status === "FAILED"
          ? "bg-destructive"
          : status === "CONNECTING"
            ? "bg-amber-500"
            : "bg-muted-foreground/50";

  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {pulse ? (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            color
          )}
        />
      ) : null}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
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

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40",
                channel.type === "WHATSAPP" && "border-[#25D366]/25 bg-[#25D366]/5"
              )}
            >
              <TypeIcon type={channel.type} />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{channel.name}</CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <StatusDot
                    status={status}
                    pulse={status === "CONNECTED" || status === "QR_READY"}
                  />
                  {TYPE_LABELS[channel.type]}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className={cn(
                  "text-xs font-medium",
                  channel.provider === "BAILEYS_MD"
                    ? "text-[#25D366]"
                    : "text-muted-foreground"
                )}>
                  {PROVIDER_LABELS[channel.provider]}
                </span>
              </CardDescription>
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
            <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-1 flex-col gap-2 py-4 text-sm text-muted-foreground">
        <div className="flex justify-between gap-2">
          <span>Telefone</span>
          <span className="truncate font-medium text-foreground">
            {channel.phoneNumber ?? "—"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Última conexão</span>
          <span className="shrink-0 font-medium text-foreground">{lastAt}</span>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-wrap items-center gap-2 border-t bg-muted/20 pt-4">
        {status === "DISCONNECTED" ? (
          <>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => onConnect(id)}
              disabled={isConnectPending}
            >
              {isConnectPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Conectar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onConfigure(channel)}
            >
              <Settings2 className="size-4" />
              Configurar
            </Button>
          </>
        ) : null}

        {status === "CONNECTED" ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => onDisconnect(id)}
            disabled={isDisconnectPending}
          >
            {isDisconnectPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Unplug className="size-4" />
            )}
            Desconectar
          </Button>
        ) : null}

        {status === "QR_READY" ? (
          <>
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-600/90"
              onClick={() => onOpenQr(channel)}
            >
              <QrCode className="size-4" />
              Ver QR Code
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onConfigure(channel)}
            >
              <Settings2 className="size-4" />
              Configurar
            </Button>
          </>
        ) : null}

        {status === "CONNECTING" ? (
          <>
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-600/90"
              onClick={() => onOpenQr(channel)}
            >
              <QrCode className="size-4" />
              Ver QR Code
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin text-amber-600" />
              <span>Conectando…</span>
            </div>
          </>
        ) : null}

        {status === "FAILED" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-950 hover:bg-amber-500/20 dark:text-amber-100"
              onClick={() => onConnect(id)}
              disabled={isConnectPending}
            >
              {isConnectPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Reconectar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onConfigure(channel)}
            >
              <Settings2 className="size-4" />
              Configurar
            </Button>
            <p className="w-full text-xs text-destructive">
              Falha na conexão. Verifique credenciais ou tente novamente.
            </p>
          </>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(id)}
          disabled={isDeletePending}
        >
          {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Excluir
        </Button>
      </CardFooter>
    </Card>
  );
}
