"use client";

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconMail,
} from "@tabler/icons-react";

import { getChannelTonal } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** Ícone da marca do canal (perfil, composer, seletor). Cor tonal via hash do id. */
export function ChannelTypeIcon({
  type,
  channelId,
  size = 14,
  className,
}: {
  type?: string | null;
  channelId?: string | null;
  size?: number;
  className?: string;
}) {
  const t = (type ?? "").toUpperCase();
  const tone = getChannelTonal(String(channelId || type || "channel"));
  const style = { color: tone.fg };
  if (t === "INSTAGRAM") {
    return (
      <IconBrandInstagram
        size={size}
        className={cn("shrink-0", className)}
        style={style}
      />
    );
  }
  if (t === "FACEBOOK") {
    return (
      <IconBrandFacebook
        size={size}
        className={cn("shrink-0", className)}
        style={style}
      />
    );
  }
  if (t === "EMAIL") {
    return <IconMail size={size} className={cn("shrink-0", className)} style={style} />;
  }
  return (
    <IconBrandWhatsapp
      size={size}
      className={cn("shrink-0", className)}
      style={style}
    />
  );
}

/** Janela de 24h / template HSM vale só para WhatsApp Cloud API. */
export function usesWhatsapp24hWindow(type?: string | null): boolean {
  return (type ?? "").toUpperCase() === "WHATSAPP";
}
