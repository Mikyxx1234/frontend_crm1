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

  /** Primeira tag do contato — exibida ao lado do nome. */
  tag?: string | null
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

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const TypeIcon =
    conversation.lastMessageType && conversation.lastMessageType !== "text"
      ? typeIconMap[conversation.lastMessageType]
      : null
  const typeLabel =
    conversation.lastMessageType && conversation.lastMessageType !== "text"
      ? typeLabelMap[conversation.lastMessageType]
      : null
  const isOutgoing = conversation.lastMessageDirection === "out"

  return (
    <article
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-3 backdrop-blur-md shadow-[var(--glass-shadow-sm)] transition-all duration-200",
        "hover:bg-white/75",
        conversation.active &&
          "border-[var(--brand-primary)]/40 bg-white/85 shadow-[0_6px_20px_rgba(91,111,245,0.18)]",
        conversation.inactive && "opacity-70",
      )}
    >
      {/* Linha 1: avatar + nome (+ tag) + tempo */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white font-display text-sm font-bold text-white"
            style={{ background: avatarGradients[conversation.avatarColor] }}
          >
            {conversation.initials}
          </div>
          {conversation.status !== "none" && (
            <span
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
                conversation.status === "online"
                  ? "bg-[var(--color-online)]"
                  : "bg-[var(--color-offline)]",
              )}
            />
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
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span>{conversation.time}</span>
          {conversation.urgent && (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
              <IconClock size={8} stroke={3} />
            </span>
          )}
        </div>
      </div>

      {/* Linha 2: preview (com icone de tipo) */}
      <p className="mb-2 ml-[60px] mt-1 flex items-center gap-1.5 truncate text-[12.5px] text-[var(--text-muted)]">
        {isOutgoing && (
          <IconCheck
            size={12}
            className="shrink-0 text-[var(--color-success)]"
            aria-label="Você"
          />
        )}
        {TypeIcon && (
          <TypeIcon size={12} className="shrink-0 text-[var(--brand-primary)]" />
        )}
        <span className="truncate">
          {typeLabel && !conversation.preview ? typeLabel : conversation.preview}
        </span>
      </p>

      {/* Linha 3: assignee + sessao */}
      <div className="ml-[60px] flex items-center justify-between gap-2">
        {conversation.assignee ? (
          <Chip variant="brand">{conversation.assignee}</Chip>
        ) : (
          <Chip variant="ghost">+Responsável</Chip>
        )}

        {conversation.sessionExpiresIn && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[1px] font-display text-[10px] font-bold",
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
