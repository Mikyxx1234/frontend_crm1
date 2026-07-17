/**
 * Avatar design-system helpers — contato/conversa (sólido + badge de canal)
 * e pessoa interna (gradiente glass via AvatarGlass).
 */

export const AVATAR_FALLBACK_COLORS = [
  "var(--avatar-fallback-1)",
  "var(--avatar-fallback-2)",
  "var(--avatar-fallback-3)",
  "var(--avatar-fallback-4)",
  "var(--avatar-fallback-5)",
  "var(--avatar-fallback-6)",
  "var(--avatar-fallback-7)",
  "var(--avatar-fallback-8)",
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

/** Cor sólida determinística a partir do nome/id (padrão Inbox / ChatAvatar). */
export function getAvatarSolidColor(seed: string): string {
  const normalized = seed.toLowerCase();
  if (normalized === "luz" || normalized.includes("luz")) {
    return "var(--color-warning)";
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_FALLBACK_COLORS[Math.abs(hash) % AVATAR_FALLBACK_COLORS.length];
}

/** Cor glass determinística para avatares de pessoas internas. */
export function getAvatarGlassColor(seed: string): AvatarGlassColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GLASS_COLORS[Math.abs(hash) % AVATAR_GLASS_COLORS.length];
}

export function avatarInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
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
