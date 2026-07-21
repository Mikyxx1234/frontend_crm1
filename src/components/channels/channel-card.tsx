"use client";

import type { ChannelProvider, ChannelStatus, ChannelType } from "@/lib/prisma-enum-types";
import { IconAt as AtSign, IconClock as Clock, IconGlobe as Globe, IconLoader2 as Loader2, IconMail as Mail, IconMessageCircle as MessageCircle, IconPhone as Phone, IconQrcode as QrCode, IconRefresh as RefreshCw, IconSettings as Settings, IconShare2 as Share2, IconTrash as Trash2 } from "@tabler/icons-react";

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

/**
 * Cor de marca por canal — pinta o fundo do ícone (glyph branco). Espelha
 * o mockup DS v2 (channels.html), usando as cores oficiais de cada rede.
 */
const TYPE_COLOR: Record<ChannelType, string> = {
  WHATSAPP: "var(--channel-whatsapp)",
  INSTAGRAM: "var(--channel-instagram)",
  FACEBOOK: "var(--channel-facebook)",
  EMAIL: "var(--channel-email)",
  WEBCHAT: "var(--channel-webchat)",
};

function TypeIcon({ type }: { type: ChannelType }) {
  const cls = "size-[22px] shrink-0";
  switch (type) {
    case "WHATSAPP":
      return <MessageCircle className={cls} />;
    case "INSTAGRAM":
      return <AtSign className={cls} />;
    case "FACEBOOK":
      return <Share2 className={cls} />;
    case "EMAIL":
      return <Mail className={cls} />;
    case "WEBCHAT":
      return <Globe className={cls} />;
    default:
      return <MessageCircle className={cls} />;
  }
}

type BadgeStyle = {
  label: string;
  wrap: string;
  dot: string;
  ping?: boolean;
};

function badgeStyle(status: ChannelStatus): BadgeStyle {
  switch (status) {
    case "CONNECTED":
      return {
        label: "Conectado",
        wrap: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
        dot: "bg-[var(--color-success)]",
        ping: true,
      };
    case "CONNECTING":
      return {
        label: "Conectando",
        wrap: "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
        dot: "bg-[var(--color-warn)]",
      };
    case "QR_READY":
      return {
        label: "Aguardando QR",
        wrap: "bg-[var(--color-info-bg)] text-[var(--brand-primary)]",
        dot: "bg-[var(--brand-primary)]",
      };
    case "FAILED":
      return {
        label: "Falhou",
        wrap: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
        dot: "bg-[var(--color-danger-text)]",
      };
    case "DISCONNECTED":
    default:
      return {
        label: "Desconectado",
        wrap: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
        dot: "bg-[var(--color-danger-text)]",
      };
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
 * ChannelCard — DS v2 (fiel ao mockup channels.html)
 * ──────────────────────────────────────────────────
 *  - faixa de status vertical à esquerda (cinza off / verde on)
 *  - ícone com cor da marca (glyph branco) + nome + "tipo · provider"
 *  - badge de status com dot (Conectado/Desconectado/…)
 *  - linhas de detalhe (Telefone / Última conexão) com ícone + separador
 *  - rodapé: toggle Ativo/Inativo + ações (QR/Reconectar/Configurar/Excluir)
 *
 * O toggle mapeia CONNECTED <-> DISCONNECTED. Estados intermediários
 * (CONNECTING, QR_READY) desabilitam o toggle — resolve-se via "Ver QR"
 * ou "Reconectar".
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
    : null;

  const isActive = status === "CONNECTED";
  const isTogglePending = isConnectPending || isDisconnectPending;
  const isIntermediate = status === "CONNECTING" || status === "QR_READY";
  const canToggle = !isTogglePending && !isIntermediate;
  const badge = badgeStyle(status);
  const iconColor = TYPE_COLOR[channel.type];

  const handleToggle = (next: boolean) => {
    if (!canToggle) return;
    if (next) onConnect(id);
    else onDisconnect(id);
  };

  const iconBtn =
    "flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:bg-white hover:text-[var(--brand-primary)]";

  return (
    <article
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[var(--brand-primary)] hover:shadow-[var(--glass-shadow)]",
      )}
    >
      {/* Faixa de status vertical à esquerda */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          isActive ? "bg-[var(--color-success)]" : "bg-[var(--text-muted)] opacity-45",
        )}
      />

      {/* Topo: ícone + nome/sub + badge */}
      <div className="flex items-start gap-3 px-5 pb-3.5 pt-4.5">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-white"
          style={{ background: iconColor }}
        >
          <TypeIcon type={channel.type} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="break-words font-display text-[16.5px] font-extrabold tracking-[-0.3px] text-[var(--text-primary)]"
            title={channel.name}
          >
            {channel.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[var(--text-muted)]">
            <span>{TYPE_LABELS[channel.type]}</span>
            <span className="opacity-50">·</span>
            <span>{PROVIDER_LABELS[channel.provider]}</span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.2px]",
            badge.wrap,
          )}
        >
          {badge.ping ? (
            <span className="relative flex size-1.5">
              <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", badge.dot)} />
              <span className={cn("relative inline-flex size-1.5 rounded-full", badge.dot)} />
            </span>
          ) : (
            <span className={cn("size-1.5 shrink-0 rounded-full", badge.dot)} />
          )}
          {badge.label}
        </span>
      </div>

      {/* Detalhes */}
      <div className="flex flex-col px-5 pb-3.5">
        <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] py-2">
          <span className="flex items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
            <Phone className="size-[15px] opacity-70" />
            Telefone
          </span>
          <span
            className={cn(
              "text-[13px] font-semibold tabular-nums text-[var(--text-secondary)]",
              !channel.phoneNumber && "font-medium text-[var(--text-muted)] opacity-50",
            )}
          >
            {channel.phoneNumber ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="flex items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
            <Clock className="size-[15px] opacity-70" />
            Última conexão
          </span>
          <span
            className={cn(
              "text-[13px] font-semibold tabular-nums text-[var(--text-secondary)]",
              !lastAt && "font-medium text-[var(--text-muted)] opacity-50",
            )}
          >
            {lastAt ?? "—"}
          </span>
        </div>
      </div>

      {/* Rodapé: toggle + ações */}
      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-5 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={!canToggle}
            aria-label={isActive ? "Desativar canal" : "Ativar canal"}
            className={isActive ? "bg-[var(--color-success)]" : undefined}
          />
          <span
            className={cn(
              "font-display text-[13px] font-bold",
              isActive ? "text-[var(--color-success)]" : "text-[var(--text-muted)]",
            )}
          >
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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {status === "QR_READY" || status === "CONNECTING" ? (
            <button
              type="button"
              className={cn(iconBtn, "w-auto gap-1.5 px-2.5 text-[12px] font-semibold")}
              onClick={() => onOpenQr(channel)}
              title="Ver QR Code"
            >
              <QrCode className="size-4" />
              QR
            </button>
          ) : null}

          {status === "FAILED" ? (
            <button
              type="button"
              className={cn(iconBtn, "w-auto gap-1.5 px-2.5 text-[12px] font-semibold")}
              onClick={() => onConnect(id)}
              disabled={isConnectPending}
              title="Reconectar"
            >
              {isConnectPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Reconectar
            </button>
          ) : null}

          <button
            type="button"
            className={iconBtn}
            onClick={() => onConfigure(channel)}
            aria-label="Configurar canal"
            title="Configurar"
          >
            <Settings className="size-4" />
          </button>
          <button
            type="button"
            className={cn(
              iconBtn,
              "hover:border-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]",
            )}
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
          </button>
        </div>
      </div>
    </article>
  );
}
