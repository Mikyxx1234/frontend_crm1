"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Cores determinísticas derivadas do nome/ID — Luz sempre laranja vibrante. */
const FALLBACK_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];

function getAvatarColor(seed: string): string {
  const normalized = seed.toLowerCase();
  if (normalized === "luz" || normalized.includes("luz")) return "#f59e0b";

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export type ChatAvatarChannel = "whatsapp" | "instagram" | "email" | "meta" | null;

export interface ChatAvatarUser {
  id?: string | number;
  name?: string | null;
  imageUrl?: string | null;
}

export interface ChatAvatarProps {
  user?: ChatAvatarUser;
  name?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  unreadCount?: number;
  bgColor?: string;
  /** Diâmetro do avatar em pixels (default 60). */
  size?: number;
  /** Qual canal exibir no badge inferior esquerdo. `null` oculta. */
  channel?: ChatAvatarChannel;
  /** Oculta o overlay de cartoon (útil para agentes ou quando imageUrl está ausente mas queremos iniciais limpas). */
  hideCartoon?: boolean;
  /** Força renderização de ícone de robô em vez de iniciais/cartoon.
   * Usado pra mensagens geradas por automação (`senderName === "Automação"`),
   * garantindo que o bot tenha identidade visual consistente — sem
   * "A" num círculo colorido aleatório que parece um atendente real. */
  isBot?: boolean;
  className?: string;
}

const WHATSAPP_BADGE_COLOR = "#25d366";
const UNREAD_BADGE_COLOR = "#22c55e";

function WhatsappIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="text-white"
      width={size}
      height={size}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function RobotIcon() {
  // Robozinho minimalista — antenas + cabeça arredondada + olhos
  // pretos + sorriso linear. Monocromático (branco) pra funcionar
  // sobre qualquer cor de fundo. Aspect ratio 1:1, 82% do container
  // (mesmo sizing do CartoonFallback pra não quebrar proporções).
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="relative z-10 h-[72%] w-[72%] text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Antena */}
      <line x1="32" y1="6" x2="32" y2="14" />
      <circle cx="32" cy="5" r="2" fill="currentColor" />
      {/* Cabeça */}
      <rect x="12" y="14" width="40" height="34" rx="8" />
      {/* Olhos (sólidos) */}
      <circle cx="24" cy="30" r="3.5" fill="currentColor" stroke="none" />
      <circle cx="40" cy="30" r="3.5" fill="currentColor" stroke="none" />
      {/* Boca — traço curto */}
      <line x1="26" y1="40" x2="38" y2="40" />
      {/* Orelhas laterais */}
      <line x1="10" y1="26" x2="10" y2="34" />
      <line x1="54" y1="26" x2="54" y2="34" />
      {/* "Pescoço" */}
      <line x1="32" y1="48" x2="32" y2="54" />
    </svg>
  );
}

function CartoonFallback() {
  // SVG embutido com fills hex fixos (sem <defs>/gradient IDs) para evitar colisão
  // quando muitos avatares são renderizados numa mesma página.
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="relative top-[2%] z-10 h-[82%] w-[82%]"
    >
      <path
        d="M18,95 L82,95 L82,85 C82,75 72,68 62,65 L38,65 C28,68 18,75 18,85 Z"
        fill="#7bc4ef"
        stroke="#5a9bc8"
        strokeWidth="0.8"
      />
      <path d="M42,65 Q50,74 58,65" fill="none" stroke="#5a9bc8" strokeWidth="1.2" />
      <path d="M44,60 L44,68 Q50,72 56,68 L56,60" fill="#ffdac1" />
      <circle cx="30" cy="48" r="6.5" fill="#ffdac1" stroke="#e0b9a0" strokeWidth="0.4" />
      <circle cx="70" cy="48" r="6.5" fill="#ffdac1" stroke="#e0b9a0" strokeWidth="0.4" />
      <path
        d="M32,45 Q32,20 50,20 Q68,20 68,45 Q68,64 50,64 Q32,64 32,45"
        fill="#ffdac1"
      />
      <path
        d="M28,48 C25,35 28,22 40,15 L45,8 L52,13 L60,8 L65,15 C77,22 75,35 72,48 Q70,42 66,35 C60,24 40,24 34,35 Q31,42 28,48"
        fill="#9c6b5b"
        stroke="#5d4037"
        strokeWidth="0.4"
      />
    </svg>
  );
}

export function ChatAvatar({
  user,
  name,
  phone,
  imageUrl,
  unreadCount,
  bgColor: customBgColor,
  size = 60,
  channel = "whatsapp",
  hideCartoon = false,
  isBot = false,
  className,
}: ChatAvatarProps) {
  const finalName = user?.name || name || phone || "Usuário";
  const finalImageUrl = user?.imageUrl || imageUrl;
  const finalId = String(user?.id ?? finalName);
  const initials = (finalName.trim().charAt(0) || "?").toUpperCase();
  // Detecta bot também por nome (fallback pra call-sites legados que
  // ainda não passam `isBot` explicitamente). "Automação" e "Sistema"
  // são os dois únicos senderNames que o backend carimba em mensagens
  // geradas por automação / estado do canal.
  const lowered = finalName.toLowerCase();
  const isBotResolved =
    isBot ||
    lowered === "automação" ||
    lowered === "automacao" ||
    lowered === "sistema" ||
    lowered === "bot";
  // Para bot, fundo neutro slate-600 (combina com o chip "AUTOMAÇÃO"
  // no balão) — sem cor aleatória por hash do nome, que gerava
  // magentas/verdes aleatórios e parecia avatar de um agente humano.
  const bgColor = customBgColor || (isBotResolved ? "#475569" : getAvatarColor(finalId));
  const isAgent = lowered.includes("agente") || lowered.includes("admin");
  const showCartoon = !hideCartoon && !isAgent && !isBotResolved;

  const showUnread = typeof unreadCount === "number" && unreadCount > 0;
  const showChannel = channel === "whatsapp";

  // Badges escalam proporcionalmente ao size do avatar
  const badgeSize = Math.max(14, Math.round(size * 0.32));
  const badgeFontSize = Math.max(9, Math.round(size * 0.17));
  const badgeBorder = Math.max(1.5, Math.round(size * 0.033));
  const whatsappIconSize = Math.max(8, Math.round(badgeSize * 0.6));
  const initialsFontSize = Math.max(12, Math.round(size * 0.36));

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {showUnread && (
        <div
          className="absolute z-20 flex items-center justify-center rounded-full font-black text-white shadow-lg"
          style={{
            width: badgeSize,
            height: badgeSize,
            top: -badgeSize * 0.18,
            right: -badgeSize * 0.18,
            fontSize: badgeFontSize,
            border: `${badgeBorder}px solid #fff`,
            lineHeight: 1,
            backgroundColor: UNREAD_BADGE_COLOR,
          }}
        >
          {unreadCount! > 9 ? "9+" : unreadCount}
        </div>
      )}

      <div
        className="relative flex size-full items-center justify-center overflow-hidden rounded-full shadow-sm"
        style={{
          backgroundColor: bgColor,
          border: `${badgeBorder}px solid #fff`,
        }}
      >
        {finalImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={finalImageUrl}
            alt={finalName}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : isBotResolved ? (
          <div className="relative flex size-full items-center justify-center">
            <RobotIcon />
          </div>
        ) : (
          <div className="relative flex size-full items-center justify-center">
            <span
              className="pointer-events-none font-extrabold uppercase leading-none text-white/90"
              style={{ fontSize: initialsFontSize }}
            >
              {initials}
            </span>

            {showCartoon && (
              <div className="pointer-events-none absolute inset-0 flex size-full items-center justify-center overflow-hidden">
                <CartoonFallback />
              </div>
            )}
          </div>
        )}
      </div>

      {showChannel && (
        <div
          className="absolute z-10 flex items-center justify-center rounded-full shadow-sm"
          style={{
            width: badgeSize,
            height: badgeSize,
            bottom: -badgeSize * 0.08,
            left: -badgeSize * 0.08,
            backgroundColor: WHATSAPP_BADGE_COLOR,
            border: `${badgeBorder}px solid #fff`,
          }}
        >
          <WhatsappIcon size={whatsappIconSize} />
        </div>
      )}
    </div>
  );
}
