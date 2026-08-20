/**
 * Avatar design-system helpers — contato/conversa (sólido + badge de canal)
 * e pessoa interna (gradiente glass via AvatarGlass).
 */

import { sanitizeContactName } from "@/lib/display-name";

/** Primeiro grafema seguro (evita surrogate pair quebrado de emoji). */
function firstGrapheme(s: string): string {
  return Array.from(s)[0] ?? "";
}

export const AVATAR_FALLBACK_COLORS = [
  "var(--avatar-fallback-1)",
  "var(--avatar-fallback-2)",
  "var(--avatar-fallback-3)",
  "var(--avatar-fallback-4)",
  "var(--avatar-fallback-5)",
  "var(--avatar-fallback-6)",
] as const;

const AVATAR_FALLBACK_FGS = [
  "var(--avatar-fallback-1-fg)",
  "var(--avatar-fallback-2-fg)",
  "var(--avatar-fallback-3-fg)",
  "var(--avatar-fallback-4-fg)",
  "var(--avatar-fallback-5-fg)",
  "var(--avatar-fallback-6-fg)",
] as const;

const CHANNEL_TONAL = [
  { bg: "var(--channel-tonal-1-bg)", fg: "var(--channel-tonal-1-fg)" },
  { bg: "var(--channel-tonal-2-bg)", fg: "var(--channel-tonal-2-fg)" },
  { bg: "var(--channel-tonal-3-bg)", fg: "var(--channel-tonal-3-fg)" },
  { bg: "var(--channel-tonal-4-bg)", fg: "var(--channel-tonal-4-fg)" },
  { bg: "var(--channel-tonal-5-bg)", fg: "var(--channel-tonal-5-fg)" },
  { bg: "var(--channel-tonal-6-bg)", fg: "var(--channel-tonal-6-fg)" },
] as const;

export const AVATAR_BOT_BG = "var(--avatar-bot-bg)";
export const AVATAR_UNREAD_BG = "var(--avatar-unread-bg)";

export type AvatarGlassColor = "blue" | "teal" | "orange" | "purple" | "pink" | "coral";

export const AVATAR_GLASS_COLORS: AvatarGlassColor[] = [
  "blue",
  "teal",
  "orange",
  "purple",
  "pink",
  "coral",
];

function stableHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function paletteIndex(seed: string): number {
  return stableHash(seed) % AVATAR_FALLBACK_COLORS.length;
}

export function getAvatarTone(seed: string): { bg: string; fg: string } {
  const i = paletteIndex(seed);
  return { bg: AVATAR_FALLBACK_COLORS[i], fg: AVATAR_FALLBACK_FGS[i] };
}

/** Cor sólida determinística a partir do id da pessoa (padrão Inbox / ChatAvatar). */
export function getAvatarSolidColor(seed: string): string {
  const normalized = seed.toLowerCase();
  if (normalized === "luz" || normalized.includes("luz")) {
    return "var(--color-warning)";
  }
  return getAvatarTone(seed).bg;
}

export function getAvatarForegroundColor(seed: string): string {
  const normalized = seed.toLowerCase();
  if (normalized === "luz" || normalized.includes("luz")) {
    return "var(--avatar-fallback-2-fg)";
  }
  return getAvatarTone(seed).fg;
}

/** Fundo tonal + glifo da mesma matiz, hash estável do id do canal. */
export function getChannelTonal(seed: string): { bg: string; fg: string } {
  return CHANNEL_TONAL[paletteIndex(seed)];
}

/** Cor glass determinística para avatares de pessoas internas. */
export function getAvatarGlassColor(seed: string): AvatarGlassColor {
  return AVATAR_GLASS_COLORS[stableHash(seed) % AVATAR_GLASS_COLORS.length];
}

export function avatarInitials(name: string | null | undefined): string {
  const parts = sanitizeContactName(name).split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      firstGrapheme(parts[0]) + firstGrapheme(parts[parts.length - 1])
    ).toUpperCase();
  }
  const chars = Array.from(parts[0] ?? "");
  return (chars.slice(0, 2).join("") || "?").toUpperCase();
}

/** Tamanhos canônicos (px) — espelham `--avatar-size-*`. */
export const AVATAR_SIZE = {
  xs: 24,
  sm: 28,
  md: 36,
  lg: 44,
  xl: 56,
  inbox: 48,
} as const;

export type AvatarSizeToken = keyof typeof AVATAR_SIZE;
