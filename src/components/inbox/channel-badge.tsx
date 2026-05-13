"use client";

import { AtSign, Globe, Mail, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type InboxChannel = "whatsapp" | "instagram" | "email" | "web" | string;

function normalize(ch: string): InboxChannel {
  const c = ch.toLowerCase();
  if (c.includes("whatsapp")) return "whatsapp";
  if (c.includes("instagram") || c.includes("facebook") || c.includes("messenger")) {
    return "instagram";
  }
  if (c.includes("email") || c.includes("smtp")) return "email";
  return "web";
}

const styles: Record<string, string> = {
  whatsapp: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  instagram:
    "border-pink-500/40 bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-amber-400/15 text-pink-950 dark:text-pink-100",
  email: "border-blue-500/40 bg-blue-500/15 text-blue-900 dark:text-blue-100",
  web: "border-border bg-muted/80 text-muted-foreground",
};

const labels: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  web: "Web",
};

export function ChannelBadge({
  channel,
  className,
  compact,
}: {
  channel: string;
  className?: string;
  compact?: boolean;
}) {
  const key = normalize(channel);
  const label = labels[key] ?? channel;

  const Icon =
    key === "whatsapp"
      ? MessageCircle
      : key === "instagram"
        ? AtSign
        : key === "email"
          ? Mail
          : Globe;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[key] ?? styles.web,
        compact && "px-1.5 py-0",
        className
      )}
    >
      <Icon className="size-3 shrink-0 opacity-90" aria-hidden />
      {!compact ? label : null}
    </span>
  );
}
