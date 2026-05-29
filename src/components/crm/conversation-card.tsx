"use client"

import { cn } from "@/lib/utils"
import {
  IconClock,
  IconPaperclip,
  IconPhoto,
  IconMicrophone,
  IconVideo,
  IconFile,
  IconMapPin,
  IconUser,
  IconTemplate,
  IconCheck,
  IconTag,
  IconMessage,
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandMessenger,
  IconBrandTelegram,
  IconMail,
  IconForms,
} from "@tabler/icons-react"
import { Chip } from "./chip"

export type ConversationAvatarColor = "sunset" | "forest" | "ocean" | "dusk"

export type LastMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "file"
  | "template"
  | "note"
  | "location"
  | "contact"

export interface Conversation {
  id: string
  name: string
  initials: string
  avatarColor: ConversationAvatarColor | "blue" | "teal" | "orange" | "purple" | "pink" | "coral"
  status: "online" | "offline" | "none"
  time: string
  preview: string
  assignee?: string
  active?: boolean
  inactive?: boolean
  urgent?: boolean

  /**
   * @deprecated use `tags` (lista completa) — mantido para compat com
   * adapters/legados que ainda passam apenas o nome da primeira tag.
   */
  tag?: string | null
  /**
   * Lista completa de tags do contato. O card mostra até 2 e
   * indica "+N" para o restante. Clique no chip abre o popover de
   * gerenciamento se `tagsSlot` estiver presente.
   */
  tags?: Array<{ id: string; name: string; color?: string | null }>
  /** Id do responsável atual — usado pelo AssigneePopover. */
  assigneeId?: string | null
  /**
   * Canal de origem da conversa. Quando presente, substitui o status
   * dot pelo logo do canal no canto inferior direito do avatar.
   * Valores reconhecidos: "whatsapp", "instagram", "facebook" / "meta"
   * / "messenger", "telegram", "email", "webchat" / "form".
   */
  channel?: string | null
  /**
   * Tempo restante da janela de 24h da Meta/WhatsApp.
   * - Texto pre-formatado (ex.: "2h 45min", "8min", "Expirada").
   * - `null` ou `undefined` esconde o badge.
   */
  sessionExpiresIn?: string | null
  /** Define a cor do badge de sessao (vermelho se true, ambar/cinza senao). */
  sessionExpired?: boolean
  /** Tipo da ultima mensagem — define o icone exibido antes do preview. */
  lastMessageType?: LastMessageType
  /** Direcao da ultima mensagem — quando "out", prefixa "Você:". */
  lastMessageDirection?: "in" | "out"
}

interface ConversationCardProps {
  conversation: Conversation
  onClick?: () => void
  /**
   * Slot opcional para o popover de gerenciamento de tags. Quando
   * presente, o cluster de tags (linha dedicada do card) fica clicável
   * e abre o popover. Caso ausente, as tags são apenas display.
   * Use stopPropagation interno para não disparar o `onClick` do card.
   */
  tagsSlot?: React.ReactNode
  /**
   * Slot opcional para o popover de troca de responsável. Quando
   * presente, substitui o chip de assignee na linha inferior do card.
   */
  assigneeSlot?: React.ReactNode
}

const avatarGradients: Record<string, string> = {
  sunset: "linear-gradient(135deg, #FFD580 0%, #FF8FA3 50%, #FF6B9D 100%)",
  forest: "linear-gradient(135deg, #5CC7A9 0%, #2C8A6B 60%, #1F5D49 100%)",
  ocean: "linear-gradient(135deg, #6FA8DC 0%, #3D5A80 60%, #293f5d 100%)",
  dusk: "linear-gradient(135deg, #9F8FDF 0%, #5b6ff5 60%, #3d52e8 100%)",
  blue: "linear-gradient(135deg, #6FA8DC 0%, #3D5A80 60%, #293f5d 100%)",
  teal: "linear-gradient(135deg, #5CC7A9 0%, #2C8A6B 60%, #1F5D49 100%)",
  orange: "linear-gradient(135deg, #FFD580 0%, #FF8FA3 50%, #FF6B9D 100%)",
  coral: "linear-gradient(135deg, #FFD580 0%, #FF8FA3 50%, #FF6B9D 100%)",
  purple: "linear-gradient(135deg, #9F8FDF 0%, #5b6ff5 60%, #3d52e8 100%)",
  pink: "linear-gradient(135deg, #FFB1D6 0%, #FF6B9D 60%, #C13F73 100%)",
}

const typeIconMap: Record<LastMessageType, React.ComponentType<{ size?: number; stroke?: number; className?: string }>> = {
  text: IconPaperclip, // nao usado — text nao renderiza icone
  image: IconPhoto,
  audio: IconMicrophone,
  video: IconVideo,
  document: IconFile,
  file: IconPaperclip,
  template: IconTemplate,
  note: IconPaperclip,
  location: IconMapPin,
  contact: IconUser,
}

const typeLabelMap: Record<LastMessageType, string | null> = {
  text: null,
  image: "Imagem",
  audio: "Áudio",
  video: "Vídeo",
  document: "Documento",
  file: "Arquivo",
  template: "Template",
  note: "Nota interna",
  location: "Localização",
  contact: "Contato",
}

/**
 * Mapeia o `channel` string do backend para ícone + cor de fundo do
 * badge no canto inferior direito do avatar. Cores oficiais de cada
 * marca (mantidas em alta saturação porque o badge é minúsculo).
 * Retorna `null` para canais desconhecidos — caller cai no status dot.
 */
function channelBadge(channel: string | null | undefined): {
  Icon: React.ComponentType<{ size?: number; stroke?: number; className?: string }>;
  bg: string;
  fg: string;
  title: string;
} | null {
  const c = (channel ?? "").toLowerCase().trim();
  if (!c) return null;
  if (c === "whatsapp" || c === "wa")
    return { Icon: IconBrandWhatsapp, bg: "#25D366", fg: "#FFFFFF", title: "WhatsApp" };
  if (c === "instagram" || c === "ig")
    return {
      Icon: IconBrandInstagram,
      bg: "linear-gradient(45deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)",
      fg: "#FFFFFF",
      title: "Instagram",
    };
  if (c === "facebook" || c === "fb")
    return { Icon: IconBrandFacebook, bg: "#1877F2", fg: "#FFFFFF", title: "Facebook" };
  if (c === "meta" || c === "messenger")
    return { Icon: IconBrandMessenger, bg: "#0084FF", fg: "#FFFFFF", title: "Messenger" };
  if (c === "telegram" || c === "tg")
    return { Icon: IconBrandTelegram, bg: "#229ED9", fg: "#FFFFFF", title: "Telegram" };
  if (c === "email" || c === "mail")
    return { Icon: IconMail, bg: "#6B7280", fg: "#FFFFFF", title: "E-mail" };
  if (c === "webchat" || c === "form" || c === "site" || c === "landing")
    return { Icon: IconForms, bg: "#5b6ff5", fg: "#FFFFFF", title: "Formulário" };
  return null;
}

/** Helpers de cor para chip de tag — alpha 0.14 no bg, alpha 0.95 no texto. */
function tagColors(hex: string | null | undefined): {
  bg: string;
  fg: string;
  border: string;
} {
  if (!hex) {
    return {
      bg: "var(--color-enterprise-bg)",
      fg: "var(--brand-primary)",
      border: "rgba(91,111,245,0.25)",
    };
  }
  // Aceita "#rrggbb" — converte para rgba.
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return {
      bg: "var(--color-enterprise-bg)",
      fg: "var(--brand-primary)",
      border: "rgba(91,111,245,0.25)",
    };
  }
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.14)`,
    fg: `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`,
    border: `rgba(${r}, ${g}, ${b}, 0.30)`,
  };
}

const MAX_VISIBLE_TAGS = 2;

export function ConversationCard({
  conversation,
  onClick,
  tagsSlot,
  assigneeSlot,
}: ConversationCardProps) {
  const TypeIcon =
    conversation.lastMessageType && conversation.lastMessageType !== "text"
      ? typeIconMap[conversation.lastMessageType]
      : null
  const typeLabel =
    conversation.lastMessageType && conversation.lastMessageType !== "text"
      ? typeLabelMap[conversation.lastMessageType]
      : null
  const isOutgoing = conversation.lastMessageDirection === "out"
  const ch = channelBadge(conversation.channel)

  return (
    <article
      onClick={onClick}
      className={cn(
        // Borda trocada para `--glass-border-subtle` (0.30 alpha vs 0.55):
        // alinha com a referência v0 que tem cards "flutuando" sem
        // contorno explícito.
        "cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3.5 py-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all duration-200",
        "hover:bg-white/75",
        conversation.active &&
          "border-[var(--brand-primary)]/40 bg-white/85 shadow-[0_6px_20px_rgba(91,111,245,0.18)]",
        conversation.inactive && "opacity-70",
      )}
    >
      {/* Linha 1: avatar + (nome + tempo + preview ao lado).
          items-start alinha o nome no topo do avatar; o preview de 2
          linhas ocupa o espaço ao lado da metade inferior do avatar —
          card mais preenchido/organizado (estilo kanban). */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white font-display text-sm font-bold text-white"
            style={{ background: avatarGradients[conversation.avatarColor] }}
          >
            {conversation.initials}
          </div>
          {/*
            Badge no canto inferior-direito do avatar. Posicionado a
            ~3-4px DENTRO do quadrado para coincidir com o raio do
            círculo (avatar redondo de 48px tem o ponto a 45° em ~7px
            do canto). Antes ficava em `bottom-0 right-0` parecendo
            "cortado" — agora encaixa visualmente no contorno.
            Quando há `channel`, mostra o logo da plataforma. Senão,
            cai no status dot online/offline tradicional.
          */}
          {ch ? (
            <span
              title={ch.title}
              aria-label={ch.title}
              className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white shadow-sm"
              style={{ background: ch.bg, color: ch.fg }}
            >
              <ch.Icon size={10} stroke={2.5} />
            </span>
          ) : (
            conversation.status !== "none" && (
              <span
                className={cn(
                  "absolute bottom-[2px] right-[2px] h-2.5 w-2.5 rounded-full border-2 border-white",
                  conversation.status === "online"
                    ? "bg-[var(--color-online)]"
                    : "bg-[var(--color-offline)]",
                )}
              />
            )
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-sm font-bold text-[var(--text-primary)]">
              {conversation.name}
            </span>
            {conversation.tag && (
              <span className="shrink-0 truncate rounded-full border border-[rgba(91,111,245,0.20)] bg-[var(--color-enterprise-bg)] px-1.5 py-px font-display text-[9.5px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
                {conversation.tag}
              </span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              {conversation.time}
              {conversation.urgent && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
                  <IconClock size={8} stroke={3} />
                </span>
              )}
            </span>
          </div>

          {/* Preview — 2 linhas, fonte menor itálica (estilo kanban).
              Texto => ícone de conversa com borda azul; mídia => ícone
              do tipo + label padronizado (sem itálico). */}
          <div className="mt-1 flex items-start gap-1.5 text-[11.5px] italic leading-[1.4] text-[var(--text-muted)]">
            {isOutgoing && (
              <IconCheck
                size={12}
                className="mt-0.5 shrink-0 not-italic text-[var(--color-success)]"
                aria-label="Você"
              />
            )}
            {TypeIcon ? (
              <TypeIcon size={13} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />
            ) : (
              <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-[rgba(91,111,245,0.40)] text-[var(--brand-primary)]">
                <IconMessage size={9} />
              </span>
            )}
            <span
              className={cn(
                "line-clamp-2 flex-1 overflow-hidden",
                typeLabel && "font-medium not-italic text-[var(--text-secondary)]",
              )}
            >
              {typeLabel ?? conversation.preview}
            </span>
          </div>
        </div>
      </div>

      {/* Linha de tags — até MAX_VISIBLE_TAGS chips coloridos + indicador
          "+N" para o restante. Wrapper inteiro é clicável quando o
          `tagsSlot` está presente (abre o popover de gerenciamento).
          O slot é renderizado no canto direito da linha. */}
      {(conversation.tags?.length ?? 0) > 0 && (
        <div
          className="ml-[60px] mt-2.5 flex min-w-0 items-center gap-1.5"
          onClick={(e) => {
            // Quando o slot existe, evita propagar para o onClick do card.
            if (tagsSlot) e.stopPropagation()
          }}
          onMouseDown={(e) => { if (tagsSlot) e.stopPropagation() }}
        >
          {(conversation.tags ?? []).slice(0, MAX_VISIBLE_TAGS).map((t) => {
            const c = tagColors(t.color)
            return (
              <span
                key={t.id}
                className="inline-flex shrink-0 max-w-[110px] items-center gap-1 truncate whitespace-nowrap rounded-full border px-2 py-px font-display text-[10.5px] font-semibold"
                style={{ background: c.bg, color: c.fg, borderColor: c.border }}
                title={t.name}
              >
                <IconTag size={9} stroke={2.5} />
                <span className="truncate">{t.name}</span>
              </span>
            )
          })}
          {(conversation.tags?.length ?? 0) > MAX_VISIBLE_TAGS && (
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-px font-display text-[10.5px] font-bold text-[var(--text-secondary)]"
              title={(conversation.tags ?? [])
                .slice(MAX_VISIBLE_TAGS)
                .map((t) => t.name)
                .join(", ")}
            >
              +{(conversation.tags?.length ?? 0) - MAX_VISIBLE_TAGS}
            </span>
          )}
          {/* botão "gerenciar" — só aparece se houver slot. Compacto. */}
          {tagsSlot && (
            <span className="ml-auto shrink-0">{tagsSlot}</span>
          )}
        </div>
      )}

      {/* Linha 3: assignee + sessao — flex-nowrap evita quebrar em 2 linhas
          quando o nome do responsavel + chip de sessao somam mais largura
          do que a coluna. O chip do assignee trunca com ellipsis. */}
      <div className="ml-[60px] mt-2.5 flex min-w-0 flex-nowrap items-center justify-between gap-2">
        {/* Quando há `assigneeSlot` (popover injetado), ele substitui o
            chip estático. O wrapper bloqueia propagação para não abrir
            a conversa ao clicar no popover. */}
        {assigneeSlot ? (
          <span
            className="min-w-0 max-w-[60%] truncate whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {assigneeSlot}
          </span>
        ) : conversation.assignee ? (
          <Chip variant="brand" className="min-w-0 max-w-[60%] truncate whitespace-nowrap">
            {conversation.assignee}
          </Chip>
        ) : (
          <Chip variant="ghost" className="shrink-0 whitespace-nowrap">+Responsável</Chip>
        )}

        {/* Linha sem tags (acima): também precisamos de uma forma rápida
            de abrir o popover de tags quando não há nenhuma. Renderiza
            o slot em estado "vazio" pra esses casos. */}
        {tagsSlot && (conversation.tags?.length ?? 0) === 0 && (
          <span
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {tagsSlot}
          </span>
        )}

        {conversation.sessionExpiresIn && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[1px] font-display text-[10px] font-bold",
              conversation.sessionExpired
                ? "border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.10] text-[var(--color-danger-text)]"
                : "border-[var(--color-lead)]/25 bg-[var(--color-lead-bg)] text-[var(--color-warning-text)]",
            )}
            title={
              conversation.sessionExpired
                ? "Sessão de 24h da Meta expirada"
                : "Tempo até expirar a sessão de 24h"
            }
          >
            <IconClock size={10} />
            {conversation.sessionExpiresIn}
          </span>
        )}
      </div>
    </article>
  )
}
