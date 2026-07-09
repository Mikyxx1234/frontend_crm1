"use client"

import { cn } from "@/lib/utils"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
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
    return { Icon: IconBrandWhatsapp, bg: "var(--channel-whatsapp)", fg: "#FFFFFF", title: "WhatsApp" };
  if (c === "instagram" || c === "ig")
    return {
      Icon: IconBrandInstagram,
      bg: "linear-gradient(45deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)",
      fg: "#FFFFFF",
      title: "Instagram",
    };
  if (c === "facebook" || c === "fb")
    return { Icon: IconBrandFacebook, bg: "var(--channel-facebook)", fg: "#FFFFFF", title: "Facebook" };
  if (c === "meta" || c === "messenger")
    return { Icon: IconBrandMessenger, bg: "var(--channel-messenger)", fg: "#FFFFFF", title: "Messenger" };
  if (c === "telegram" || c === "tg")
    return { Icon: IconBrandTelegram, bg: "var(--channel-telegram)", fg: "#FFFFFF", title: "Telegram" };
  if (c === "email" || c === "mail")
    return { Icon: IconMail, bg: "var(--channel-email)", fg: "#FFFFFF", title: "E-mail" };
  if (c === "webchat" || c === "form" || c === "site" || c === "landing")
    return { Icon: IconForms, bg: "var(--channel-webchat)", fg: "#FFFFFF", title: "Formulário" };
  return null;
}


export function ConversationCard({
  conversation,
  onClick,
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
        "relative cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3.5 py-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all duration-200",
        "hover:bg-[var(--glass-bg-base)]",
        // Card selecionado: acento lateral esquerdo + border/shadow do brand + fundo brand suave
        // (deixa evidente com qual conversa o operador esta trabalhando).
        conversation.active &&
          "border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_10%,var(--glass-bg-base))] shadow-[0_8px_24px_rgba(91,111,245,0.28)] ring-1 ring-[var(--brand-primary)]/30 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-[var(--brand-primary)]",
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
            <TooltipGlass label={ch.title} side="top">
              <span
                aria-label={ch.title}
                className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white shadow-sm"
                style={{ background: ch.bg, color: ch.fg }}
              >
                <ch.Icon size={10} stroke={2.5} />
              </span>
            </TooltipGlass>
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
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              {conversation.time}
              {conversation.urgent && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
                  <IconClock size={8} stroke={3} />
                </span>
              )}
            </span>
          </div>

          {/* Preview — 1 linha, fonte menor itálica (estilo kanban).
              Texto => ícone de conversa com borda azul; mídia => ícone
              do tipo + label padronizado (sem itálico). */}
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] italic leading-[1.4] text-[var(--text-muted)]">
            {isOutgoing && (
              <IconCheck
                size={12}
                className="shrink-0 not-italic text-[var(--color-success)]"
                aria-label="Você"
              />
            )}
            {TypeIcon ? (
              <TypeIcon size={13} className="shrink-0 text-[var(--brand-primary)]" />
            ) : (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[rgba(91,111,245,0.40)] text-[var(--brand-primary)]">
                <IconMessage size={9} />
              </span>
            )}
            <span
              className={cn(
                "line-clamp-1 flex-1 overflow-hidden",
                typeLabel && "font-medium not-italic text-[var(--text-secondary)]",
              )}
            >
              {typeLabel ?? conversation.preview}
            </span>
          </div>
        </div>
      </div>

      {/* Tags de contato — max 2 visíveis, +N para overflow */}
      {conversation.tags && conversation.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {conversation.tags.slice(0, 2).map((t) => {
            const hex = (t.color ?? "#6366f1").replace("#", "");
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const valid = ![r, g, b].some(Number.isNaN);
            const bg = valid ? `rgba(${r},${g},${b},0.14)` : "rgba(91,111,245,0.14)";
            const fg = valid
              ? `rgb(${Math.max(0, r - 25)},${Math.max(0, g - 25)},${Math.max(0, b - 25)})`
              : "var(--brand-primary)";
            const border = valid ? `rgba(${r},${g},${b},0.28)` : "rgba(91,111,245,0.25)";
            return (
              <span
                key={t.id}
                className="inline-flex max-w-[90px] truncate rounded-full border px-2 py-px font-display text-[10px] font-semibold"
                style={{ background: bg, color: fg, borderColor: border }}
                title={t.name}
              >
                {t.name}
              </span>
            );
          })}
          {conversation.tags.length > 2 && (
            <TooltipGlass
              label={conversation.tags.slice(2).map((t) => t.name).join(", ")}
              side="top"
            >
              <span className="inline-flex shrink-0 rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-px font-display text-[10px] font-bold text-[var(--text-secondary)]">
                +{conversation.tags.length - 2}
              </span>
            </TooltipGlass>
          )}
        </div>
      )}

      {/* Linha 3: assignee + sessao — flex-nowrap evita quebrar em 2 linhas
          quando o nome do responsavel + chip de sessao somam mais largura
          do que a coluna. O chip do assignee trunca com ellipsis. */}
      <div className="mt-2.5 flex min-w-0 flex-nowrap items-center gap-2">
        {/* Quando há responsável: exibe label "RESPONSÁVEL" + chip/slot.
            Sem responsável: apenas chip ghost "+Responsável". */}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {(conversation.assignee || conversation.assigneeId) && (
            <span className="shrink-0 font-display text-[9.5px] font-bold text-[var(--text-muted)]">
              Responsável
            </span>
          )}
          {assigneeSlot ??
            (conversation.assignee ? (
              <Chip variant="brand" className="max-w-full truncate whitespace-nowrap">
                {conversation.assignee}
              </Chip>
            ) : (
              <Chip variant="ghost" className="max-w-full truncate whitespace-nowrap">
                +Responsável
              </Chip>
            ))}
        </span>

        {conversation.sessionExpiresIn && (
          <TooltipGlass
            label={conversation.sessionExpired ? "Sessão de 24h da Meta expirada" : "Tempo até expirar a sessão de 24h"}
            side="top"
          >
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-px font-display text-[10px] font-bold",
                conversation.sessionExpired
                  ? "border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.10] text-[var(--color-danger-text)]"
                  : "border-[var(--color-lead)]/25 bg-[var(--color-lead-bg)] text-[var(--color-warning-text)]",
              )}
            >
              <IconClock size={10} />
              {conversation.sessionExpiresIn}
            </span>
          </TooltipGlass>
        )}
      </div>
    </article>
  )
}
